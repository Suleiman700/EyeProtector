import { BrowserWindow, screen, globalShortcut } from 'electron'
import { join } from 'path'

/** How strong the blur+tint backdrop reads (0..1). ~half-transparent per design. */
const FROST_OPACITY = 0.55

/** Blue tint rendered inside the frost window (its window opacity halves this). */
const FROST_HTML =
  'data:text/html;charset=utf-8,' +
  encodeURIComponent(
    '<html><body style="margin:0;height:100vh;pointer-events:none;' +
      'background:linear-gradient(165deg,rgba(30,64,175,.55) 0%,rgba(29,78,216,.45) 45%,rgba(15,118,110,.40) 100%)">' +
      '</body></html>'
  )

/**
 * Blink reminder built from two stacked windows:
 *  - frost: native vibrancy blur + blue tint, faded to ~50% so the screen
 *    behind stays visible
 *  - face: the blinking mascot renderer, fully opaque so it stays crisp
 * Both fade in/out together and never take focus. They swallow mouse input
 * while visible so the user genuinely pauses; ESC dismisses early.
 */
export interface BlinkRecord {
  /** Actual time the blink overlay was up, clamped to its planned duration. */
  restedMs: number
  completed: boolean
}

export class BlinkOverlay {
  private frostWin: BrowserWindow | null = null
  private faceWin: BrowserWindow | null = null
  private safety: NodeJS.Timeout | null = null
  private fadeTimers = new Set<NodeJS.Timeout>()
  private closing = false

  /** Set by the main process to feed completed/skipped blinks into Insights. */
  onRecord: ((r: BlinkRecord) => void) | null = null
  private session: { shownAt: number; plannedMs: number; record: boolean } | null = null

  isVisible(): boolean {
    return this.frostWin !== null || this.faceWin !== null
  }

  show(durationMs = 4000, opts: { record?: boolean } = {}): void {
    if (this.frostWin || this.faceWin) this.destroy()
    this.session = { shownAt: Date.now(), plannedMs: durationMs, record: opts.record ?? false }
    const { bounds } = screen.getPrimaryDisplay()

    const common = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      opacity: 0
    } as const

    const frost = new BrowserWindow({
      ...common,
      ...(process.platform === 'darwin' ? { vibrancy: 'fullscreen-ui' as const } : {})
    })
    this.prepare(frost)
    frost.loadURL(FROST_HTML)
    // Only clear the ref if it still points at *this* window. `close()` is
    // async, so a replaced window's late 'closed' event must not null out the
    // ref to the pair that took its place (which would let the next show()
    // stack a new overlay on top instead of replacing).
    frost.on('closed', () => {
      if (this.frostWin === frost) this.frostWin = null
    })

    // Created second so it stacks above the frost at the same window level.
    const face = new BrowserWindow({
      ...common,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    this.prepare(face)
    if (process.env['ELECTRON_RENDERER_URL']) {
      face.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/blink/index.html`)
    } else {
      face.loadFile(join(__dirname, '../renderer/blink/index.html'))
    }
    face.on('closed', () => {
      if (this.faceWin === face) this.faceWin = null
    })

    frost.showInactive()
    face.showInactive()
    this.frostWin = frost
    this.faceWin = face

    this.fade(frost, FROST_OPACITY, 320)
    this.fade(face, 1, 320)

    // The overlay never takes focus, so the renderer can't hear the keyboard.
    // A global ESC shortcut, held only while the overlay is visible, is the
    // one way to offer press-ESC-to-dismiss.
    this.closing = false
    globalShortcut.register('Escape', () => this.close('skipped'))

    if (this.safety) clearTimeout(this.safety)
    this.safety = setTimeout(() => this.close('completed'), durationMs + 2000)
  }

  /**
   * Fade both layers out, then close them. `reason` distinguishes a natural
   * end (renderer's blinkDone / safety fallback) from an early ESC dismissal,
   * which is what Insights records as completed vs. skipped.
   */
  close(reason: 'completed' | 'skipped' = 'completed'): void {
    if (this.closing) return
    if (!this.frostWin && !this.faceWin) return
    this.closing = true
    this.recordSession(reason)
    if (this.safety) {
      clearTimeout(this.safety)
      this.safety = null
    }
    if (this.frostWin) this.fade(this.frostWin, 0, 280)
    if (this.faceWin) this.fade(this.faceWin, 0, 280, () => this.destroy())
    else this.destroy()
  }

  /** Emit the finished session to Insights exactly once, then clear it. */
  private recordSession(reason: 'completed' | 'skipped'): void {
    const session = this.session
    this.session = null
    if (!session || !session.record) return
    const completed = reason === 'completed'
    const restedMs = completed
      ? session.plannedMs
      : Math.min(session.plannedMs, Math.max(0, Date.now() - session.shownAt))
    this.onRecord?.({ restedMs, completed })
  }

  private prepare(win: BrowserWindow): void {
    win.setAlwaysOnTop(true, 'screen-saver')
    // The overlay blocks clicks while visible: a blink pause means actually
    // pausing, so clicks must not reach the apps behind it. The window stays
    // non-focusable — ESC-to-dismiss is the global shortcut.
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  private destroy(): void {
    globalShortcut.unregister('Escape')
    for (const t of this.fadeTimers) clearInterval(t)
    this.fadeTimers.clear()
    if (this.safety) {
      clearTimeout(this.safety)
      this.safety = null
    }
    for (const win of [this.faceWin, this.frostWin]) {
      if (win && !win.isDestroyed()) win.close()
    }
    this.faceWin = null
    this.frostWin = null
    this.closing = false
  }

  private fade(win: BrowserWindow, target: number, ms: number, onDone?: () => void): void {
    const stepMs = 16
    const steps = Math.max(1, Math.round(ms / stepMs))
    const from = win.getOpacity()
    let i = 0
    const timer = setInterval(() => {
      if (win.isDestroyed()) {
        clearInterval(timer)
        this.fadeTimers.delete(timer)
        return
      }
      i++
      win.setOpacity(from + ((target - from) * i) / steps)
      if (i >= steps) {
        clearInterval(timer)
        this.fadeTimers.delete(timer)
        onDone?.()
      }
    }, stepMs)
    this.fadeTimers.add(timer)
  }
}

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
 * Blink reminder built from stacked window pairs (frost + mascot face), one
 * pair per display so every monitor is covered. Both layers fade in/out
 * together and never take focus; they swallow mouse input while visible. ESC
 * dismisses early (a single global shortcut). Only the primary display's face
 * window (`?primary=1`) plays the chime and fires blinkDone.
 */
export interface BlinkRecord {
  /** Actual time the blink overlay was up, clamped to its planned duration. */
  restedMs: number
  completed: boolean
}

export class BlinkOverlay {
  private frostWins: BrowserWindow[] = []
  private faceWins: BrowserWindow[] = []
  private safety: NodeJS.Timeout | null = null
  private fadeTimers = new Set<NodeJS.Timeout>()
  private closing = false
  private escRegistered = false

  /** Set by the main process to feed completed/skipped blinks into Insights. */
  onRecord: ((r: BlinkRecord) => void) | null = null
  private session: { shownAt: number; plannedMs: number; record: boolean } | null = null

  isVisible(): boolean {
    return this.frostWins.length > 0 || this.faceWins.length > 0
  }

  show(durationMs = 4000, opts: { record?: boolean } = {}): void {
    if (this.isVisible()) this.destroy()
    this.session = { shownAt: Date.now(), plannedMs: durationMs, record: opts.record ?? false }
    this.closing = false
    const primaryId = screen.getPrimaryDisplay().id

    for (const display of screen.getAllDisplays()) {
      const { bounds } = display
      const isPrimary = display.id === primaryId

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
      frost.on('closed', () => {
        this.frostWins = this.frostWins.filter((w) => w !== frost)
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
      const search = isPrimary ? 'primary=1' : ''
      if (process.env['ELECTRON_RENDERER_URL']) {
        face.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/blink/index.html?${search}`)
      } else {
        face.loadFile(join(__dirname, '../renderer/blink/index.html'), { search })
      }
      face.on('closed', () => {
        this.faceWins = this.faceWins.filter((w) => w !== face)
      })

      frost.showInactive()
      face.showInactive()
      this.frostWins.push(frost)
      this.faceWins.push(face)

      this.fade(frost, FROST_OPACITY, 320)
      this.fade(face, 1, 320)
    }

    // The overlays never take focus, so a single global ESC shortcut, held only
    // while visible, offers press-ESC-to-dismiss across all displays.
    globalShortcut.register('Escape', () => this.close('skipped'))
    this.escRegistered = true

    if (this.safety) clearTimeout(this.safety)
    this.safety = setTimeout(() => this.close('completed'), durationMs + 2000)
  }

  /**
   * Fade every layer out, then close them. `reason` distinguishes a natural end
   * (renderer's blinkDone / safety fallback) from an early ESC dismissal, which
   * Insights records as completed vs. skipped.
   */
  close(reason: 'completed' | 'skipped' = 'completed'): void {
    if (this.closing) return
    if (!this.isVisible()) return
    this.closing = true
    this.recordSession(reason)
    if (this.safety) {
      clearTimeout(this.safety)
      this.safety = null
    }
    for (const win of [...this.frostWins, ...this.faceWins]) this.fade(win, 0, 280)
    setTimeout(() => this.destroy(), 300)
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
    if (this.escRegistered) {
      globalShortcut.unregister('Escape')
      this.escRegistered = false
    }
    for (const t of this.fadeTimers) clearInterval(t)
    this.fadeTimers.clear()
    if (this.safety) {
      clearTimeout(this.safety)
      this.safety = null
    }
    for (const win of [...this.faceWins, ...this.frostWins]) {
      if (!win.isDestroyed()) win.close()
    }
    this.faceWins = []
    this.frostWins = []
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

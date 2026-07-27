import { BrowserWindow, screen, globalShortcut } from 'electron'
import { join } from 'path'

/** How strong the blur+tint backdrop reads (0..1). ~half-transparent per design. */
const FROST_OPACITY = 0.55

/** Blue tint rendered inside the frost window (its window opacity halves this). */
const FROST_HTML =
  'data:text/html;charset=utf-8,' +
  encodeURIComponent(
    '<html><body style="margin:0;height:100vh;' +
      'background:linear-gradient(165deg,rgba(30,64,175,.55) 0%,rgba(29,78,216,.45) 45%,rgba(15,118,110,.40) 100%)">' +
      '</body></html>'
  )

/**
 * Non-blocking blink reminder built from two stacked click-through windows:
 *  - frost: native vibrancy blur + blue tint, faded to ~50% so the screen
 *    behind stays visible
 *  - face: the blinking mascot renderer, fully opaque so it stays crisp
 * Both fade in/out together and never take focus.
 */
export class BlinkOverlay {
  private frostWin: BrowserWindow | null = null
  private faceWin: BrowserWindow | null = null
  private safety: NodeJS.Timeout | null = null
  private fadeTimers = new Set<NodeJS.Timeout>()
  private closing = false

  show(durationMs = 4000): void {
    if (this.frostWin || this.faceWin) this.destroy()
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
    globalShortcut.register('Escape', () => this.close())

    if (this.safety) clearTimeout(this.safety)
    this.safety = setTimeout(() => this.close(), durationMs + 2000)
  }

  /** Fade both layers out, then close them. */
  close(): void {
    if (this.closing) return
    if (!this.frostWin && !this.faceWin) return
    this.closing = true
    if (this.safety) {
      clearTimeout(this.safety)
      this.safety = null
    }
    if (this.frostWin) this.fade(this.frostWin, 0, 280)
    if (this.faceWin) this.fade(this.faceWin, 0, 280, () => this.destroy())
    else this.destroy()
  }

  private prepare(win: BrowserWindow): void {
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setIgnoreMouseEvents(true, { forward: true })
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

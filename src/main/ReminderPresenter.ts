import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, type ReminderAction, type ReminderPayload } from '../shared/ipc'

const BANNER_W = 380
const BANNER_H = 96
const BANNER_MARGIN = 24

/**
 * Renders a wellness reminder as either a bottom-right banner (non-blocking,
 * auto-dismiss) or a full-screen overlay (screen-saver level, ESC-to-skip), on
 * every display. Records the outcome once via onRecord. Auto-end and ESC live
 * here in the main process, so they fire once regardless of window count.
 */
export class ReminderPresenter {
  private wins: BrowserWindow[] = []
  private current: ReminderPayload | null = null
  private timer: NodeJS.Timeout | null = null
  private escRegistered = false
  private closing = false
  private session: { shownAt: number; plannedMs: number; mode: string; record: boolean } | null =
    null

  onRecord: ((e: { restedMs: number; completed: boolean }) => void) | null = null

  getCurrent(): ReminderPayload | null {
    return this.current
  }

  isVisible(): boolean {
    return this.wins.length > 0
  }

  show(payload: ReminderPayload, opts: { record?: boolean } = {}): void {
    if (this.wins.length) this.destroy()
    this.current = payload
    this.closing = false
    this.session = {
      shownAt: Date.now(),
      plannedMs: payload.durationSec * 1000,
      mode: payload.mode,
      record: opts.record ?? false
    }

    const isBanner = payload.mode === 'banner'
    for (const display of screen.getAllDisplays()) {
      const area = display.workArea
      const bounds = display.bounds
      const win = new BrowserWindow({
        x: isBanner ? area.x + area.width - BANNER_W - BANNER_MARGIN : bounds.x,
        y: isBanner ? area.y + area.height - BANNER_H - BANNER_MARGIN : bounds.y,
        width: isBanner ? BANNER_W : bounds.width,
        height: isBanner ? BANNER_H : bounds.height,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        hasShadow: false,
        resizable: false,
        movable: false,
        skipTaskbar: true,
        focusable: false,
        alwaysOnTop: true,
        show: false,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: false
        }
      })
      win.setAlwaysOnTop(true, 'screen-saver')
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      win.on('closed', () => {
        this.wins = this.wins.filter((w) => w !== win)
      })
      const load = process.env['ELECTRON_RENDERER_URL']
        ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/reminder/index.html`)
        : win.loadFile(join(__dirname, '../renderer/reminder/index.html'))
      load.then(() => win.webContents.send(IPC.reminderShow, payload))
      win.showInactive()
      this.wins.push(win)
    }

    // Overlay is dismissible with ESC (a single global shortcut — the windows
    // never take focus, same technique as breaks/blink).
    if (!isBanner) {
      globalShortcut.register('Escape', () => this.handleAction('skip'))
      this.escRegistered = true
    }

    // Auto-end: overlay auto-completes (you rested); banner auto-dismisses as
    // skipped (an ignored nudge).
    const ms = payload.durationSec * 1000
    this.timer = setTimeout(() => this.close(isBanner ? 'skipped' : 'completed'), ms)
  }

  handleAction(action: ReminderAction): void {
    this.close(action === 'complete' ? 'completed' : 'skipped')
  }

  private close(reason: 'completed' | 'skipped'): void {
    if (this.closing || !this.wins.length) return
    this.closing = true
    this.recordSession(reason)
    this.destroy()
  }

  private recordSession(reason: 'completed' | 'skipped'): void {
    const s = this.session
    this.session = null
    if (!s || !s.record) return
    const completed = reason === 'completed'
    // Banners aren't measured rest; overlays record actual on-screen time.
    const restedMs =
      s.mode === 'overlay'
        ? completed
          ? s.plannedMs
          : Math.min(s.plannedMs, Math.max(0, Date.now() - s.shownAt))
        : 0
    this.onRecord?.({ restedMs, completed })
  }

  private destroy(): void {
    if (this.escRegistered) {
      globalShortcut.unregister('Escape')
      this.escRegistered = false
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    for (const win of this.wins) {
      if (!win.isDestroyed()) win.close()
    }
    this.wins = []
    this.current = null
    this.closing = false
  }
}

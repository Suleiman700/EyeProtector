import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, type ReminderAction, type ReminderPayload } from '../shared/ipc'

const BANNER_W = 380
const BANNER_H = 96
const BANNER_MARGIN = 24

/**
 * Renders a wellness reminder as either a bottom-right banner (non-blocking,
 * auto-dismiss) or a full-screen overlay (screen-saver level, ESC-to-skip),
 * mirroring OverlayManager/BlinkOverlay. Records the outcome once via onRecord.
 */
export class ReminderPresenter {
  private win: BrowserWindow | null = null
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
    return this.win !== null
  }

  show(payload: ReminderPayload, opts: { record?: boolean } = {}): void {
    if (this.win) this.destroy()
    this.current = payload
    this.closing = false
    this.session = {
      shownAt: Date.now(),
      plannedMs: payload.durationSec * 1000,
      mode: payload.mode,
      record: opts.record ?? false
    }

    const primary = screen.getPrimaryDisplay()
    const isBanner = payload.mode === 'banner'
    const area = primary.workArea

    const win = new BrowserWindow({
      x: isBanner ? area.x + area.width - BANNER_W - BANNER_MARGIN : primary.bounds.x,
      y: isBanner ? area.y + area.height - BANNER_H - BANNER_MARGIN : primary.bounds.y,
      width: isBanner ? BANNER_W : primary.bounds.width,
      height: isBanner ? BANNER_H : primary.bounds.height,
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
      if (this.win === win) this.win = null
    })

    const load = process.env['ELECTRON_RENDERER_URL']
      ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/reminder/index.html`)
      : win.loadFile(join(__dirname, '../renderer/reminder/index.html'))
    load.then(() => win.webContents.send(IPC.reminderShow, payload))
    win.showInactive()
    this.win = win

    // Overlay is dismissible with ESC (a global shortcut, since the window
    // never takes focus — same technique as breaks/blink).
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
    if (this.closing || !this.win) return
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
    if (this.win && !this.win.isDestroyed()) this.win.close()
    this.win = null
    this.current = null
    this.closing = false
  }
}

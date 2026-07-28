import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, type BreakPayload } from '../shared/ipc'

export class OverlayManager {
  private win: BrowserWindow | null = null
  private currentPayload: BreakPayload | null = null
  private escRegistered = false

  /** Invoked when the user presses ESC during a non-strict break. */
  onEscape: (() => void) | null = null

  getCurrentPayload(): BreakPayload | null {
    return this.currentPayload
  }

  show(payload: BreakPayload): void {
    if (this.win) this.close()
    this.currentPayload = payload
    const { bounds } = screen.getPrimaryDisplay()
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      fullscreen: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      backgroundColor: '#0b1220',
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
      this.win = null
      this.currentPayload = null
      this.unregisterEsc()
    })
    const load = process.env['ELECTRON_RENDERER_URL']
      ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/break/index.html`)
      : win.loadFile(join(__dirname, '../renderer/break/index.html'))
    load.then(() => win.webContents.send(IPC.breakStart, payload))
    win.focus()
    // The fullscreen screen-saver-level window doesn't reliably take keyboard
    // focus on macOS, so ESC-to-skip is a global shortcut held while a
    // non-strict break is visible (same approach as BlinkOverlay).
    if (!payload.strict) {
      globalShortcut.register('Escape', () => this.onEscape?.())
      this.escRegistered = true
    }
    this.win = win
  }

  close(): void {
    this.unregisterEsc()
    this.win?.close()
    this.win = null
  }

  private unregisterEsc(): void {
    if (!this.escRegistered) return
    globalShortcut.unregister('Escape')
    this.escRegistered = false
  }
}

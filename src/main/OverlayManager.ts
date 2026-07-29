import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, type BreakPayload } from '../shared/ipc'

export class OverlayManager {
  private wins: BrowserWindow[] = []
  private currentPayload: BreakPayload | null = null
  private escRegistered = false

  /** Invoked when the user presses ESC during a non-strict break. */
  onEscape: (() => void) | null = null

  getCurrentPayload(): BreakPayload | null {
    return this.currentPayload
  }

  show(payload: BreakPayload): void {
    if (this.wins.length) this.close()
    this.currentPayload = payload
    const primaryId = screen.getPrimaryDisplay().id

    for (const display of screen.getAllDisplays()) {
      const { bounds } = display
      const isPrimary = display.id === primaryId
      const win = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        frame: false,
        // Not `fullscreen: true`: macOS's fullscreen space transition emits a
        // synthetic Escape that would instantly trigger ESC-to-skip. A plain
        // display-bounds window at screen-saver level covers the whole screen
        // and appears instantly.
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        // Show without activating: otherwise the break window steals focus from
        // whatever the user was typing in, and macOS never hands it back when the
        // break ends.
        show: false,
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
        this.wins = this.wins.filter((w) => w !== win)
      })
      // Only the primary window drives the countdown completion + chime, so N
      // displays don't fire N completes / N chimes.
      const winPayload: BreakPayload = { ...payload, primary: isPrimary }
      const load = process.env['ELECTRON_RENDERER_URL']
        ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/break/index.html`)
        : win.loadFile(join(__dirname, '../renderer/break/index.html'))
      load.then(() => win.webContents.send(IPC.breakStart, winPayload))
      win.showInactive()
      this.wins.push(win)
    }

    // ESC-to-skip is a single global shortcut (windows never take focus), held
    // while a non-strict break is visible.
    if (!payload.strict) {
      globalShortcut.register('Escape', () => this.onEscape?.())
      this.escRegistered = true
    }
  }

  close(): void {
    this.unregisterEsc()
    for (const win of this.wins) {
      if (!win.isDestroyed()) win.close()
    }
    this.wins = []
    this.currentPayload = null
  }

  private unregisterEsc(): void {
    if (!this.escRegistered) return
    globalShortcut.unregister('Escape')
    this.escRegistered = false
  }
}

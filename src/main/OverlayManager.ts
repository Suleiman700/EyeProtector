import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, BREAK_EXTEND_MS, type BreakPayload } from '../shared/ipc'

export class OverlayManager {
  private wins: BrowserWindow[] = []
  private currentPayload: BreakPayload | null = null
  private shortcuts: string[] = []

  /** Invoked when the user skips a non-strict break (ESC or X). */
  onEscape: (() => void) | null = null
  /** Invoked when the user postpones a non-strict break (P). */
  onPostpone: (() => void) | null = null

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

    // The windows never take focus, so break keys are global shortcuts held
    // only while the break is visible. Skip/postpone are for non-strict breaks;
    // add-time works even on strict breaks (more rest is always allowed).
    const register = (accel: string, fn: () => void): void => {
      if (globalShortcut.register(accel, fn)) this.shortcuts.push(accel)
    }
    if (!payload.strict) {
      register('Escape', () => this.onEscape?.())
      register('X', () => this.onEscape?.())
      register('P', () => this.onPostpone?.())
    }
    const extend = (): void => this.extend(BREAK_EXTEND_MS)
    register('Up', extend)
    register('Plus', extend)
    register('numadd', extend)
  }

  /** Broadcast an add-time increment to every break window's countdown. */
  private extend(ms: number): void {
    for (const win of this.wins) {
      if (!win.isDestroyed()) win.webContents.send(IPC.breakExtend, ms)
    }
  }

  close(): void {
    this.unregisterShortcuts()
    for (const win of this.wins) {
      if (!win.isDestroyed()) win.close()
    }
    this.wins = []
    this.currentPayload = null
  }

  private unregisterShortcuts(): void {
    for (const accel of this.shortcuts) globalShortcut.unregister(accel)
    this.shortcuts = []
  }
}

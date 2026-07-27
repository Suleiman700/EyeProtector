import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SettingsStore } from './SettingsStore'
import { OverlayManager } from './OverlayManager'
import { BreakController } from './BreakController'
import { BlinkOverlay } from './BlinkOverlay'
import { BlinkController } from './BlinkController'
import { TrayController } from './TrayController'
import { IPC, type BreakAction, type StatusPayload } from '../shared/ipc'
import type { AppSettings } from '../shared/settings'

let prefsWin: BrowserWindow | null = null
let tray: TrayController

function openPreferences(): void {
  if (prefsWin) {
    prefsWin.show()
    prefsWin.focus()
    return
  }
  prefsWin = new BrowserWindow({
    width: 720,
    height: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  prefsWin.on('ready-to-show', () => prefsWin?.show())
  prefsWin.on('closed', () => {
    prefsWin = null
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    prefsWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/preferences/index.html`)
  } else {
    prefsWin.loadFile(join(__dirname, '../renderer/preferences/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide() // tray-only app

  const settings = new SettingsStore()
  const overlay = new OverlayManager()
  const blinkOverlay = new BlinkOverlay()

  const broadcastStatus = (s: StatusPayload): void => {
    tray?.setCountdown(s.msUntilNext)
    if (prefsWin && !prefsWin.isDestroyed()) prefsWin.webContents.send(IPC.status, s)
  }

  const controller = new BreakController(settings, overlay, broadcastStatus)
  const blinkController = new BlinkController(settings, blinkOverlay)

  tray = new TrayController({
    openPreferences,
    takeBreakNow: () => controller.takeBreakNow(),
    quit: () => app.quit()
  })

  ipcMain.handle(IPC.getSettings, () => settings.get())
  ipcMain.handle(IPC.setSettings, (_e, patch: Partial<AppSettings>) => settings.set(patch))
  ipcMain.handle(IPC.getBreak, () => overlay.getCurrentPayload())
  ipcMain.on(IPC.breakAction, (_e, action: BreakAction) => controller.handleAction(action))
  ipcMain.on(IPC.takeBreakNow, () => controller.takeBreakNow())
  ipcMain.on(IPC.takeBlinkNow, () => blinkController.triggerNow())
  ipcMain.on(IPC.blinkDone, () => blinkOverlay.close())

  controller.start()
  blinkController.start()
  openPreferences()
})

app.on('window-all-closed', () => {
  // Tray app stays alive when windows close; quit only via the tray menu.
})

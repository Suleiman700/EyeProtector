import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SettingsStore } from './SettingsStore'
import { StatsStore } from './StatsStore'
import { OverlayManager } from './OverlayManager'
import { BreakController } from './BreakController'
import { BlinkOverlay } from './BlinkOverlay'
import { BlinkController } from './BlinkController'
import { ReminderPresenter } from './ReminderPresenter'
import { ReminderController } from './ReminderController'
import { TrayController } from './TrayController'
import { IPC, type BreakAction, type ReminderAction, type StatusPayload } from '../shared/ipc'
import type { AppSettings } from '../shared/settings'
import type { StatsData } from '../shared/stats'

let prefsWin: BrowserWindow | null = null
let tray: TrayController

function openPreferences(): void {
  if (prefsWin) {
    prefsWin.show()
    prefsWin.focus()
    return
  }
  prefsWin = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 900,
    minHeight: 640,
    titleBarStyle: 'hiddenInset',
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
  const stats = new StatsStore()
  const applyAutostart = (s: AppSettings): void => {
    app.setLoginItemSettings({ openAtLogin: s.autostart })
  }
  applyAutostart(settings.get())
  settings.onChange(applyAutostart)
  const overlay = new OverlayManager()
  const blinkOverlay = new BlinkOverlay()
  blinkOverlay.onRecord = (r) => stats.record({ category: 'blink', ...r })

  const reminderPresenter = new ReminderPresenter()
  reminderPresenter.onRecord = (r) => stats.record({ category: 'wellness', ...r })

  // One busy predicate shared by blink + reminders so overlays never stack.
  const isScreenBusy = (): boolean =>
    overlay.getCurrentPayload() !== null ||
    blinkOverlay.isVisible() ||
    reminderPresenter.isVisible()

  const broadcastStatus = (s: StatusPayload): void => {
    tray?.setCountdown(s.msUntilNext)
    if (prefsWin && !prefsWin.isDestroyed()) prefsWin.webContents.send(IPC.status, s)
  }
  stats.onChange((s: StatsData) => {
    if (prefsWin && !prefsWin.isDestroyed()) prefsWin.webContents.send(IPC.statsUpdate, s)
  })

  const controller = new BreakController(settings, overlay, broadcastStatus, stats)
  overlay.onEscape = () => controller.handleAction('skip')
  const blinkController = new BlinkController(settings, blinkOverlay, isScreenBusy)
  const reminderController = new ReminderController(settings, reminderPresenter, isScreenBusy)

  tray = new TrayController({
    openPreferences,
    takeBreakNow: () => controller.takeBreakNow(),
    quit: () => app.quit()
  })

  ipcMain.handle(IPC.getSettings, () => settings.get())
  ipcMain.handle(IPC.setSettings, (_e, patch: Partial<AppSettings>) => settings.set(patch))
  ipcMain.handle(IPC.getBreak, () => overlay.getCurrentPayload())
  ipcMain.on(IPC.breakAction, (_e, action: BreakAction) => controller.handleAction(action))
  ipcMain.on(IPC.takeBreakNow, (_e, type?: 'short' | 'long') => controller.takeBreakNow(type))
  ipcMain.on(IPC.takeBlinkNow, () => blinkController.triggerNow())
  ipcMain.on(IPC.blinkDone, () => blinkOverlay.close('completed'))
  ipcMain.handle(IPC.getStats, () => stats.getAll())
  ipcMain.handle(IPC.resetStats, () => stats.reset())
  ipcMain.handle(IPC.getReminder, () => reminderPresenter.getCurrent())
  ipcMain.on(IPC.reminderAction, (_e, action: ReminderAction) =>
    reminderPresenter.handleAction(action)
  )
  ipcMain.on(IPC.takeReminderNow, (_e, id: string) => reminderController.triggerNow(id))
  ipcMain.handle(IPC.getAppInfo, () => ({ version: app.getVersion() }))
  ipcMain.on(IPC.quitApp, () => app.quit())

  controller.start()
  blinkController.start()
  reminderController.start()
  openPreferences()
})

app.on('window-all-closed', () => {
  // Tray app stays alive when windows close; quit only via the tray menu.
})

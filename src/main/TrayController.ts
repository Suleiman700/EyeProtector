import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

interface TrayHandlers {
  openPreferences(): void
  takeBreakNow(): void
  quit(): void
}

export class TrayController {
  private tray: Tray

  constructor(private handlers: TrayHandlers) {
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
    icon.setTemplateImage(true)
    this.tray = new Tray(icon)
    this.tray.setToolTip('EyeProtector')
    this.render(null)
  }

  setCountdown(msUntilNext: number): void {
    if (msUntilNext < 0) {
      this.render(null) // no break type enabled — hide the countdown row
      return
    }
    const totalSec = Math.max(0, Math.round(msUntilNext / 1000))
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    this.render(`${mm}:${ss}`)
  }

  private render(countdown: string | null): void {
    const menu = Menu.buildFromTemplate([
      ...(countdown !== null
        ? ([
            { label: `Next break in ${countdown}`, enabled: false },
            { type: 'separator' }
          ] as Electron.MenuItemConstructorOptions[])
        : []),
      { label: 'Take a break now', click: () => this.handlers.takeBreakNow() },
      { label: 'Preferences…', click: () => this.handlers.openPreferences() },
      { type: 'separator' },
      { label: 'Quit EyeProtector', click: () => this.handlers.quit() }
    ])
    this.tray.setContextMenu(menu)
  }
}

import { Tray, Menu, nativeImage, type NativeImage } from 'electron'
import { join } from 'path'

interface TrayHandlers {
  openPreferences(): void
  takeBreakNow(): void
  setEnabled(enabled: boolean): void
  quit(): void
}

export class TrayController {
  private tray: Tray
  private iconEnabled: NativeImage
  private iconDisabled: NativeImage
  private enabled = true
  private countdown: string | null = null

  constructor(private handlers: TrayHandlers) {
    this.iconEnabled = nativeImage.createFromPath(
      join(__dirname, '../../resources/trayTemplate.png')
    )
    this.iconEnabled.setTemplateImage(true)
    this.iconDisabled = this.buildDisabledIcon()
    this.tray = new Tray(this.iconEnabled)
    this.tray.setToolTip('EyeProtector')
    this.render()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.tray.setImage(enabled ? this.iconEnabled : this.iconDisabled)
    if (!enabled) this.countdown = null
    this.render()
  }

  setCountdown(msUntilNext: number): void {
    if (!this.enabled || msUntilNext < 0) {
      this.countdown = null
    } else {
      const totalSec = Math.max(0, Math.round(msUntilNext / 1000))
      const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
      const ss = String(totalSec % 60).padStart(2, '0')
      this.countdown = `${mm}:${ss}`
    }
    this.render()
  }

  /**
   * Build the disabled variant at runtime: load the template glyph and draw an
   * opaque diagonal slash across it (black + alpha only, so it stays a valid
   * macOS template image). Avoids shipping a second asset or adding an image
   * dependency.
   */
  private buildDisabledIcon(): NativeImage {
    const base = nativeImage.createFromPath(
      join(__dirname, '../../resources/trayTemplate@2x.png')
    )
    const { width, height } = base.getSize()
    const buf = Buffer.from(base.toBitmap()) // BGRA
    const thickness = Math.max(2, Math.round(width / 12))
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.abs(x - y) <= thickness) {
          const i = (y * width + x) * 4
          buf[i] = 0
          buf[i + 1] = 0
          buf[i + 2] = 0
          buf[i + 3] = 255
        }
      }
    }
    const img = nativeImage.createFromBitmap(buf, { width, height, scaleFactor: 2 })
    img.setTemplateImage(true)
    return img
  }

  private render(): void {
    const items: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Enable EyeProtector',
        type: 'checkbox',
        checked: this.enabled,
        click: () => this.handlers.setEnabled(!this.enabled)
      },
      { type: 'separator' }
    ]
    if (this.enabled) {
      if (this.countdown !== null) {
        items.push({ label: `Next break in ${this.countdown}`, enabled: false })
        items.push({ type: 'separator' })
      }
      items.push({ label: 'Take a break now', click: () => this.handlers.takeBreakNow() })
    }
    items.push({ label: 'Preferences…', click: () => this.handlers.openPreferences() })
    items.push({ type: 'separator' })
    items.push({ label: 'Quit EyeProtector', click: () => this.handlers.quit() })
    this.tray.setContextMenu(Menu.buildFromTemplate(items))
  }
}

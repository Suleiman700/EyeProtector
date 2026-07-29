import { powerMonitor } from 'electron'
import type { SettingsStore } from './SettingsStore'

const NORMAL_TICK_MS = 1000
const SAVER_TICK_MS = 4000

/**
 * Battery-saver coordinator. When the `batterySaver` setting is on AND the
 * machine is on battery power, "reduce activity" is active: the schedulers'
 * poll interval is slowed and the launch update check is skipped. Uses
 * Electron `powerMonitor` (available only after app ready).
 */
export class PowerController {
  private active = false

  /** Called with the tick interval to apply whenever the saver state flips. */
  onChange: ((tickMs: number) => void) | null = null

  constructor(private settings: SettingsStore) {
    powerMonitor.on('on-battery', () => this.recompute())
    powerMonitor.on('on-ac', () => this.recompute())
    settings.onChange(() => this.recompute())
    this.active = this.compute()
  }

  private compute(): boolean {
    return this.settings.get().batterySaver && powerMonitor.isOnBatteryPower()
  }

  private recompute(): void {
    const next = this.compute()
    if (next === this.active) return
    this.active = next
    this.onChange?.(this.tickMs())
  }

  /** True when activity should be reduced right now. */
  isActive(): boolean {
    return this.active
  }

  /** The poll interval to use given the current saver state. */
  tickMs(): number {
    return this.active ? SAVER_TICK_MS : NORMAL_TICK_MS
  }
}

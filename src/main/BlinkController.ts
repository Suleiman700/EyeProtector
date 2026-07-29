import type { SettingsStore } from './SettingsStore'
import type { BlinkOverlay } from './BlinkOverlay'

/**
 * Independent timer that fires the blink reminder on its own interval,
 * separate from the 20-20-20 break schedule.
 */
export class BlinkController {
  private nextAt = 0
  private ticker: NodeJS.Timeout | null = null

  constructor(
    private settings: SettingsStore,
    private overlay: BlinkOverlay,
    // Blinks are suppressed while a break overlay is up: stacking the frost
    // over the break screen would hide it, and both overlays share the
    // global ESC shortcut.
    private isBreakActive: () => boolean = () => false
  ) {
    this.settings.onChange(() => this.reschedule(Date.now()))
  }

  start(): void {
    this.reschedule(Date.now())
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  private reschedule(now: number): void {
    const { blink } = this.settings.get()
    this.nextAt = now + blink.intervalMin * 60_000
  }

  private tick(): void {
    const { blink } = this.settings.get()
    if (!blink.enabled) return
    if (this.isBreakActive()) return
    const now = Date.now()
    if (now >= this.nextAt) {
      // Scheduled blink — counts toward Insights.
      this.overlay.show(blink.durationSec * 1000, { record: true })
      this.nextAt = now + blink.intervalMin * 60_000
    }
  }

  /** Preview / "blink now" trigger — manual, excluded from Insights. */
  triggerNow(): void {
    if (this.isBreakActive()) return
    const { blink } = this.settings.get()
    this.overlay.show(blink.durationSec * 1000, { record: false })
    this.reschedule(Date.now())
  }
}

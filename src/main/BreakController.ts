import { SchedulerEngine } from '../shared/scheduler'
import { toSchedulerConfig } from '../shared/settings'
import type { SettingsStore } from './SettingsStore'
import type { OverlayManager } from './OverlayManager'
import type { BreakAction, BreakPayload, StatusPayload } from '../shared/ipc'

export class BreakController {
  private engine: SchedulerEngine
  private ticker: NodeJS.Timeout | null = null

  constructor(
    private settings: SettingsStore,
    private overlay: OverlayManager,
    private broadcastStatus: (s: StatusPayload) => void
  ) {
    this.engine = new SchedulerEngine(toSchedulerConfig(settings.get()))
    settings.onChange((s) => this.engine.updateConfig(toSchedulerConfig(s), Date.now()))
  }

  start(): void {
    this.engine.start(Date.now())
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  private tick(): void {
    const now = Date.now()
    if (this.engine.getStatus() === 'running' && this.engine.isDue(now)) {
      this.beginBreak(now)
    }
    this.broadcastStatus({
      status: this.engine.getStatus(),
      msUntilNext: this.engine.msUntilNext(now)
    })
  }

  private beginBreak(now: number): void {
    const { type } = this.engine.beginBreak(now)
    const s = this.settings.get()
    const payload: BreakPayload = {
      type,
      durationMs: type === 'short' ? s.short.durationSec * 1000 : s.long.durationSec * 1000,
      strict: type === 'short' ? s.short.strict : s.long.strict,
      theme: s.theme
    }
    this.overlay.show(payload)
  }

  takeBreakNow(): void {
    const now = Date.now()
    this.engine.postpone(0, now) // make the next break due immediately
    this.beginBreak(now)
  }

  handleAction(action: BreakAction): void {
    const now = Date.now()
    if (action === 'complete') this.engine.completeBreak(now)
    else if (action === 'skip') this.engine.skip(now)
    else if (action === 'postpone') this.engine.postpone(5 * 60_000, now)
    this.overlay.close()
  }
}

import { SchedulerEngine } from '../shared/scheduler'
import { toSchedulerConfig } from '../shared/settings'
import type { SettingsStore } from './SettingsStore'
import type { OverlayManager } from './OverlayManager'
import type { StatsStore } from './StatsStore'
import type { BreakType } from '../shared/scheduler'
import type { BreakAction, BreakPayload, StatusPayload } from '../shared/ipc'

/** The break currently on screen, tracked so we can measure actual rest time. */
interface ActiveBreak {
  type: BreakType
  plannedMs: number
  startedAt: number
  /** Only scheduled breaks feed Insights; manual "take now" does not. */
  record: boolean
}

export class BreakController {
  private engine: SchedulerEngine
  private ticker: NodeJS.Timeout | null = null
  private active: ActiveBreak | null = null

  constructor(
    private settings: SettingsStore,
    private overlay: OverlayManager,
    private broadcastStatus: (s: StatusPayload) => void,
    private stats: StatsStore
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
      this.beginBreak(now, undefined, true)
    }
    this.broadcastStatus({
      status: this.engine.getStatus(),
      msUntilNext: this.engine.msUntilNext(now)
    })
  }

  private beginBreak(now: number, forceType: BreakType | undefined, record: boolean): void {
    const { type } = this.engine.beginBreak(now, forceType)
    const s = this.settings.get()
    const durationMs = type === 'short' ? s.short.durationSec * 1000 : s.long.durationSec * 1000
    const payload: BreakPayload = {
      type,
      durationMs,
      strict: type === 'short' ? s.short.strict : s.long.strict,
      theme: s.theme,
      // Canonical value; OverlayManager overrides per display window so only the
      // primary display drives completion. A late getBreak() fallback defaults
      // to primary=true so completion is never lost.
      primary: true
    }
    this.active = { type, plannedMs: durationMs, startedAt: now, record }
    this.overlay.show(payload)
  }

  takeBreakNow(type?: BreakType): void {
    const now = Date.now()
    this.beginBreak(now, type ?? this.engine.getNextBreak()?.type ?? 'short', false)
  }

  handleAction(action: BreakAction): void {
    const now = Date.now()
    if (action === 'complete') this.engine.completeBreak(now)
    else if (action === 'skip') this.engine.skip(now)
    else if (action === 'postpone') this.engine.postpone(5 * 60_000, now)
    this.recordActive(action, now)
    this.overlay.close()
  }

  /** Feed the finished scheduled break into Insights, then clear it. */
  private recordActive(action: BreakAction, now: number): void {
    const active = this.active
    this.active = null
    if (!active || !active.record) return
    const completed = action === 'complete'
    const restedMs = completed
      ? active.plannedMs
      : Math.min(active.plannedMs, Math.max(0, now - active.startedAt))
    this.stats.record({ category: active.type, restedMs, completed })
  }
}

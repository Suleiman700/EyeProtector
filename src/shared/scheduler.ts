export interface SchedulerConfig {
  shortIntervalMs: number
  shortDurationMs: number
  longIntervalMs: number
  longDurationMs: number
  /** Default true when omitted. */
  shortEnabled?: boolean
  longEnabled?: boolean
}

export type BreakType = 'short' | 'long'
export type SchedulerStatus = 'idle' | 'running' | 'paused' | 'breaking'

export interface NextBreak {
  type: BreakType
  dueAt: number
}

/**
 * Pure break-timing state machine. No Electron/Node imports so it is fully
 * unit-testable. All "now" values are epoch-ms passed in by the caller, which
 * keeps behaviour deterministic (no internal clock).
 */
export class SchedulerEngine {
  private config: SchedulerConfig
  private status: SchedulerStatus = 'idle'
  private nextShortAt = 0
  private nextLongAt = 0
  private currentBreak: { type: BreakType; endsAt: number } | null = null
  private pausedRemaining: { short: number; long: number } | null = null

  constructor(config: SchedulerConfig) {
    this.config = config
  }

  getStatus(): SchedulerStatus {
    return this.status
  }

  start(now: number): void {
    this.status = 'running'
    this.nextShortAt = now + this.config.shortIntervalMs
    this.nextLongAt = now + this.config.longIntervalMs
    this.currentBreak = null
    this.pausedRemaining = null
  }

  getNextBreak(): NextBreak | null {
    const shortOn = this.config.shortEnabled !== false
    const longOn = this.config.longEnabled !== false
    if (!shortOn && !longOn) return null
    if (!shortOn) return { type: 'long', dueAt: this.nextLongAt }
    if (!longOn) return { type: 'short', dueAt: this.nextShortAt }
    // Tie or long-sooner → long takes precedence (it's the more important break).
    if (this.nextLongAt <= this.nextShortAt) {
      return { type: 'long', dueAt: this.nextLongAt }
    }
    return { type: 'short', dueAt: this.nextShortAt }
  }

  /** -1 when no break type is enabled. */
  msUntilNext(now: number): number {
    const next = this.getNextBreak()
    if (!next) return -1
    return Math.max(0, next.dueAt - now)
  }

  isDue(now: number): boolean {
    const next = this.getNextBreak()
    return this.status === 'running' && next !== null && now >= next.dueAt
  }

  beginBreak(now: number, forceType?: BreakType): { type: BreakType; endsAt: number } {
    const type = forceType ?? this.getNextBreak()?.type ?? 'short'
    const duration = type === 'short' ? this.config.shortDurationMs : this.config.longDurationMs
    this.status = 'breaking'
    this.currentBreak = { type, endsAt: now + duration }
    return this.currentBreak
  }

  completeBreak(now: number): void {
    const type = this.currentBreak?.type ?? this.getNextBreak()?.type ?? 'short'
    // A short break resets the short timer; a long break resets both
    // (you've already rested your eyes, so don't fire a short immediately).
    this.nextShortAt = now + this.config.shortIntervalMs
    if (type === 'long') {
      this.nextLongAt = now + this.config.longIntervalMs
    }
    this.status = 'running'
    this.currentBreak = null
  }

  skip(now: number): void {
    const type = this.currentBreak?.type ?? this.getNextBreak()?.type
    if (type === 'short') this.nextShortAt = now + this.config.shortIntervalMs
    else if (type === 'long') this.nextLongAt = now + this.config.longIntervalMs
    this.status = 'running'
    this.currentBreak = null
  }

  postpone(ms: number, now: number): void {
    const type = this.currentBreak?.type ?? this.getNextBreak()?.type
    if (type === 'short') this.nextShortAt = now + ms
    else if (type === 'long') this.nextLongAt = now + ms
    this.status = 'running'
    this.currentBreak = null
  }

  pause(now: number): void {
    if (this.status === 'paused') return
    this.pausedRemaining = {
      short: Math.max(0, this.nextShortAt - now),
      long: Math.max(0, this.nextLongAt - now)
    }
    this.status = 'paused'
  }

  resume(now: number): void {
    if (this.status !== 'paused' || !this.pausedRemaining) return
    this.nextShortAt = now + this.pausedRemaining.short
    this.nextLongAt = now + this.pausedRemaining.long
    this.pausedRemaining = null
    this.status = 'running'
  }

  reset(now: number): void {
    this.start(now)
  }

  updateConfig(config: SchedulerConfig, now: number): void {
    const wasRunning = this.status === 'running'
    this.config = config
    if (wasRunning) this.start(now)
  }
}

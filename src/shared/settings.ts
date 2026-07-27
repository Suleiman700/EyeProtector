import type { SchedulerConfig } from './scheduler'

export interface BreakSettings {
  intervalMin: number
  durationSec: number
  strict: boolean
}

export interface BlinkSettings {
  enabled: boolean
  intervalMin: number
  durationSec: number
}

export const BLINK_DURATION_OPTIONS = [2, 4, 6, 8, 10, 15] // seconds

export interface AppSettings {
  schemaVersion: number
  short: BreakSettings
  long: BreakSettings
  blink: BlinkSettings
  preBreakWarningSec: number
  sound: { enabled: boolean; volume: number }
  autostart: boolean
  theme: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  short: { intervalMin: 20, durationSec: 20, strict: false },
  long: { intervalMin: 60, durationSec: 300, strict: false },
  blink: { enabled: true, intervalMin: 5, durationSec: 4 },
  preBreakWarningSec: 10,
  sound: { enabled: true, volume: 0.6 },
  autostart: false,
  theme: 'calm'
}

export function toSchedulerConfig(s: AppSettings): SchedulerConfig {
  return {
    shortIntervalMs: s.short.intervalMin * 60_000,
    shortDurationMs: s.short.durationSec * 1000,
    longIntervalMs: s.long.intervalMin * 60_000,
    longDurationMs: s.long.durationSec * 1000
  }
}

import type { SchedulerConfig } from './scheduler'
import { defaultReminders, type Reminder } from './reminders'

export interface BreakSettings {
  enabled: boolean
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
  enabled: boolean
  schemaVersion: number
  short: BreakSettings
  long: BreakSettings
  blink: BlinkSettings
  reminders: Reminder[]
  preBreakWarningSec: number
  sound: { enabled: boolean; volume: number }
  autostart: boolean
  /** Reduce activity (slower timers, skip update check) while on battery. */
  batterySaver: boolean
  theme: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  schemaVersion: 1,
  short: { enabled: true, intervalMin: 20, durationSec: 20, strict: false },
  long: { enabled: true, intervalMin: 60, durationSec: 300, strict: false },
  blink: { enabled: true, intervalMin: 5, durationSec: 4 },
  reminders: defaultReminders(),
  preBreakWarningSec: 10,
  sound: { enabled: true, volume: 0.6 },
  autostart: false,
  batterySaver: true,
  theme: 'calm'
}

export function toSchedulerConfig(s: AppSettings): SchedulerConfig {
  return {
    shortIntervalMs: s.short.intervalMin * 60_000,
    shortDurationMs: s.short.durationSec * 1000,
    longIntervalMs: s.long.intervalMin * 60_000,
    longDurationMs: s.long.durationSec * 1000,
    shortEnabled: s.short.enabled,
    longEnabled: s.long.enabled
  }
}

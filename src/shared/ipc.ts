import type { BreakType } from './scheduler'
import type { ReminderPresentation } from './reminders'

export const IPC = {
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  breakStart: 'break:start',
  breakAction: 'break:action',
  breakExtend: 'break:extend',
  takeBreakNow: 'break:take-now',
  getBreak: 'break:get',
  blinkDone: 'blink:done',
  takeBlinkNow: 'blink:take-now',
  status: 'status:update',
  getStats: 'stats:get',
  resetStats: 'stats:reset',
  statsUpdate: 'stats:update',
  reminderShow: 'reminder:show',
  reminderAction: 'reminder:action',
  takeReminderNow: 'reminder:take-now',
  getReminder: 'reminder:get',
  checkUpdate: 'update:check',
  getUpdate: 'update:get',
  updateAvailable: 'update:changed',
  openUpdatePage: 'update:open',
  getAppInfo: 'app:get-info',
  quitApp: 'app:quit'
} as const

export interface AppInfo {
  version: string
}

export interface BreakPayload {
  type: BreakType
  durationMs: number
  strict: boolean
  theme: string
  /** True only for the primary display's window, which drives chime + completion. */
  primary: boolean
}

export type BreakAction = 'complete' | 'skip' | 'postpone'

/** Per-press add-time increment and the cap on total extra time for a break. */
export const BREAK_EXTEND_MS = 60_000
export const BREAK_EXTEND_CAP_MS = 600_000

/** msUntilNext is -1 when no break type is enabled. */

export interface StatusPayload {
  status: string
  msUntilNext: number
}

export type ReminderMode = ReminderPresentation

export interface ReminderPayload {
  id: string
  title: string
  message: string
  mode: ReminderMode
  durationSec: number
}

export type ReminderAction = 'complete' | 'skip'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error'

export interface UpdateInfo {
  status: UpdateStatus
  version?: string
  notes?: string
  url?: string
}

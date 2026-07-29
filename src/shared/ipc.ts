import type { BreakType } from './scheduler'
import type { ReminderPresentation } from './reminders'

export const IPC = {
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  breakStart: 'break:start',
  breakAction: 'break:action',
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
}

export type BreakAction = 'complete' | 'skip' | 'postpone'

/** msUntilNext is -1 when no break type is enabled. */

export interface StatusPayload {
  status: string
  msUntilNext: number
}

export type ReminderMode = ReminderPresentation

export interface ReminderPayload {
  id: string
  emoji: string
  title: string
  message: string
  mode: ReminderMode
  durationSec: number
}

export type ReminderAction = 'complete' | 'skip'

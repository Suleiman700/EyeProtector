import type { BreakType } from './scheduler'

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

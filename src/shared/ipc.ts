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
  status: 'status:update'
} as const

export interface BreakPayload {
  type: BreakType
  durationMs: number
  strict: boolean
  theme: string
}

export type BreakAction = 'complete' | 'skip' | 'postpone'

export interface StatusPayload {
  status: string
  msUntilNext: number
}

import { describe, it, expect } from 'vitest'
import {
  defaultReminders,
  makeCustomReminder,
  validateReminder,
  dueReminders,
  type Reminder
} from './reminders'

const base = (over: Partial<Reminder> = {}): Reminder =>
  validateReminder({
    id: 'r1',
    emoji: '💧',
    title: 'Drink',
    message: 'Sip water',
    intervalMin: 30,
    presentation: 'banner',
    durationSec: 8,
    enabled: true,
    preset: false,
    ...over
  })

describe('defaultReminders', () => {
  it('ships three presets with stable ids', () => {
    const r = defaultReminders()
    expect(r.map((x) => x.id)).toEqual(['hydration', 'posture', 'standup'])
    expect(r.every((x) => x.preset)).toBe(true)
  })
})

describe('validateReminder', () => {
  it('clamps interval to 1..240', () => {
    expect(base({ intervalMin: 0 }).intervalMin).toBe(1)
    expect(base({ intervalMin: 999 }).intervalMin).toBe(240)
  })
  it('clamps banner duration to 3..30 and overlay to 10..600', () => {
    expect(base({ presentation: 'banner', durationSec: 1 }).durationSec).toBe(3)
    expect(base({ presentation: 'banner', durationSec: 99 }).durationSec).toBe(30)
    expect(base({ presentation: 'overlay', durationSec: 1 }).durationSec).toBe(10)
    expect(base({ presentation: 'overlay', durationSec: 9999 }).durationSec).toBe(600)
  })
  it('trims text and falls back to a default title when empty', () => {
    expect(base({ title: '  ' }).title).toBe('Reminder')
    expect(base({ message: '  hi  ' }).message).toBe('hi')
  })
})

describe('makeCustomReminder', () => {
  it('creates a non-preset reminder with an id not already taken', () => {
    const r = makeCustomReminder(['custom-1'])
    expect(r.preset).toBe(false)
    expect(r.id).not.toBe('custom-1')
    expect(r.enabled).toBe(true)
  })
})

describe('dueReminders', () => {
  const rs = [base({ id: 'a' }), base({ id: 'b' }), base({ id: 'c', enabled: false })]
  it('returns enabled ids whose nextAt has passed', () => {
    const now = 1000
    const nextAt = { a: 500, b: 2000, c: 500 }
    expect(dueReminders(rs, nextAt, now)).toEqual(['a'])
  })
  it('treats a missing nextAt as not due', () => {
    expect(dueReminders(rs, {}, 1000)).toEqual([])
  })
  it('returns several ids when several are due', () => {
    expect(dueReminders(rs, { a: 100, b: 100, c: 100 }, 1000)).toEqual(['a', 'b'])
  })
})

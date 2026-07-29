import { describe, it, expect } from 'vitest'
import {
  emptyStats,
  emptyCategory,
  normalizeDay,
  recordEvent,
  aggregateRange,
  last7Days,
  localDay,
  shownCount,
  totalRestedMs,
  totalSkipped,
  MAX_DAYS,
  type StatsData
} from './stats'

// Fixed local-time reference points (constructed via Date so they respect the
// test runner's local zone, matching how localDay buckets are keyed).
const noon = (y: number, m: number, d: number): number =>
  new Date(y, m - 1, d, 12, 0, 0).getTime()

describe('stats model', () => {
  it('records a completed short break into total and today', () => {
    const now = noon(2026, 7, 28)
    const data = recordEvent(emptyStats(), { category: 'short', restedMs: 20_000, completed: true }, now)
    expect(data.total.short).toEqual({ completed: 1, skipped: 0, restedMs: 20_000 })
    expect(data.days[localDay(now)].short).toEqual({ completed: 1, skipped: 0, restedMs: 20_000 })
    expect(data.total.long.completed).toBe(0)
  })

  it('counts a skip separately and still sums the partial rested time', () => {
    const now = noon(2026, 7, 28)
    let data = recordEvent(emptyStats(), { category: 'blink', restedMs: 1500, completed: false }, now)
    data = recordEvent(data, { category: 'blink', restedMs: 4000, completed: true }, now)
    expect(data.total.blink).toEqual({ completed: 1, skipped: 1, restedMs: 5500 })
    expect(shownCount(data.total.blink)).toBe(2)
  })

  it('does not mutate the input StatsData', () => {
    const base = emptyStats()
    recordEvent(base, { category: 'short', restedMs: 20_000, completed: true }, noon(2026, 7, 28))
    expect(base.total.short.completed).toBe(0)
    expect(Object.keys(base.days)).toHaveLength(0)
  })

  it('clamps nothing itself but stores non-negative rested only', () => {
    const data = recordEvent(emptyStats(), { category: 'long', restedMs: -5, completed: false }, noon(2026, 7, 28))
    expect(data.total.long.restedMs).toBe(0)
  })

  it('buckets two different days independently while total accumulates', () => {
    let data = recordEvent(emptyStats(), { category: 'short', restedMs: 20_000, completed: true }, noon(2026, 7, 27))
    data = recordEvent(data, { category: 'short', restedMs: 20_000, completed: true }, noon(2026, 7, 28))
    expect(data.total.short.completed).toBe(2)
    expect(data.days['2026-07-27'].short.completed).toBe(1)
    expect(data.days['2026-07-28'].short.completed).toBe(1)
  })

  it('prunes to the newest MAX_DAYS buckets', () => {
    let data: StatsData = emptyStats()
    for (let i = 0; i < MAX_DAYS + 5; i++) {
      data = recordEvent(data, { category: 'short', restedMs: 1000, completed: true }, noon(2026, 1, 1) + i * 86_400_000)
    }
    const keys = Object.keys(data.days).sort()
    expect(keys).toHaveLength(MAX_DAYS)
    // Oldest 5 dropped; total is unaffected by pruning.
    expect(data.total.short.completed).toBe(MAX_DAYS + 5)
  })

  it('aggregateRange sums the requested day keys and ignores missing ones', () => {
    let data = recordEvent(emptyStats(), { category: 'short', restedMs: 20_000, completed: true }, noon(2026, 7, 27))
    data = recordEvent(data, { category: 'long', restedMs: 300_000, completed: true }, noon(2026, 7, 28))
    const range = aggregateRange(data, ['2026-07-27', '2026-07-28', '2026-07-29'])
    expect(range.short.completed).toBe(1)
    expect(range.long.completed).toBe(1)
    expect(totalRestedMs(range)).toBe(320_000)
  })

  it('last7Days returns 7 ordered keys ending today', () => {
    const days = last7Days(noon(2026, 7, 28))
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-07-28')
    expect(days[0]).toBe('2026-07-22')
    // strictly increasing
    expect([...days].sort()).toEqual(days)
  })
})

describe('wellness category', () => {
  it('recordEvent tallies wellness into total and today', () => {
    const now = noon(2026, 7, 29)
    const next = recordEvent(emptyStats(), { category: 'wellness', restedMs: 0, completed: true }, now)
    expect(next.total.wellness.completed).toBe(1)
    expect(next.days['2026-07-29'].wellness.completed).toBe(1)
  })

  it('totalSkipped includes wellness', () => {
    const now = noon(2026, 7, 29)
    const next = recordEvent(emptyStats(), { category: 'wellness', restedMs: 0, completed: false }, now)
    expect(totalSkipped(next.total)).toBe(1)
  })

  it('normalizeDay backfills a missing wellness field', () => {
    const legacy = { short: emptyCategory(), long: emptyCategory(), blink: emptyCategory() }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixed = normalizeDay(legacy as any)
    expect(fixed.wellness).toEqual({ completed: 0, skipped: 0, restedMs: 0 })
  })
})

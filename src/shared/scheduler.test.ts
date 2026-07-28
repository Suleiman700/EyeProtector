import { describe, it, expect } from 'vitest'
import { SchedulerEngine, type SchedulerConfig } from './scheduler'

const config: SchedulerConfig = {
  shortIntervalMs: 20 * 60_000, // 20 min
  shortDurationMs: 20_000, // 20 s
  longIntervalMs: 60 * 60_000, // 60 min
  longDurationMs: 5 * 60_000 // 5 min
}

describe('SchedulerEngine', () => {
  it('starts idle then running', () => {
    const e = new SchedulerEngine(config)
    expect(e.getStatus()).toBe('idle')
    e.start(0)
    expect(e.getStatus()).toBe('running')
  })

  it('schedules the short break as the next break', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: config.shortIntervalMs })
    expect(e.msUntilNext(0)).toBe(config.shortIntervalMs)
  })

  it('is not due before the interval and due after', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    expect(e.isDue(config.shortIntervalMs - 1)).toBe(false)
    expect(e.isDue(config.shortIntervalMs)).toBe(true)
  })

  it('beginBreak returns the correct type and end time', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    expect(e.beginBreak(now)).toEqual({ type: 'short', endsAt: now + config.shortDurationMs })
    expect(e.getStatus()).toBe('breaking')
  })

  it('completing a short break reschedules the next short and returns to running', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.beginBreak(now)
    const end = now + config.shortDurationMs
    e.completeBreak(end)
    expect(e.getStatus()).toBe('running')
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: end + config.shortIntervalMs })
  })

  it('completing a long break resets both timers', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    // push short beyond long so the long break is the next one due
    e.postpone(config.longIntervalMs + 1, config.longIntervalMs)
    const now = config.longIntervalMs
    const nb = e.getNextBreak()
    expect(nb?.type).toBe('long')
    e.beginBreak(now)
    const end = now + config.longDurationMs
    e.completeBreak(end)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: end + config.shortIntervalMs })
  })

  it('skip reschedules without taking a break', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.skip(now)
    expect(e.getStatus()).toBe('running')
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: now + config.shortIntervalMs })
  })

  it('postpone pushes the due break by the given ms', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.postpone(5 * 60_000, now)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: now + 5 * 60_000 })
  })

  it('pause preserves remaining time and resume re-anchors it', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    e.pause(5 * 60_000) // 5 min elapsed, 15 min remaining on short
    expect(e.getStatus()).toBe('paused')
    e.resume(100 * 60_000) // resume much later
    expect(e.getStatus()).toBe('running')
    expect(e.msUntilNext(100 * 60_000)).toBe(15 * 60_000)
  })

  it('reset behaves like a fresh start', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    e.reset(30 * 60_000)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: 30 * 60_000 + config.shortIntervalMs })
  })
})

describe('SchedulerEngine enable flags', () => {
  it('skips a disabled short break and schedules the long one', () => {
    const e = new SchedulerEngine({ ...config, shortEnabled: false })
    e.start(0)
    expect(e.getNextBreak()).toEqual({ type: 'long', dueAt: config.longIntervalMs })
    expect(e.isDue(config.shortIntervalMs)).toBe(false)
    expect(e.isDue(config.longIntervalMs)).toBe(true)
  })

  it('skips a disabled long break and schedules the short one', () => {
    const e = new SchedulerEngine({ ...config, longEnabled: false })
    e.start(0)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: config.shortIntervalMs })
  })

  it('is never due when both break types are disabled', () => {
    const e = new SchedulerEngine({ ...config, shortEnabled: false, longEnabled: false })
    e.start(0)
    expect(e.getNextBreak()).toBeNull()
    expect(e.isDue(Number.MAX_SAFE_INTEGER)).toBe(false)
    expect(e.msUntilNext(0)).toBe(-1)
  })

  it('beginBreak can force a specific type for demos', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const b = e.beginBreak(0, 'long')
    expect(b.type).toBe('long')
    expect(e.getStatus()).toBe('breaking')
  })
})

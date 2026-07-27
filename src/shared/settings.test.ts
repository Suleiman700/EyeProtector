import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, toSchedulerConfig, BLINK_DURATION_OPTIONS } from './settings'

describe('settings', () => {
  it('has sane 20-20-20 defaults', () => {
    expect(DEFAULT_SETTINGS.short.intervalMin).toBe(20)
    expect(DEFAULT_SETTINGS.short.durationSec).toBe(20)
    expect(DEFAULT_SETTINGS.long.intervalMin).toBe(60)
  })

  it('blink has durationSec default of 4', () => {
    expect(DEFAULT_SETTINGS.blink.durationSec).toBe(4)
  })

  it('BLINK_DURATION_OPTIONS includes 4 and 15', () => {
    expect(BLINK_DURATION_OPTIONS).toContain(4)
    expect(BLINK_DURATION_OPTIONS).toContain(15)
  })

  it('converts settings to SchedulerConfig in milliseconds', () => {
    const cfg = toSchedulerConfig(DEFAULT_SETTINGS)
    expect(cfg.shortIntervalMs).toBe(20 * 60_000)
    expect(cfg.shortDurationMs).toBe(20 * 1000)
    expect(cfg.longIntervalMs).toBe(60 * 60_000)
    expect(cfg.longDurationMs).toBe(DEFAULT_SETTINGS.long.durationSec * 1000)
  })
})

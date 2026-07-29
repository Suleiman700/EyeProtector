import { describe, it, expect } from 'vitest'
import { parseVersion, isNewer } from './version'

describe('parseVersion', () => {
  it('strips a leading v and parses three parts', () => {
    expect(parseVersion('v0.2.0')).toEqual({ major: 0, minor: 2, patch: 0 })
    expect(parseVersion('1.4.9')).toEqual({ major: 1, minor: 4, patch: 9 })
  })
  it('defaults missing parts to 0', () => {
    expect(parseVersion('1.2')).toEqual({ major: 1, minor: 2, patch: 0 })
    expect(parseVersion('3')).toEqual({ major: 3, minor: 0, patch: 0 })
  })
  it('returns null for junk', () => {
    expect(parseVersion('')).toBeNull()
    expect(parseVersion('nightly')).toBeNull()
    expect(parseVersion('v1.x')).toBeNull()
  })
})

describe('isNewer', () => {
  it('detects a newer remote', () => {
    expect(isNewer('0.2.0', '0.1.0')).toBe(true)
    expect(isNewer('v1.0.0', '0.9.9')).toBe(true)
    expect(isNewer('1.2.1', '1.2')).toBe(true)
  })
  it('is false for equal or older', () => {
    expect(isNewer('0.1.0', '0.1.0')).toBe(false)
    expect(isNewer('1.2', '1.2.0')).toBe(false)
    expect(isNewer('0.1.0', '0.2.0')).toBe(false)
  })
  it('is false when either side is unparseable', () => {
    expect(isNewer('nightly', '0.1.0')).toBe(false)
    expect(isNewer('0.2.0', 'dev')).toBe(false)
  })
})

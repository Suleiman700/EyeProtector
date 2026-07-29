/**
 * Pure semver comparison for the update checker — no Electron, no network.
 * Compares the installed app version against a GitHub release tag.
 */

export interface Version {
  major: number
  minor: number
  patch: number
}

/** Parse 'v0.2.0' / '0.2' / '1' → Version; missing parts default to 0. Junk → null. */
export function parseVersion(raw: string): Version | null {
  const cleaned = raw.trim().replace(/^v/i, '')
  if (cleaned === '') return null
  const parts = cleaned.split('.')
  const nums = parts.map((p) => Number(p))
  if (!Number.isFinite(nums[0]) || Number.isNaN(nums[0])) return null
  for (const n of nums) {
    if (!Number.isFinite(n) || Number.isNaN(n)) return null
  }
  return {
    major: nums[0] ?? 0,
    minor: nums[1] ?? 0,
    patch: nums[2] ?? 0
  }
}

/**
 * True when `remote` is a strictly newer version than `current`. Fail-safe:
 * if either side can't be parsed, returns false (never nag on garbage).
 */
export function isNewer(remote: string, current: string): boolean {
  const r = parseVersion(remote)
  const c = parseVersion(current)
  if (!r || !c) return false
  if (r.major !== c.major) return r.major > c.major
  if (r.minor !== c.minor) return r.minor > c.minor
  return r.patch > c.patch
}

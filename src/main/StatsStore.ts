import Store from 'electron-store'
import {
  emptyStats,
  normalizeDay,
  recordEvent,
  type DayStat,
  type StatEvent,
  type StatsData
} from '../shared/stats'

/**
 * Persistence wrapper for the eye-care statistics, mirroring SettingsStore:
 * a typed electron-store (its own `stats.json`) plus change notification so
 * the preferences window can live-update. All aggregation lives in the pure
 * `shared/stats` module.
 */
export class StatsStore {
  private store: Store<StatsData>
  private listeners = new Set<(s: StatsData) => void>()

  constructor() {
    this.store = new Store<StatsData>({ name: 'stats', defaults: emptyStats() })
  }

  getAll(): StatsData {
    const stored = this.store.store
    // Merge over an empty base so a file written before a category existed
    // still reads back as a complete, valid StatsData (normalizeDay backfills
    // missing categories on `total` and every day bucket).
    const days: Record<string, DayStat> = {}
    for (const [k, v] of Object.entries(stored.days ?? {})) days[k] = normalizeDay(v)
    return {
      ...emptyStats(),
      ...stored,
      total: normalizeDay(stored.total),
      days
    }
  }

  record(event: StatEvent): void {
    const next = recordEvent(this.getAll(), event, Date.now())
    this.store.store = next
    for (const cb of this.listeners) cb(next)
  }

  reset(): StatsData {
    const next = emptyStats()
    this.store.store = next
    for (const cb of this.listeners) cb(next)
    return next
  }

  onChange(cb: (s: StatsData) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

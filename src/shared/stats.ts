/**
 * Pure statistics model — no Electron, no storage. Owns the shape of the
 * tracked data and every transform over it, so the aggregation math is
 * unit-testable in isolation (see stats.test.ts). The main-process
 * StatsStore is a thin persistence wrapper around these functions.
 */

export type StatCategory = 'short' | 'long' | 'blink' | 'wellness'

export interface CategoryStat {
  /** Sessions that ran to their planned end. */
  completed: number
  /** Sessions dismissed early (ESC / Skip / Postpone). */
  skipped: number
  /** Sum of ACTUAL time spent resting, clamped to the planned duration. */
  restedMs: number
}

export interface DayStat {
  short: CategoryStat
  long: CategoryStat
  blink: CategoryStat
  wellness: CategoryStat
}

export interface StatsData {
  schemaVersion: number
  /** All-time running totals. */
  total: DayStat
  /** Per-day buckets keyed by local 'YYYY-MM-DD', pruned to the newest 30. */
  days: Record<string, DayStat>
}

export interface StatEvent {
  category: StatCategory
  /** Actual time rested, already clamped to the planned duration by the caller. */
  restedMs: number
  completed: boolean
}

export const STATS_SCHEMA_VERSION = 2
export const MAX_DAYS = 30

export function emptyCategory(): CategoryStat {
  return { completed: 0, skipped: 0, restedMs: 0 }
}

export function emptyDay(): DayStat {
  return {
    short: emptyCategory(),
    long: emptyCategory(),
    blink: emptyCategory(),
    wellness: emptyCategory()
  }
}

/** Fill any missing category on a (possibly legacy) day bucket. */
export function normalizeDay(d: Partial<DayStat> | undefined): DayStat {
  const base = emptyDay()
  if (!d) return base
  return {
    short: { ...base.short, ...d.short },
    long: { ...base.long, ...d.long },
    blink: { ...base.blink, ...d.blink },
    wellness: { ...base.wellness, ...d.wellness }
  }
}

export function emptyStats(): StatsData {
  return { schemaVersion: STATS_SCHEMA_VERSION, total: emptyDay(), days: {} }
}

/** Local (not UTC) 'YYYY-MM-DD' for the given epoch ms. */
export function localDay(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Shown = completed + skipped (not stored separately). */
export function shownCount(c: CategoryStat): number {
  return c.completed + c.skipped
}

function applyEvent(c: CategoryStat, event: StatEvent): void {
  if (event.completed) c.completed += 1
  else c.skipped += 1
  c.restedMs += Math.max(0, event.restedMs)
}

/** Keep only the newest `MAX_DAYS` day buckets (lexicographic == chronological). */
function pruneDays(days: Record<string, DayStat>): Record<string, DayStat> {
  const keys = Object.keys(days).sort()
  if (keys.length <= MAX_DAYS) return days
  const keep = keys.slice(keys.length - MAX_DAYS)
  const out: Record<string, DayStat> = {}
  for (const k of keep) out[k] = days[k]
  return out
}

/**
 * Record one session into all-time totals and today's bucket. Pure: returns a
 * new StatsData; the caller persists it.
 */
export function recordEvent(data: StatsData, event: StatEvent, now: number): StatsData {
  const key = localDay(now)
  const days = { ...data.days }
  // Deep-ish copy of the touched day + total so callers can't mutate the input.
  const total = cloneDay(data.total)
  const day = days[key] ? cloneDay(days[key]) : emptyDay()
  applyEvent(total[event.category], event)
  applyEvent(day[event.category], event)
  days[key] = day
  return {
    schemaVersion: STATS_SCHEMA_VERSION,
    total,
    days: pruneDays(days)
  }
}

function cloneCategory(c: CategoryStat): CategoryStat {
  return { completed: c.completed, skipped: c.skipped, restedMs: c.restedMs }
}

function cloneDay(d: DayStat): DayStat {
  return {
    short: cloneCategory(d.short),
    long: cloneCategory(d.long),
    blink: cloneCategory(d.blink),
    wellness: cloneCategory(d.wellness)
  }
}

function addInto(target: CategoryStat, src: CategoryStat): void {
  target.completed += src.completed
  target.skipped += src.skipped
  target.restedMs += src.restedMs
}

/** Sum the given day keys into a single DayStat (missing keys contribute zero). */
export function aggregateRange(data: StatsData, dayKeys: string[]): DayStat {
  const out = emptyDay()
  for (const key of dayKeys) {
    const d = data.days[key]
    if (!d) continue
    addInto(out.short, d.short)
    addInto(out.long, d.long)
    addInto(out.blink, d.blink)
    addInto(out.wellness, d.wellness)
  }
  return out
}

/** The 7 local day keys ending today, oldest → newest. */
export function last7Days(now: number): string[] {
  const out: string[] = []
  const base = new Date(now)
  base.setHours(12, 0, 0, 0) // midday avoids DST edge slips when subtracting days
  for (let i = 6; i >= 0; i--) {
    out.push(localDay(base.getTime() - i * 86_400_000))
  }
  return out
}

/** Total rested ms across all three categories in a DayStat. */
export function totalRestedMs(d: DayStat): number {
  return d.short.restedMs + d.long.restedMs + d.blink.restedMs + d.wellness.restedMs
}

/** Total completed across all categories. */
export function totalCompleted(d: DayStat): number {
  return d.short.completed + d.long.completed + d.blink.completed + d.wellness.completed
}

/** Total skipped across all categories. */
export function totalSkipped(d: DayStat): number {
  return d.short.skipped + d.long.skipped + d.blink.skipped + d.wellness.skipped
}

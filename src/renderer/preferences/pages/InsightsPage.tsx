import { useEffect, useMemo, useState } from 'react'
import { Card, COLORS } from '../components/controls'
import {
  aggregateRange,
  last7Days,
  localDay,
  shownCount,
  totalCompleted,
  totalRestedMs,
  totalSkipped,
  type CategoryStat,
  type DayStat,
  type StatsData,
  type StatCategory
} from '../../../shared/stats'

type Range = 'today' | 'all'

const CATEGORY_META: { id: StatCategory; label: string; color: string }[] = [
  { id: 'short', label: 'Short breaks', color: '#30B0C7' },
  { id: 'long', label: 'Long breaks', color: '#5E5CE6' },
  { id: 'blink', label: 'Blink reminders', color: '#007AFF' },
  { id: 'wellness', label: 'Wellness', color: '#FF375F' }
]

/** ms → "1h 24m" / "12m" / "45s" / "0s". */
function fmtDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const totalMin = Math.round(totalSec / 60)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function completionRate(c: CategoryStat): number {
  const shown = shownCount(c)
  return shown === 0 ? 0 : c.completed / shown
}

export function InsightsPage(): JSX.Element {
  const [data, setData] = useState<StatsData | null>(null)
  const [range, setRange] = useState<Range>('today')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    window.eyeprotector.getStats().then(setData)
    return window.eyeprotector.onStatsUpdate(setData)
  }, [])

  const view: DayStat | null = useMemo(() => {
    if (!data) return null
    return range === 'today' ? aggregateRange(data, [localDay(Date.now())]) : data.total
  }, [data, range])

  const week = useMemo(() => {
    if (!data) return []
    return last7Days(Date.now()).map((key) => {
      const d = data.days[key]
      return { key, restedMs: d ? totalRestedMs(d) : 0 }
    })
  }, [data])

  if (!data || !view) return <div />

  const hasAnyData =
    shownCount(data.total.short) +
      shownCount(data.total.long) +
      shownCount(data.total.blink) +
      shownCount(data.total.wellness) >
    0

  const heroStats = [
    { label: 'Total rest', value: fmtDuration(totalRestedMs(view)), tint: '#34C759' },
    {
      label: 'Breaks completed',
      value: String(view.short.completed + view.long.completed),
      tint: '#30B0C7'
    },
    { label: 'Blinks completed', value: String(view.blink.completed), tint: '#007AFF' },
    { label: 'Skipped', value: String(totalSkipped(view)), tint: '#FF9500' }
  ]

  const handleReset = async (): Promise<void> => {
    const fresh = await window.eyeprotector.resetStats()
    setData(fresh)
    setConfirmReset(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[12px]" style={{ color: COLORS.secondary }}>
        Based on your scheduled reminders. Manual breaks and demos aren&rsquo;t counted.
      </p>

      {/* Range toggle */}
      <div
        className="inline-flex self-start rounded-[9px] p-[2px]"
        style={{ backgroundColor: 'rgba(120,120,128,0.12)' }}
      >
        {(['today', 'all'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="rounded-[7px] px-4 py-[5px] text-[13px] font-medium transition-colors"
            style={{
              backgroundColor: range === r ? COLORS.card : 'transparent',
              color: COLORS.text,
              boxShadow: range === r ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'
            }}
          >
            {r === 'today' ? 'Today' : 'All-time'}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <Card>
          <div className="flex flex-col items-center gap-1 px-6 py-14 text-center">
            <p className="text-[15px] font-semibold" style={{ color: COLORS.text }}>
              No sessions recorded yet
            </p>
            <p className="max-w-[320px] text-[13px]" style={{ color: COLORS.secondary }}>
              Once your scheduled breaks and blink reminders start firing, your rest time and
              completion stats will show up here.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Hero stat cards */}
          <div className="grid grid-cols-4 gap-3">
            {heroStats.map((s) => (
              <Card key={s.label}>
                <div className="flex flex-col gap-1 px-4 py-4">
                  <span className="text-[24px] font-bold tracking-[-0.02em]" style={{ color: s.tint }}>
                    {s.value}
                  </span>
                  <span className="text-[12px]" style={{ color: COLORS.secondary }}>
                    {s.label}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Breakdown */}
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold" style={{ color: COLORS.secondary }}>
              Breakdown
            </p>
            <Card>
              <div className="px-4 py-2">
                <div
                  className="grid items-center py-2 text-[11px] font-medium uppercase tracking-wide"
                  style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.4fr', color: COLORS.secondary }}
                >
                  <span>Type</span>
                  <span className="text-right">Shown</span>
                  <span className="text-right">Done</span>
                  <span className="text-right">Skipped</span>
                  <span className="text-right">Rested</span>
                </div>
                {CATEGORY_META.map((meta, i) => {
                  const c = view[meta.id]
                  const rate = completionRate(c)
                  return (
                    <div
                      key={meta.id}
                      className="grid items-center py-2.5 text-[13px]"
                      style={{
                        gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1.4fr',
                        color: COLORS.text,
                        borderTop: i === 0 ? 'none' : `0.5px solid ${COLORS.hairline}`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{meta.label}</span>
                          <div
                            className="mt-1 h-[3px] w-full max-w-[90px] overflow-hidden rounded-full"
                            style={{ backgroundColor: 'rgba(120,120,128,0.18)' }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.round(rate * 100)}%`, backgroundColor: meta.color }}
                            />
                          </div>
                        </div>
                      </div>
                      <span className="text-right tabular-nums">{shownCount(c)}</span>
                      <span className="text-right tabular-nums">{c.completed}</span>
                      <span className="text-right tabular-nums" style={{ color: COLORS.secondary }}>
                        {c.skipped}
                      </span>
                      <span className="text-right tabular-nums">{fmtDuration(c.restedMs)}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* 7-day trend */}
          <div>
            <p className="mb-2 px-1 text-[13px] font-semibold" style={{ color: COLORS.secondary }}>
              Rest over the last 7 days
            </p>
            <Card>
              <WeekChart week={week} />
            </Card>
          </div>
        </>
      )}

      {/* Reset */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {confirmReset ? (
          <>
            <span className="text-[13px]" style={{ color: COLORS.secondary }}>
              Erase all statistics?
            </span>
            <button
              className="ios-filled-btn rounded-lg px-3.5 py-1.5 text-[13px] font-medium"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.text }}
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
            <button
              className="ios-filled-btn rounded-lg px-3.5 py-1.5 text-[13px] font-medium"
              style={{ backgroundColor: 'rgba(255,59,48,0.12)', color: '#FF3B30' }}
              onClick={handleReset}
            >
              Erase
            </button>
          </>
        ) : (
          <button
            className="ios-filled-btn rounded-lg px-3.5 py-1.5 text-[13px] font-medium"
            style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: '#FF3B30' }}
            onClick={() => setConfirmReset(true)}
            disabled={!hasAnyData}
          >
            Reset statistics
          </button>
        )}
      </div>
    </div>
  )
}

const CHART_BAR_AREA = 108 // px, definite height so bar heights compute reliably

function WeekChart({ week }: { week: { key: string; restedMs: number }[] }): JSX.Element {
  const maxMs = Math.max(1, ...week.map((d) => d.restedMs))
  const weekday = (key: string): string => {
    // key is 'YYYY-MM-DD'; build a local date at midday to read the weekday.
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { weekday: 'short' })[0]
  }
  const todayKey = localDay(Date.now())

  return (
    <div className="flex items-end justify-between gap-2 px-4 pb-3 pt-5">
      {week.map((d) => {
        const isToday = d.key === todayKey
        // Pixel heights against a definite bar area — percentage heights don't
        // resolve reliably through the surrounding flex layout.
        const h = d.restedMs > 0 ? Math.max(4, Math.round((d.restedMs / maxMs) * CHART_BAR_AREA)) : 3
        return (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end justify-center" style={{ height: CHART_BAR_AREA }}>
              <div
                className="w-full max-w-[26px] rounded-[5px]"
                style={{
                  height: h,
                  backgroundColor: isToday ? COLORS.accent : 'rgba(94,92,230,0.55)'
                }}
                title={fmtDuration(d.restedMs)}
              />
            </div>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: isToday ? COLORS.accent : COLORS.secondary, fontWeight: isToday ? 600 : 400 }}
            >
              {weekday(d.key)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

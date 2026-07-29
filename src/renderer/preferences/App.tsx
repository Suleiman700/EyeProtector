import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import { Sidebar, type PageId } from './components/Sidebar'
import { COLORS, SF_FONT, Switch } from './components/controls'
import { GeneralPage } from './pages/GeneralPage'
import { BreaksPage } from './pages/BreaksPage'
import { BlinkPage } from './pages/BlinkPage'
import { RemindersPage } from './pages/RemindersPage'
import { InsightsPage } from './pages/InsightsPage'
import { AboutPage } from './pages/AboutPage'
import type { StatusPayload, UpdateInfo, FocusState } from '../../shared/ipc'

const PAGE_TITLES: Record<PageId, string> = {
  general: 'General',
  breaks: 'Breaks',
  blink: 'Blink Reminders',
  reminders: 'Reminders',
  insights: 'Insights',
  about: 'About'
}

export function App(): JSX.Element {
  const { settings, update } = useSettings()
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [page, setPage] = useState<PageId>('breaks')
  const [upd, setUpd] = useState<UpdateInfo>({ status: 'idle' })
  const [updDismissed, setUpdDismissed] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const [focus, setFocus] = useState<FocusState>({ until: null })

  useEffect(() => window.eyeprotector.onStatus(setStatus), [])
  useEffect(() => {
    window.eyeprotector.getUpdate().then(setUpd)
    return window.eyeprotector.onUpdateChange(setUpd)
  }, [])
  useEffect(() => {
    window.eyeprotector.getFocus().then(setFocus)
    return window.eyeprotector.onFocusChange(setFocus)
  }, [])

  if (!settings)
    return <div className="h-screen" style={{ backgroundColor: COLORS.content }} />

  const mmss = (ms: number): string => {
    const s = Math.max(0, Math.round(ms / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }
  const showCountdown = status !== null && status.msUntilNext >= 0

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: COLORS.content, color: COLORS.text, fontFamily: SF_FONT }}
    >
      <Sidebar active={page} onSelect={setPage} />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-end gap-3 px-8 pt-2">
          {settings.enabled && showCountdown && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.secondary }}
            >
              Next break {mmss(status.msUntilNext)}
            </span>
          )}
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: 'rgba(120,120,128,0.12)' }}
          >
            <span className="text-[12px] font-semibold" style={{ color: COLORS.text }}>
              EyeProtector
            </span>
            <Switch checked={settings.enabled} onChange={(v) => update({ enabled: v })} />
          </div>
        </div>
        <div className="px-8 pb-10">
          {!settings.enabled && (
            <div
              className="mb-5 rounded-lg px-4 py-2.5 text-[13px]"
              style={{ backgroundColor: 'rgba(255,159,10,0.14)', color: '#B25E00' }}
            >
              EyeProtector is paused — nothing will run until you turn it back on.
            </div>
          )}
          {settings.enabled && focus.until !== null && focus.until > Date.now() && (
            <div
              className="mb-5 flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13px]"
              style={{ backgroundColor: 'rgba(94,92,230,0.12)', color: '#3B3AB5' }}
            >
              <span className="flex-1">
                Focus on — reminders are silenced until{' '}
                {new Date(focus.until).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                .
              </span>
              <button
                className="rounded-md px-3 py-1 text-[12px] font-medium"
                style={{ backgroundColor: 'rgba(94,92,230,0.18)', color: '#3B3AB5' }}
                onClick={() => window.eyeprotector.endFocus()}
              >
                End focus
              </button>
            </div>
          )}
          {upd.status === 'available' && !updDismissed && (
            <div
              className="mb-5 rounded-lg px-4 py-3"
              style={{ backgroundColor: 'rgba(0,122,255,0.10)', color: COLORS.text }}
            >
              <div className="flex items-center gap-3">
                <span className="flex-1 text-[13px] font-medium">
                  EyeProtector {upd.version} is available
                </span>
                {upd.notes && (
                  <button
                    className="text-[12px]"
                    style={{ color: COLORS.accent }}
                    onClick={() => setShowNotes((v) => !v)}
                  >
                    {showNotes ? "Hide what's new" : "What's new"}
                  </button>
                )}
                <button
                  className="rounded-md px-3 py-1 text-[12px] font-medium text-white"
                  style={{ backgroundColor: COLORS.accent }}
                  onClick={() => upd.url && window.eyeprotector.openUpdatePage(upd.url)}
                >
                  Download
                </button>
                <button
                  aria-label="Dismiss"
                  className="px-1 text-[13px]"
                  style={{ color: COLORS.secondary }}
                  onClick={() => setUpdDismissed(true)}
                >
                  ✕
                </button>
              </div>
              {showNotes && upd.notes && (
                <pre
                  className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed"
                  style={{ color: COLORS.secondary, fontFamily: SF_FONT }}
                >
                  {upd.notes}
                </pre>
              )}
            </div>
          )}
          <h1 className="mb-6 text-[22px] font-bold tracking-[-0.01em]">{PAGE_TITLES[page]}</h1>
          {page === 'general' && <GeneralPage settings={settings} update={update} />}
          {page === 'breaks' && <BreaksPage settings={settings} update={update} />}
          {page === 'blink' && <BlinkPage settings={settings} update={update} />}
          {page === 'reminders' && <RemindersPage settings={settings} update={update} />}
          {page === 'insights' && <InsightsPage />}
          {page === 'about' && <AboutPage />}
        </div>
      </main>
    </div>
  )
}

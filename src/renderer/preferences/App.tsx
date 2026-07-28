import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import { Sidebar, type PageId } from './components/Sidebar'
import { COLORS, SF_FONT } from './components/controls'
import { GeneralPage } from './pages/GeneralPage'
import { BreaksPage } from './pages/BreaksPage'
import { BlinkPage } from './pages/BlinkPage'
import { AboutPage } from './pages/AboutPage'
import type { StatusPayload } from '../../shared/ipc'

const PAGE_TITLES: Record<PageId, string> = {
  general: 'General',
  breaks: 'Breaks',
  blink: 'Blink Reminders',
  about: 'About'
}

export function App(): JSX.Element {
  const { settings, update } = useSettings()
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [page, setPage] = useState<PageId>('breaks')

  useEffect(() => window.eyeprotector.onStatus(setStatus), [])

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
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-end px-8 pt-2">
          {showCountdown && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.secondary }}
            >
              Next break {mmss(status.msUntilNext)}
            </span>
          )}
        </div>
        <div className="px-8 pb-10">
          <h1 className="mb-6 text-[22px] font-bold tracking-[-0.01em]">{PAGE_TITLES[page]}</h1>
          {page === 'general' && <GeneralPage settings={settings} update={update} />}
          {page === 'breaks' && <BreaksPage settings={settings} update={update} />}
          {page === 'blink' && <BlinkPage settings={settings} update={update} />}
          {page === 'about' && <AboutPage />}
        </div>
      </main>
    </div>
  )
}

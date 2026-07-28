import { COLORS } from './controls'
import type { ReactNode } from 'react'

export type PageId = 'general' | 'breaks' | 'blink' | 'about'

interface Item {
  id: PageId
  label: string
  color: string
  glyph: ReactNode
}

const GLYPH_GEAR = (
  <path
    d="M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5zm5.6 2.5c0-.4-.04-.8-.1-1.18l1.3-1-1.1-1.9-1.54.55a5.6 5.6 0 0 0-2.04-1.18L9.8 1.7H7.6l-.32 1.6c-.76.24-1.45.64-2.04 1.17L3.7 3.92l-1.1 1.9 1.3 1.01a5.7 5.7 0 0 0 0 2.35l-1.3 1 1.1 1.9 1.54-.54c.6.53 1.28.93 2.04 1.17l.32 1.6h2.2l.32-1.6a5.6 5.6 0 0 0 2.04-1.17l1.53.54 1.1-1.9-1.3-1c.07-.39.11-.78.11-1.18z"
    fill="currentColor"
  />
)

const GLYPH_CUP = (
  <path
    d="M4.5 3.5h7a1 1 0 0 1 1 1c0 3.6-1.6 6-3.5 6h-2c-1.9 0-3.5-2.4-3.5-6a1 1 0 0 1 1-1zm7.9 1.2h1.1a1.6 1.6 0 0 1 0 3.2h-1.5M4 12.7h8"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    fill="none"
  />
)

const GLYPH_EYE = (
  <>
    <path
      d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8z"
      stroke="currentColor"
      strokeWidth="1.4"
      fill="none"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
  </>
)

const GLYPH_INFO = (
  <>
    <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
  </>
)

const SECTIONS: { header: string | null; items: Item[] }[] = [
  {
    header: null,
    items: [{ id: 'general', label: 'General', color: '#8E8E93', glyph: GLYPH_GEAR }]
  },
  {
    header: 'Productivity & Care',
    items: [
      { id: 'breaks', label: 'Breaks', color: '#30B0C7', glyph: GLYPH_CUP },
      { id: 'blink', label: 'Blink Reminders', color: '#007AFF', glyph: GLYPH_EYE }
    ]
  },
  {
    header: 'EyeProtector',
    items: [{ id: 'about', label: 'About', color: '#FF9500', glyph: GLYPH_INFO }]
  }
]

export function Sidebar({
  active,
  onSelect
}: {
  active: PageId
  onSelect: (id: PageId) => void
}): JSX.Element {
  return (
    <nav
      className="flex h-full w-[230px] shrink-0 flex-col px-3 pb-4"
      style={{
        backgroundColor: COLORS.sidebar,
        borderRight: `0.5px solid ${COLORS.hairline}`
      }}
    >
      {/* Drag strip under the traffic lights */}
      <div className="titlebar-drag h-12 shrink-0" />
      {SECTIONS.map((section, i) => (
        <div key={i} className="mb-1">
          {section.header && (
            <p
              className="mt-3 mb-1 px-2.5 text-[11px] font-semibold"
              style={{ color: COLORS.secondary }}
            >
              {section.header}
            </p>
          )}
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition-colors"
              style={{
                backgroundColor: active === item.id ? 'rgba(120,120,128,0.16)' : 'transparent',
                color: COLORS.text
              }}
            >
              <span
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-white"
                style={{ backgroundColor: item.color }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  {item.glyph}
                </svg>
              </span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}

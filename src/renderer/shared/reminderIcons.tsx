import type { ReactNode } from 'react'

/**
 * Curated set of app-style SVG glyphs for wellness reminders (no emoji).
 * Each icon is a 16×16 viewBox fragment plus a tint color; rendered inside a
 * colored rounded square like the sidebar glyphs. Reminders store an icon id
 * (`Reminder.icon`); unknown ids fall back to `bell`.
 */

interface IconDef {
  label: string
  color: string
  glyph: ReactNode
}

const ICONS: Record<string, IconDef> = {
  droplet: {
    label: 'Water',
    color: '#0A84FF',
    glyph: <path d="M8 2.4S3.7 7 3.7 9.6a4.3 4.3 0 0 0 8.6 0C12.3 7 8 2.4 8 2.4z" fill="currentColor" />
  },
  seat: {
    label: 'Posture',
    color: '#30B0C7',
    glyph: (
      <path
        d="M5.6 3v4m0 0h4.8m0 0V4.4a1.4 1.4 0 0 0-1.4-1.4H6.9M5.6 7l-.5 5.5m5.3-5.5l.5 5.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    )
  },
  walk: {
    label: 'Walk',
    color: '#FF9F0A',
    glyph: (
      <>
        <circle cx="9" cy="3.4" r="1.3" fill="currentColor" />
        <path
          d="M8.6 5.6 6.6 7.3l1 2.4m1-4.1 2 1 1.3 1.1M8.6 5.6 7.6 12m1.7-2.4 1 2.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    )
  },
  stretch: {
    label: 'Stretch',
    color: '#5E5CE6',
    glyph: (
      <>
        <circle cx="8" cy="3.2" r="1.2" fill="currentColor" />
        <path
          d="M8 4.6v4m0 0-2 3.4M8 8.6l2 3.4M4.6 5.6 8 6.8l3.4-1.2"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    )
  },
  bell: {
    label: 'Bell',
    color: '#FF375F',
    glyph: (
      <path
        d="M8 2.2a3.2 3.2 0 0 0-3.2 3.2c0 3.4-1 4.4-1.4 4.9-.2.2-.05.6.25.6h8.8c.3 0 .45-.4.25-.6-.4-.5-1.4-1.5-1.4-4.9A3.2 3.2 0 0 0 8 2.2zm0 11.6a1.6 1.6 0 0 0 1.5-1.1h-3A1.6 1.6 0 0 0 8 13.8z"
        fill="currentColor"
      />
    )
  },
  coffee: {
    label: 'Coffee',
    color: '#A2845E',
    glyph: (
      <path
        d="M4.5 3.5h7a1 1 0 0 1 1 1c0 3.6-1.6 6-3.5 6h-2c-1.9 0-3.5-2.4-3.5-6a1 1 0 0 1 1-1zm7.9 1.2h1.1a1.6 1.6 0 0 1 0 3.2h-1.5M4 12.7h8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    )
  },
  eye: {
    label: 'Eyes',
    color: '#007AFF',
    glyph: (
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
  },
  heart: {
    label: 'Health',
    color: '#FF3B30',
    glyph: (
      <path
        d="M8 12.6S3 9.4 3 6.2A2.6 2.6 0 0 1 8 5a2.6 2.6 0 0 1 5 1.2C13 9.4 8 12.6 8 12.6z"
        fill="currentColor"
      />
    )
  }
}

export const REMINDER_ICON_IDS = Object.keys(ICONS)

export const DEFAULT_REMINDER_ICON = 'bell'

function resolve(id: string): IconDef {
  return ICONS[id] ?? ICONS[DEFAULT_REMINDER_ICON]
}

/** A reminder icon in a colored rounded square (sidebar-glyph style). */
export function ReminderIcon({ id, size = 22 }: { id: string; size?: number }): JSX.Element {
  const def = resolve(id)
  const inner = Math.round(size * 0.72)
  return (
    <span
      className="flex items-center justify-center rounded-[6px] text-white"
      style={{ width: size, height: size, backgroundColor: def.color, borderRadius: size * 0.28 }}
    >
      <svg width={inner} height={inner} viewBox="0 0 16 16">
        {def.glyph}
      </svg>
    </span>
  )
}

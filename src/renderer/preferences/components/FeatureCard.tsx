import { Card, PlayDemoButton, COLORS } from './controls'
import type { ReactNode } from 'react'

/**
 * LookAway-style feature card: title + description, gradient hero with a
 * circular outline icon, a white rows card, and a right-aligned Play demo.
 */
export function FeatureCard({
  title,
  description,
  gradient,
  icon,
  onDemo,
  children
}: {
  title: string
  description: string
  gradient: string
  icon: ReactNode
  onDemo: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <h3 className="text-[15px] font-semibold" style={{ color: COLORS.text }}>
        {title}
      </h3>
      <p
        className="mt-1 mb-3 min-h-[34px] text-[12.5px] leading-snug"
        style={{ color: COLORS.secondary }}
      >
        {description}
      </p>
      <div
        className="mb-3 flex h-[150px] items-center justify-center rounded-xl"
        style={{ backgroundImage: gradient, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
      >
        <div
          className="flex h-[84px] w-[84px] items-center justify-center rounded-full"
          style={{ border: '6px solid rgba(28,28,30,0.85)' }}
        >
          {icon}
        </div>
      </div>
      <Card>{children}</Card>
      <div className="mt-3 flex justify-end">
        <PlayDemoButton onClick={onDemo} />
      </div>
    </div>
  )
}

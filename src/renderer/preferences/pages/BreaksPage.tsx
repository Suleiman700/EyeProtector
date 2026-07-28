import { FeatureCard } from '../components/FeatureCard'
import { Row, Stepper, Switch } from '../components/controls'
import type { AppSettings } from '../../../shared/settings'

const ICON_EYE = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path
      d="M6 20s5-8 14-8 14 8 14 8-5 8-14 8-14-8-14-8z"
      stroke="rgba(28,28,30,0.85)"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <circle cx="20" cy="20" r="4.5" fill="rgba(28,28,30,0.85)" />
  </svg>
)

const ICON_ARROW_UP = (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path
      d="M18 29V8M18 8l-8.5 8.5M18 8l8.5 8.5"
      stroke="rgba(28,28,30,0.85)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function BreaksPage({
  settings,
  update
}: {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}): JSX.Element {
  return (
    <div className="flex gap-8">
      <FeatureCard
        title="Short Break · Eye Rest"
        description="Brief pauses that let your eyes refocus on something far away and relax"
        gradient="linear-gradient(120deg, #2DD4BF 0%, #38BDF8 55%, #6366F1 100%)"
        icon={ICON_EYE}
        onDemo={() => window.eyeprotector.takeBreakNow()}
      >
        <Row label="Strict (cannot skip)">
          <Switch
            checked={settings.short.strict}
            onChange={(v) => update({ short: { ...settings.short, strict: v } })}
          />
        </Row>
        <Row label="Show every">
          <Stepper
            value={settings.short.intervalMin}
            unit="min"
            onChange={(v) => update({ short: { ...settings.short, intervalMin: v } })}
          />
        </Row>
        <Row label="Duration" last>
          <Stepper
            value={settings.short.durationSec}
            unit="sec"
            onChange={(v) => update({ short: { ...settings.short, durationSec: v } })}
          />
        </Row>
      </FeatureCard>

      <FeatureCard
        title="Long Break · Get Up"
        description="Longer breaks to stand up, stretch, and give your body a real rest"
        gradient="linear-gradient(120deg, #F472B6 0%, #C084FC 55%, #818CF8 100%)"
        icon={ICON_ARROW_UP}
        onDemo={() => window.eyeprotector.takeBreakNow()}
      >
        <Row label="Strict (cannot skip)">
          <Switch
            checked={settings.long.strict}
            onChange={(v) => update({ long: { ...settings.long, strict: v } })}
          />
        </Row>
        <Row label="Show every">
          <Stepper
            value={settings.long.intervalMin}
            unit="min"
            onChange={(v) => update({ long: { ...settings.long, intervalMin: v } })}
          />
        </Row>
        <Row label="Duration" last>
          <Stepper
            value={settings.long.durationSec}
            unit="sec"
            onChange={(v) => update({ long: { ...settings.long, durationSec: v } })}
          />
        </Row>
      </FeatureCard>
    </div>
  )
}

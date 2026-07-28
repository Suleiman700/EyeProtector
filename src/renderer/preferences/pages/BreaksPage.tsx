import { FeatureCard } from '../components/FeatureCard'
import { NumberSelect, Row, Switch, fmtMinutes, fmtSeconds } from '../components/controls'
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
        onDemo={() => window.eyeprotector.takeBreakNow('short')}
      >
        <Row label="Enabled">
          <Switch
            checked={settings.short.enabled}
            onChange={(v) => update({ short: { ...settings.short, enabled: v } })}
          />
        </Row>
        <Row label="Strict (cannot skip)">
          <Switch
            checked={settings.short.strict}
            onChange={(v) => update({ short: { ...settings.short, strict: v } })}
          />
        </Row>
        <Row label="Show every">
          <NumberSelect
            value={settings.short.intervalMin}
            presets={[5, 10, 15, 20, 25, 30, 45, 60]}
            format={fmtMinutes}
            onChange={(v) => update({ short: { ...settings.short, intervalMin: v } })}
          />
        </Row>
        <Row label="Duration" last>
          <NumberSelect
            value={settings.short.durationSec}
            presets={[10, 15, 20, 30, 45, 60, 90, 120]}
            format={fmtSeconds}
            onChange={(v) => update({ short: { ...settings.short, durationSec: v } })}
          />
        </Row>
      </FeatureCard>

      <FeatureCard
        title="Long Break · Get Up"
        description="Longer breaks to stand up, stretch, and give your body a real rest"
        gradient="linear-gradient(120deg, #F472B6 0%, #C084FC 55%, #818CF8 100%)"
        icon={ICON_ARROW_UP}
        onDemo={() => window.eyeprotector.takeBreakNow('long')}
      >
        <Row label="Enabled">
          <Switch
            checked={settings.long.enabled}
            onChange={(v) => update({ long: { ...settings.long, enabled: v } })}
          />
        </Row>
        <Row label="Strict (cannot skip)">
          <Switch
            checked={settings.long.strict}
            onChange={(v) => update({ long: { ...settings.long, strict: v } })}
          />
        </Row>
        <Row label="Show every">
          <NumberSelect
            value={settings.long.intervalMin}
            presets={[30, 45, 60, 90, 120, 180, 240]}
            format={fmtMinutes}
            onChange={(v) => update({ long: { ...settings.long, intervalMin: v } })}
          />
        </Row>
        <Row label="Duration" last>
          <NumberSelect
            value={settings.long.durationSec}
            presets={[60, 120, 180, 300, 600, 900]}
            format={fmtSeconds}
            onChange={(v) => update({ long: { ...settings.long, durationSec: v } })}
          />
        </Row>
      </FeatureCard>
    </div>
  )
}

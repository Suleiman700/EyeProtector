import { FeatureCard } from '../components/FeatureCard'
import { Row, SelectField, Stepper, Switch, COLORS } from '../components/controls'
import { BLINK_DURATION_OPTIONS } from '../../../shared/settings'
import type { AppSettings } from '../../../shared/settings'

const ICON_BLINK = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path
      d="M8 22c2.5-3.5 5.5-3.5 8 0M24 22c2.5-3.5 5.5-3.5 8 0"
      stroke="rgba(28,28,30,0.85)"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
)

export function BlinkPage({
  settings,
  update
}: {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <div className="max-w-[420px]">
        <FeatureCard
          title="Blink Reminder"
          description="Prevents dry eyes by gently nudging you to blink at healthy intervals"
          gradient="linear-gradient(120deg, #22D3EE 0%, #60A5FA 50%, #A78BFA 100%)"
          icon={ICON_BLINK}
          onDemo={() => window.eyeprotector.takeBlinkNow()}
        >
          <Row label="Enabled">
            <Switch
              checked={settings.blink.enabled}
              onChange={(v) => update({ blink: { ...settings.blink, enabled: v } })}
            />
          </Row>
          <Row label="Show every">
            <Stepper
              value={settings.blink.intervalMin}
              unit="min"
              onChange={(v) => update({ blink: { ...settings.blink, intervalMin: v } })}
            />
          </Row>
          <Row label="Duration" last>
            <SelectField
              value={String(settings.blink.durationSec)}
              options={BLINK_DURATION_OPTIONS.map((s) => ({ value: String(s), label: `${s} s` }))}
              onChange={(v) => update({ blink: { ...settings.blink, durationSec: Number(v) } })}
            />
          </Row>
        </FeatureCard>
      </div>
      <p className="mt-6 text-[12px]" style={{ color: COLORS.secondary }}>
        Note: Blink reminders are not shown during breaks
      </p>
    </div>
  )
}

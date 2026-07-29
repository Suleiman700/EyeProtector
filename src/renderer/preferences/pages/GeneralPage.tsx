import { Card, NumberSelect, Row, Switch, VolumeSlider, COLORS, fmtSeconds } from '../components/controls'
import type { AppSettings } from '../../../shared/settings'
import type { ReactNode } from 'react'

function GroupLabel({ children }: { children: ReactNode }): JSX.Element {
  return (
    <p
      className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: COLORS.secondary }}
    >
      {children}
    </p>
  )
}

export function GeneralPage({
  settings,
  update
}: {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}): JSX.Element {
  return (
    <div className="max-w-[460px]">
      <GroupLabel>Startup</GroupLabel>
      <div className="mb-7">
        <Card>
          <Row label="Launch at login" last>
            <Switch checked={settings.autostart} onChange={(v) => update({ autostart: v })} />
          </Row>
        </Card>
      </div>

      <GroupLabel>Battery</GroupLabel>
      <div className="mb-7">
        <Card>
          <Row label="Reduce activity on battery" last>
            <Switch
              checked={settings.batterySaver}
              onChange={(v) => update({ batterySaver: v })}
            />
          </Row>
        </Card>
        <p className="mt-2 px-1 text-[12px]" style={{ color: COLORS.secondary }}>
          When unplugged, slows internal timers and skips the update check. Reminders still run.
        </p>
      </div>

      <GroupLabel>Sounds</GroupLabel>
      <div className="mb-7">
        <Card>
          <Row label="Play sound on reminders">
            <Switch
              checked={settings.sound.enabled}
              onChange={(v) => update({ sound: { ...settings.sound, enabled: v } })}
            />
          </Row>
          <Row label="Volume" last>
            <VolumeSlider
              value={settings.sound.volume}
              onChange={(v) => update({ sound: { ...settings.sound, volume: v } })}
            />
          </Row>
        </Card>
      </div>

      <GroupLabel>Breaks</GroupLabel>
      <Card>
        <Row label="Pre-break warning" last>
          <NumberSelect
            value={settings.preBreakWarningSec}
            presets={[0, 5, 10, 15, 20, 30]}
            format={(n) => (n === 0 ? 'Off' : fmtSeconds(n))}
            onChange={(v) => update({ preBreakWarningSec: v })}
          />
        </Row>
      </Card>
    </div>
  )
}

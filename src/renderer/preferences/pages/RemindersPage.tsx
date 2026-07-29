import {
  Card,
  Row,
  Switch,
  SelectField,
  NumberSelect,
  COLORS,
  fmtMinutes,
  fmtSeconds
} from '../components/controls'
import {
  makeCustomReminder,
  validateReminder,
  defaultReminders,
  REMINDER_INTERVAL_OPTIONS,
  BANNER_DURATION_OPTIONS,
  OVERLAY_DURATION_OPTIONS,
  type Reminder
} from '../../../shared/reminders'
import type { AppSettings } from '../../../shared/settings'

export function RemindersPage({
  settings,
  update
}: {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}): JSX.Element {
  const reminders = settings.reminders

  const save = (next: Reminder[]): void => update({ reminders: next })
  const patch = (id: string, over: Partial<Reminder>): void =>
    save(reminders.map((r) => (r.id === id ? validateReminder({ ...r, ...over }) : r)))
  const remove = (id: string): void => save(reminders.filter((r) => r.id !== id))
  const reset = (id: string): void => {
    const preset = defaultReminders().find((p) => p.id === id)
    if (preset) save(reminders.map((r) => (r.id === id ? preset : r)))
  }
  const add = (): void => save([...reminders, makeCustomReminder(reminders.map((r) => r.id))])

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[520px] text-[12.5px]" style={{ color: COLORS.secondary }}>
        Gentle nudges for hydration, posture, and movement. Each can appear as a corner banner
        or a full-screen overlay. Only scheduled reminders count toward Insights.
      </p>

      {reminders.map((r) => (
        <div key={r.id} className="max-w-[520px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xl">{r.emoji}</span>
            <input
              className="flex-1 rounded-md bg-transparent text-[15px] font-semibold outline-none"
              style={{ color: COLORS.text }}
              value={r.title}
              onChange={(e) => patch(r.id, { title: e.target.value })}
            />
            <button
              className="text-[12px]"
              style={{ color: r.preset ? COLORS.secondary : '#FF3B30' }}
              onClick={() => (r.preset ? reset(r.id) : remove(r.id))}
            >
              {r.preset ? 'Reset' : 'Delete'}
            </button>
            <button
              className="rounded-md px-2 py-1 text-[12px]"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.text }}
              onClick={() => window.eyeprotector.takeReminderNow(r.id)}
            >
              Play demo
            </button>
          </div>
          <Card>
            <Row label="Enabled">
              <Switch checked={r.enabled} onChange={(v) => patch(r.id, { enabled: v })} />
            </Row>
            <Row label="Emoji">
              <input
                className="w-16 rounded-md bg-transparent text-right text-[15px] outline-none"
                value={r.emoji}
                onChange={(e) => patch(r.id, { emoji: e.target.value })}
              />
            </Row>
            <Row label="Message">
              <input
                className="w-56 rounded-md bg-transparent text-right text-[13px] outline-none"
                style={{ color: COLORS.secondary }}
                value={r.message}
                onChange={(e) => patch(r.id, { message: e.target.value })}
              />
            </Row>
            <Row label="Show every">
              <NumberSelect
                value={r.intervalMin}
                presets={REMINDER_INTERVAL_OPTIONS}
                format={fmtMinutes}
                onChange={(v) => patch(r.id, { intervalMin: v })}
              />
            </Row>
            <Row label="Style">
              <SelectField
                value={r.presentation}
                options={[
                  { value: 'banner', label: 'Corner banner' },
                  { value: 'overlay', label: 'Full screen' }
                ]}
                onChange={(v) => patch(r.id, { presentation: v as Reminder['presentation'] })}
              />
            </Row>
            <Row label="Duration" last>
              <NumberSelect
                value={r.durationSec}
                presets={
                  r.presentation === 'overlay' ? OVERLAY_DURATION_OPTIONS : BANNER_DURATION_OPTIONS
                }
                format={fmtSeconds}
                onChange={(v) => patch(r.id, { durationSec: v })}
              />
            </Row>
          </Card>
        </div>
      ))}

      <button
        className="max-w-[520px] rounded-xl border border-dashed py-3 text-[13px] font-medium"
        style={{ borderColor: COLORS.hairline, color: COLORS.accent }}
        onClick={add}
      >
        + Add reminder
      </button>
    </div>
  )
}

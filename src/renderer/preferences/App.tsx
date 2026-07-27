import { useEffect, useState } from 'react'
import * as RadixSwitch from '@radix-ui/react-switch'
import * as RadixSelect from '@radix-ui/react-select'
import { useSettings } from './useSettings'
import { BLINK_DURATION_OPTIONS } from '../../shared/settings'
import type { StatusPayload } from '../../shared/ipc'
import type { ReactNode } from 'react'

export function App(): JSX.Element {
  const { settings, update } = useSettings()
  const [status, setStatus] = useState<StatusPayload | null>(null)

  useEffect(() => window.eyeprotector.onStatus(setStatus), [])

  if (!settings) return <div className="min-h-screen bg-slate-950" />

  const mmss = (ms: number): string => {
    const s = Math.max(0, Math.round(ms / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div
      className="min-h-screen bg-slate-950 p-6 text-slate-100"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto max-w-lg space-y-6">
        <header className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-semibold tracking-tight">EyeProtector</h1>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs tabular-nums text-slate-400">
            Next break {status ? mmss(status.msUntilNext) : '—'}
          </span>
        </header>

        <Group label="Blink Reminder">
          <Row label="Enable blink reminders" last={false}>
            <Switch
              checked={settings.blink.enabled}
              onChange={(v) => update({ blink: { ...settings.blink, enabled: v } })}
            />
          </Row>
          <Row label="Remind every" last={false}>
            <NumberInput
              value={settings.blink.intervalMin}
              unit="min"
              onChange={(v) => update({ blink: { ...settings.blink, intervalMin: v } })}
            />
          </Row>
          <Row label="Screen duration" last={true}>
            <SelectField
              value={String(settings.blink.durationSec)}
              options={BLINK_DURATION_OPTIONS.map((s) => ({ value: String(s), label: `${s} s` }))}
              onChange={(v) => update({ blink: { ...settings.blink, durationSec: Number(v) } })}
            />
          </Row>
        </Group>

        <div className="px-1">
          <button
            className="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400"
            onClick={() => window.eyeprotector.takeBlinkNow()}
          >
            Preview Blink
          </button>
        </div>

        <Group label="Short Break · Eye Rest">
          <Row label="Every" last={false}>
            <NumberInput
              value={settings.short.intervalMin}
              unit="min"
              onChange={(v) => update({ short: { ...settings.short, intervalMin: v } })}
            />
          </Row>
          <Row label="Duration" last={false}>
            <NumberInput
              value={settings.short.durationSec}
              unit="sec"
              onChange={(v) => update({ short: { ...settings.short, durationSec: v } })}
            />
          </Row>
          <Row label="Strict (cannot skip)" last={true}>
            <Switch
              checked={settings.short.strict}
              onChange={(v) => update({ short: { ...settings.short, strict: v } })}
            />
          </Row>
        </Group>

        <Group label="Long Break · Get Up">
          <Row label="Every" last={false}>
            <NumberInput
              value={settings.long.intervalMin}
              unit="min"
              onChange={(v) => update({ long: { ...settings.long, intervalMin: v } })}
            />
          </Row>
          <Row label="Duration" last={false}>
            <NumberInput
              value={settings.long.durationSec}
              unit="sec"
              onChange={(v) => update({ long: { ...settings.long, durationSec: v } })}
            />
          </Row>
          <Row label="Strict (cannot skip)" last={true}>
            <Switch
              checked={settings.long.strict}
              onChange={(v) => update({ long: { ...settings.long, strict: v } })}
            />
          </Row>
        </Group>

        <div className="px-1 pb-4">
          <button
            className="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400"
            onClick={() => window.eyeprotector.takeBreakNow()}
          >
            Take a Break Now
          </button>
        </div>
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm">
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  last,
  children
}: {
  label: string
  last: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3${last ? '' : ' border-b border-slate-700/40'}`}
    >
      <span className="text-sm text-slate-100">{label}</span>
      {children}
    </div>
  )
}

function Switch({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-7 w-12 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      style={{ backgroundColor: checked ? '#14b8a6' : '#334155' }}
    >
      <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1" />
    </RadixSwitch.Root>
  )
}

function NumberInput({
  value,
  unit,
  onChange
}: {
  value: number
  unit: string
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
        className="w-14 bg-transparent text-right text-sm text-teal-400 focus:outline-none"
      />
      <span className="text-sm text-slate-500">{unit}</span>
    </div>
  )
}

function SelectField({
  value,
  options,
  onChange
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}): JSX.Element {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger className="flex items-center gap-1 text-sm text-teal-400 focus:outline-none">
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800 p-1 shadow-xl"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-default select-none items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-100 outline-none data-[highlighted]:bg-slate-700"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-teal-400">
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

import * as RadixSwitch from '@radix-ui/react-switch'
import * as RadixSelect from '@radix-ui/react-select'
import type { ReactNode } from 'react'

export const SF_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif'

export const COLORS = {
  content: '#FAFAFA',
  sidebar: '#F2F2F7',
  card: '#FFFFFF',
  text: '#1C1C1E',
  secondary: '#8A8A8E',
  hairline: '#C6C6C8',
  accent: '#007AFF',
  switchOn: '#34C759',
  switchOff: '#E9E9EA'
} as const

export function Card({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        backgroundColor: COLORS.card,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)'
      }}
    >
      {children}
    </div>
  )
}

export function Row({
  label,
  last = false,
  children
}: {
  label: string
  last?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <div className="relative flex min-h-[44px] items-center justify-between pl-4 pr-4">
      <span className="py-2.5 text-[14px] leading-tight" style={{ color: COLORS.text }}>
        {label}
      </span>
      <div className="flex items-center py-2">{children}</div>
      {!last && <span className="ios-separator" />}
    </div>
  )
}

export function Switch({
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
      className="relative h-[26px] w-[44px] cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? COLORS.switchOn : COLORS.switchOff }}
    >
      <RadixSwitch.Thumb
        className="block h-[22px] w-[22px] rounded-full bg-white transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-[2px]"
        style={{ boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.16)' }}
      />
    </RadixSwitch.Root>
  )
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} min`
  return min % 60 === 0 ? `${min / 60} h` : `${Math.floor(min / 60)} h ${min % 60} min`
}

export function fmtSeconds(sec: number): string {
  if (sec < 60) return `${sec} sec`
  return sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)} min ${sec % 60} sec`
}

/**
 * Numeric picker rendered as an iOS-style select over preset values. The
 * current value is injected into the list if it isn't a preset (e.g. saved
 * by an older build), so the trigger never shows blank.
 */
export function NumberSelect({
  value,
  presets,
  format,
  onChange
}: {
  value: number
  presets: number[]
  format: (n: number) => string
  onChange: (v: number) => void
}): JSX.Element {
  const values = presets.includes(value) ? presets : [...presets, value].sort((a, b) => a - b)
  return (
    <SelectField
      value={String(value)}
      options={values.map((n) => ({ value: String(n), label: format(n) }))}
      onChange={(v) => onChange(Number(v))}
    />
  )
}

export function VolumeSlider({
  value,
  onChange
}: {
  value: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="ios-slider w-36"
      style={{
        background: `linear-gradient(to right, ${COLORS.accent} ${value * 100}%, ${COLORS.switchOff} ${value * 100}%)`
      }}
    />
  )
}

export function PlayDemoButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      className="ios-filled-btn flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium"
      style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.text }}
      onClick={onClick}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
        <path d="M3 1.7v8.6c0 .55.6.9 1.07.6l6.4-4.3a.72.72 0 0 0 0-1.2l-6.4-4.3A.72.72 0 0 0 3 1.7z" />
      </svg>
      Play demo
    </button>
  )
}

export function SelectField({
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
      <RadixSelect.Trigger
        className="flex items-center gap-1 text-[14px] focus:outline-none"
        style={{ color: COLORS.accent }}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon style={{ color: '#C4C4C6' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="z-50 overflow-hidden rounded-xl p-1"
          style={{
            backgroundColor: COLORS.card,
            boxShadow: '0 8px 30px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)',
            fontFamily: SF_FONT
          }}
          position="popper"
          sideOffset={6}
        >
          <RadixSelect.Viewport>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex cursor-default select-none items-center justify-between rounded-lg px-3 py-2 text-[13px] outline-none data-[highlighted]:bg-[#F2F2F7]"
                style={{ color: COLORS.text }}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-4">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 14 14"
                    fill="none"
                    style={{ color: COLORS.accent }}
                  >
                    <path
                      d="M2 7l3.5 3.5L12 3"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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

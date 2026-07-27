# Blink Duration Selector + iOS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-configurable blink screen duration selector and redesign the preferences UI with an iOS Settings aesthetic using Radix UI + Tailwind v4.

**Architecture:** Extend `BlinkSettings` with `durationSec`, thread it from the settings store through `BlinkController` → `BlinkOverlay` (safety timeout) and through the blink renderer (auto-dismiss timer). Replace the preferences UI components with Radix Switch + Radix Select, styled to match iOS.

**Tech Stack:** Electron, React 18, TypeScript, Tailwind v4, Framer Motion (already installed), `@radix-ui/react-switch`, `@radix-ui/react-select`

## Global Constraints

- Tailwind v4 — class names only, no `tailwind.config.js`
- No new IPC channels — use existing `getSettings` / `setSettings`
- `BLINK_DURATION_OPTIONS = [2, 4, 6, 8, 10, 15]` (seconds)
- Default `durationSec: 4`
- Vitest for all tests (`npm test`)
- Commit after each task

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add two Radix deps |
| `src/shared/settings.ts` | Modify | Add `durationSec` field + `BLINK_DURATION_OPTIONS` |
| `src/shared/settings.test.ts` | Modify | Assert new default |
| `src/main/BlinkOverlay.ts` | Modify | Accept `durationMs` param in `show()` |
| `src/main/BlinkController.ts` | Modify | Pass `durationMs` to `overlay.show()` |
| `src/renderer/blink/BlinkScreen.tsx` | Modify | Read `durationSec` from settings for auto-dismiss |
| `src/renderer/preferences/App.tsx` | Modify | Full iOS redesign — new Switch, NumberInput, SelectField |

---

## Task 1: Install Radix packages + extend BlinkSettings

**Files:**
- Modify: `package.json`
- Modify: `src/shared/settings.ts`
- Modify: `src/shared/settings.test.ts`

**Interfaces:**
- Produces: `BlinkSettings.durationSec: number`, `BLINK_DURATION_OPTIONS: number[]` — used by Tasks 2, 3, 4

- [ ] **Step 1: Install Radix packages**

```bash
npm install @radix-ui/react-switch @radix-ui/react-select
```

- [ ] **Step 2: Write failing test for new default**

In `src/shared/settings.test.ts`, add inside the existing `describe('settings', ...)` block:

```ts
it('blink has durationSec default of 4', () => {
  expect(DEFAULT_SETTINGS.blink.durationSec).toBe(4)
})

it('BLINK_DURATION_OPTIONS includes 4 and 15', () => {
  expect(BLINK_DURATION_OPTIONS).toContain(4)
  expect(BLINK_DURATION_OPTIONS).toContain(15)
})
```

Also update the import line at the top:

```ts
import { DEFAULT_SETTINGS, toSchedulerConfig, BLINK_DURATION_OPTIONS } from './settings'
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
npm test
```

Expected: FAIL — `durationSec` not found, `BLINK_DURATION_OPTIONS` not exported.

- [ ] **Step 4: Update settings.ts**

Replace the existing `BlinkSettings` interface and `DEFAULT_SETTINGS.blink` in `src/shared/settings.ts`:

```ts
export interface BlinkSettings {
  enabled: boolean
  intervalMin: number
  durationSec: number
}

export const BLINK_DURATION_OPTIONS = [2, 4, 6, 8, 10, 15] // seconds
```

Update `DEFAULT_SETTINGS`:

```ts
blink: { enabled: true, intervalMin: 5, durationSec: 4 },
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npm test
```

Expected: all tests pass, including two new ones.

- [ ] **Step 6: Commit**

```bash
git add src/shared/settings.ts src/shared/settings.test.ts package.json package-lock.json
git commit -m "feat: add blink durationSec setting and Radix packages"
```

---

## Task 2: Thread duration through BlinkOverlay + BlinkController

**Files:**
- Modify: `src/main/BlinkOverlay.ts:30,96`
- Modify: `src/main/BlinkController.ts:39,46`

**Interfaces:**
- Consumes: `BlinkSettings.durationSec` from `SettingsStore` (via `this.settings.get()`)
- Produces: `BlinkOverlay.show(durationMs: number)` — used by Task 3 indirectly (safety timer respects user preference)

The `BlinkOverlay` currently has a hardcoded 8-second safety timeout (`setTimeout(() => this.close(), 8000)`). If the user picks 10s or 15s, the overlay closes early. This task fixes that by accepting `durationMs` in `show()` and using `durationMs + 2000` as the safety margin.

- [ ] **Step 1: Update `BlinkOverlay.show()` signature**

In `src/main/BlinkOverlay.ts`, change the `show()` method signature and safety timer:

```ts
show(durationMs = 4000): void {
  // ... existing window setup code unchanged ...

  if (this.safety) clearTimeout(this.safety)
  this.safety = setTimeout(() => this.close(), durationMs + 2000)
}
```

Only the method signature line and the `this.safety = setTimeout(...)` line change. Everything else in `show()` stays exactly as-is.

- [ ] **Step 2: Update `BlinkController` to pass duration**

In `src/main/BlinkController.ts`, update the two places that call `this.overlay.show()`:

```ts
private tick(): void {
  const { blink } = this.settings.get()
  if (!blink.enabled) return
  const now = Date.now()
  if (now >= this.nextAt) {
    this.overlay.show(blink.durationSec * 1000)
    this.nextAt = now + blink.intervalMin * 60_000
  }
}

triggerNow(): void {
  const { blink } = this.settings.get()
  this.overlay.show(blink.durationSec * 1000)
  this.reschedule(Date.now())
}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all pass (no test changes needed — BlinkOverlay/Controller have no unit tests).

- [ ] **Step 4: Commit**

```bash
git add src/main/BlinkOverlay.ts src/main/BlinkController.ts
git commit -m "feat: pass blink durationMs through overlay and controller"
```

---

## Task 3: Update BlinkScreen to read duration from settings

**Files:**
- Modify: `src/renderer/blink/BlinkScreen.tsx:12`

**Interfaces:**
- Consumes: `window.eyeprotector.getSettings()` → `AppSettings.blink.durationSec`

Currently `BlinkScreen.tsx` has `setTimeout(() => window.eyeprotector.blinkDone(), 4000)`. Replace it with a settings-driven value.

- [ ] **Step 1: Replace hardcoded timeout with settings-driven one**

Replace the entire `useEffect` in `src/renderer/blink/BlinkScreen.tsx`:

```tsx
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>
  window.eyeprotector.getSettings().then((s) => {
    timer = setTimeout(() => window.eyeprotector.blinkDone(), s.blink.durationSec * 1000)
  })
  return () => clearTimeout(timer)
}, [])
```

The `clearTimeout(undefined)` on unmount-before-resolve is a no-op, so no extra guard needed.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/blink/BlinkScreen.tsx
git commit -m "feat: blink screen reads durationSec from settings"
```

---

## Task 4: iOS redesign of preferences/App.tsx

**Files:**
- Modify: `src/renderer/preferences/App.tsx`

**Interfaces:**
- Consumes: `@radix-ui/react-switch`, `@radix-ui/react-select`
- Consumes: `BLINK_DURATION_OPTIONS` from `../../shared/settings`
- Consumes: `settings.blink.durationSec` via `useSettings`

This task replaces the entire `App.tsx`. Rewrite it completely — do not patch incrementally.

- [ ] **Step 1: Write the full redesigned App.tsx**

Replace the entire contents of `src/renderer/preferences/App.tsx` with:

```tsx
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
      className={`flex items-center justify-between px-4 py-3 ${
        last ? '' : 'border-b border-slate-700/40'
      }`}
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
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-teal-400">
                    <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all pass (App.tsx has no unit tests — tests are in shared/).

- [ ] **Step 3: Commit**

```bash
git add src/renderer/preferences/App.tsx
git commit -m "feat: iOS redesign with Radix Switch + Select, blink duration selector"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** `durationSec` field ✓ | `BLINK_DURATION_OPTIONS` ✓ | Radix Switch ✓ | Radix Select ✓ | BlinkScreen reads setting ✓ | iOS styling (section labels, hairline dividers, teal accent, slate-950 bg) ✓ | Safety timer updated for long durations ✓
- [x] **No placeholders:** All code blocks are complete and copy-paste ready
- [x] **Type consistency:** `durationSec: number` defined in Task 1, consumed as `blink.durationSec * 1000` in Tasks 2 and 3; `BLINK_DURATION_OPTIONS` exported in Task 1, imported in Task 4

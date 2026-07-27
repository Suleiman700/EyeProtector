# Blink Duration Selector + iOS Redesign

**Date:** 2026-07-27
**Status:** Approved

## Goal

Add a user-configurable blink screen duration (select from predefined options) and redesign the entire preferences UI to match an iOS Settings aesthetic using Radix UI primitives + Tailwind v4.

## Scope

- `src/shared/settings.ts`
- `src/renderer/preferences/App.tsx`
- `src/renderer/preferences/index.css`
- `src/renderer/blink/BlinkScreen.tsx`
- `package.json` (two new deps)

## Data Layer

### `BlinkSettings` change

```ts
export interface BlinkSettings {
  enabled: boolean
  intervalMin: number
  durationSec: number   // NEW — auto-dismiss duration
}
```

Default: `durationSec: 4`

Predefined options constant (co-located in `settings.ts`):

```ts
export const BLINK_DURATION_OPTIONS = [2, 4, 6, 8, 10, 15] // seconds
```

### `BlinkScreen.tsx` change

On mount, call `window.eyeprotector.getSettings()` and use `blink.durationSec * 1000` for the auto-dismiss `setTimeout`. Fall back to `4000` if the promise hasn't resolved before the component unmounts. No new IPC channels required — `getSettings` is already in the preload.

## New Packages

| Package | Purpose |
|---|---|
| `@radix-ui/react-switch` | Accessible iOS-style toggle |
| `@radix-ui/react-select` | Styled dropdown for duration |

## UI Design

### Overall

- Background: `bg-slate-950`
- Font: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`
- Max width: `max-w-lg`, centered, `p-6` padding

### Section cards

- `bg-slate-800/50 backdrop-blur-sm rounded-2xl`
- iOS-style section label above each card: `text-xs font-semibold uppercase tracking-widest text-slate-500 px-1 mb-1`
- Rows separated by `border-b border-slate-700/40` hairline dividers

### `Switch` component (replaces `Toggle`)

- Radix `Root`: `w-12 h-7 rounded-full transition-colors` — `bg-slate-700` (off) / `bg-teal-500` (on)
- Radix `Thumb`: `block w-5 h-5 rounded-full bg-white shadow-md translate-x-1 data-[state=checked]:translate-x-6 transition-transform duration-200`
- Row layout: `flex items-center justify-between py-3 px-4`

### `NumberInput` component (replaces `NumberField`)

- `bg-transparent border-0 text-right text-slate-100 w-20 focus:outline-none` (value floats right, no box — iOS pattern)
- Label left, value right, with a subtle `text-slate-400` tint on the value

### `SelectField` component (new)

- Trigger: `flex items-center gap-1 text-teal-400 text-sm` with a `ChevronUpDown` icon — iOS uses tinted text, not a bordered box
- Radix `Content`: floating card `bg-slate-800 border border-slate-700/60 rounded-xl shadow-xl p-1`
- `Item`: `px-3 py-2 rounded-lg text-sm cursor-default select-none hover:bg-slate-700 data-[highlighted]:bg-slate-700`
- Selected item shows a checkmark icon on the right

### Header

Keep the existing `EyeProtector` title + countdown badge. Badge style: `bg-slate-800 rounded-full px-3 py-1 text-xs tabular-nums text-slate-400`

### Buttons

Primary CTA: `bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors`

## Blink Section Layout (after redesign)

```
BLINK REMINDER
┌─────────────────────────────────┐
│ Enable blink reminders    [●  ] │  ← Switch
├─────────────────────────────────┤
│ Remind every           5 min    │  ← NumberInput
├─────────────────────────────────┤
│ Screen duration        4 s  ⌄   │  ← SelectField
├─────────────────────────────────┤
│          [Preview blink]        │
└─────────────────────────────────┘
```

## Out of Scope

- Redesigning the blink overlay animation/mascot
- Adding new settings beyond `durationSec`
- Theming / dark-mode toggle (already dark-only)

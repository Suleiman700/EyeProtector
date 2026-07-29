# Wellness Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user-configurable wellness reminders (hydration, posture, stand-up, plus custom ones) that fire on independent intervals as either a corner banner or a full-screen overlay, tracked in Insights under a "Wellness" category.

**Architecture:** A self-contained subsystem parallel to Break/Blink (which are left untouched). A pure `reminders` module owns the data model and timing math; a main-process `ReminderController` (1s ticker, like `BlinkController`) drives an N-reminder schedule; a `ReminderPresenter` renders banner/overlay windows (patterned on `OverlayManager`/`BlinkOverlay`); a new `reminder` renderer draws both modes; a new preferences page edits the list.

**Tech Stack:** Electron + electron-vite, TypeScript, React, Radix UI, Tailwind, electron-store, Vitest.

## Global Constraints

- Only **scheduled** reminders record to Insights; manual "Play demo" (`record: false`) does not. (Matches Break/Blink.)
- Reminders never stack: a reminder fires only when no break, blink, or other reminder is on screen; otherwise it's skipped that tick and comes due again.
- Pure modules (`src/shared/*`) take `now: number` as a parameter — no internal clock, no `Math.random`/`Date.now` inside them (keeps them deterministic and unit-testable).
- Settings/stats persistence uses merge-over-defaults so files written by older builds stay valid.
- Preset reminders (`preset: true`) cannot be deleted, only disabled or reset. Custom reminders can be deleted.
- Match existing code style: named exports, explicit return types on exported functions, reuse existing controls (`Card`, `Row`, `Switch`, `NumberSelect`, `SelectField`, `COLORS`, `SF_FONT`).
- Commit messages: conventional commits, imperative mood.

---

### Task 1: Pure reminder model — `src/shared/reminders.ts`

**Files:**
- Create: `src/shared/reminders.ts`
- Test: `src/shared/reminders.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ReminderPresentation = 'banner' | 'overlay'`
  - `interface Reminder { id: string; emoji: string; title: string; message: string; intervalMin: number; presentation: ReminderPresentation; durationSec: number; enabled: boolean; preset: boolean }`
  - `const REMINDER_INTERVAL_OPTIONS: number[]`, `BANNER_DURATION_OPTIONS: number[]`, `OVERLAY_DURATION_OPTIONS: number[]`
  - `defaultReminders(): Reminder[]`
  - `makeCustomReminder(existingIds: string[]): Reminder`
  - `validateReminder(r: Reminder): Reminder`
  - `dueReminders(reminders: Reminder[], nextAt: Record<string, number>, now: number): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/shared/reminders.test.ts
import { describe, it, expect } from 'vitest'
import {
  defaultReminders,
  makeCustomReminder,
  validateReminder,
  dueReminders,
  type Reminder
} from './reminders'

const base = (over: Partial<Reminder> = {}): Reminder =>
  validateReminder({
    id: 'r1',
    emoji: '💧',
    title: 'Drink',
    message: 'Sip water',
    intervalMin: 30,
    presentation: 'banner',
    durationSec: 8,
    enabled: true,
    preset: false,
    ...over
  })

describe('defaultReminders', () => {
  it('ships three presets with stable ids', () => {
    const r = defaultReminders()
    expect(r.map((x) => x.id)).toEqual(['hydration', 'posture', 'standup'])
    expect(r.every((x) => x.preset)).toBe(true)
  })
})

describe('validateReminder', () => {
  it('clamps interval to 1..240', () => {
    expect(base({ intervalMin: 0 }).intervalMin).toBe(1)
    expect(base({ intervalMin: 999 }).intervalMin).toBe(240)
  })
  it('clamps banner duration to 3..30 and overlay to 10..600', () => {
    expect(base({ presentation: 'banner', durationSec: 1 }).durationSec).toBe(3)
    expect(base({ presentation: 'banner', durationSec: 99 }).durationSec).toBe(30)
    expect(base({ presentation: 'overlay', durationSec: 1 }).durationSec).toBe(10)
    expect(base({ presentation: 'overlay', durationSec: 9999 }).durationSec).toBe(600)
  })
  it('trims text and falls back to a default title when empty', () => {
    expect(base({ title: '  ' }).title).toBe('Reminder')
    expect(base({ message: '  hi  ' }).message).toBe('hi')
  })
})

describe('makeCustomReminder', () => {
  it('creates a non-preset reminder with an id not already taken', () => {
    const r = makeCustomReminder(['custom-1'])
    expect(r.preset).toBe(false)
    expect(r.id).not.toBe('custom-1')
    expect(r.enabled).toBe(true)
  })
})

describe('dueReminders', () => {
  const rs = [base({ id: 'a' }), base({ id: 'b' }), base({ id: 'c', enabled: false })]
  it('returns enabled ids whose nextAt has passed', () => {
    const now = 1000
    const nextAt = { a: 500, b: 2000, c: 500 }
    expect(dueReminders(rs, nextAt, now)).toEqual(['a'])
  })
  it('treats a missing nextAt as not due', () => {
    expect(dueReminders(rs, {}, 1000)).toEqual([])
  })
  it('returns several ids when several are due', () => {
    expect(dueReminders(rs, { a: 100, b: 100, c: 100 }, 1000)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/reminders.test.ts`
Expected: FAIL — cannot resolve `./reminders`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/shared/reminders.ts
/**
 * Pure wellness-reminder model — no Electron, no storage, no clock. Owns the
 * shape of a reminder and the timing/validation helpers, so everything here is
 * deterministic and unit-testable (see reminders.test.ts).
 */

export type ReminderPresentation = 'banner' | 'overlay'

export interface Reminder {
  /** Stable id. Presets use fixed ids ('hydration'…); custom use 'custom-N'. */
  id: string
  emoji: string
  title: string
  message: string
  intervalMin: number
  presentation: ReminderPresentation
  /** banner: auto-dismiss seconds; overlay: on-screen seconds. */
  durationSec: number
  enabled: boolean
  /** Shipped presets can be disabled/reset but never deleted. */
  preset: boolean
}

export const REMINDER_INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
export const BANNER_DURATION_OPTIONS = [3, 5, 8, 10, 15, 30]
export const OVERLAY_DURATION_OPTIONS = [10, 20, 30, 45, 60, 120]

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(n)))

export function validateReminder(r: Reminder): Reminder {
  const [lo, hi] = r.presentation === 'overlay' ? [10, 600] : [3, 30]
  const title = r.title.trim()
  return {
    ...r,
    emoji: r.emoji.trim() || '⏰',
    title: title || 'Reminder',
    message: r.message.trim(),
    intervalMin: clamp(r.intervalMin, 1, 240),
    durationSec: clamp(r.durationSec, lo, hi),
    preset: r.preset
  }
}

export function defaultReminders(): Reminder[] {
  return [
    {
      id: 'hydration',
      emoji: '💧',
      title: 'Time to hydrate',
      message: 'Take a sip of water',
      intervalMin: 45,
      presentation: 'banner',
      durationSec: 8,
      enabled: true,
      preset: true
    },
    {
      id: 'posture',
      emoji: '🪑',
      title: 'Check your posture',
      message: 'Sit up straight, relax your shoulders',
      intervalMin: 30,
      presentation: 'banner',
      durationSec: 8,
      enabled: true,
      preset: true
    },
    {
      id: 'standup',
      emoji: '🚶',
      title: 'Stand up & stretch',
      message: 'Get up and move for a moment',
      intervalMin: 60,
      presentation: 'overlay',
      durationSec: 30,
      enabled: true,
      preset: true
    }
  ].map(validateReminder)
}

export function makeCustomReminder(existingIds: string[]): Reminder {
  let n = existingIds.length + 1
  let id = `custom-${n}`
  while (existingIds.includes(id)) {
    n++
    id = `custom-${n}`
  }
  return validateReminder({
    id,
    emoji: '⏰',
    title: 'New reminder',
    message: 'Time for a quick check-in',
    intervalMin: 30,
    presentation: 'banner',
    durationSec: 8,
    enabled: true,
    preset: false
  })
}

/** Ids of enabled reminders whose scheduled time has arrived. */
export function dueReminders(
  reminders: Reminder[],
  nextAt: Record<string, number>,
  now: number
): string[] {
  return reminders
    .filter((r) => r.enabled && (nextAt[r.id] ?? Infinity) <= now)
    .map((r) => r.id)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/shared/reminders.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/shared/reminders.ts src/shared/reminders.test.ts
git commit -m "feat: pure wellness-reminder model with timing + validation"
```

---

### Task 2: Settings integration — `reminders` in `AppSettings`

**Files:**
- Modify: `src/shared/settings.ts` (add field + default)
- Modify: `src/main/SettingsStore.ts:16-25` (merge)

**Interfaces:**
- Consumes: `Reminder`, `defaultReminders` from Task 1.
- Produces: `AppSettings.reminders: Reminder[]`.

- [ ] **Step 1: Add the field and default**

In `src/shared/settings.ts`, add the import and the field. Add to the top imports:

```ts
import { defaultReminders, type Reminder } from './reminders'
```

Add `reminders: Reminder[]` to the `AppSettings` interface (after `blink`):

```ts
export interface AppSettings {
  schemaVersion: number
  short: BreakSettings
  long: BreakSettings
  blink: BlinkSettings
  reminders: Reminder[]
  preBreakWarningSec: number
  sound: { enabled: boolean; volume: number }
  autostart: boolean
  theme: string
}
```

Add the default to `DEFAULT_SETTINGS` (after `blink`):

```ts
  blink: { enabled: true, intervalMin: 5, durationSec: 4 },
  reminders: defaultReminders(),
```

- [ ] **Step 2: Merge in SettingsStore**

In `src/main/SettingsStore.ts`, add a `reminders` line to the returned object in `get()` (after the `blink` line). Reminders is a whole-array replace (keep the user's list if present, else defaults):

```ts
      blink: { ...DEFAULT_SETTINGS.blink, ...stored.blink },
      reminders: stored.reminders ?? DEFAULT_SETTINGS.reminders,
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit`
Expected: no errors. (If the project uses a single `tsconfig.json`, run `npx tsc --noEmit`.)

- [ ] **Step 4: Commit**

```bash
git add src/shared/settings.ts src/main/SettingsStore.ts
git commit -m "feat: add reminders list to app settings with defaults + merge"
```

---

### Task 3: Insights — add the `wellness` category — `src/shared/stats.ts`

**Files:**
- Modify: `src/shared/stats.ts`
- Modify: `src/main/StatsStore.ts:18-28`
- Test: `src/shared/stats.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `StatCategory` now includes `'wellness'`.
  - `DayStat` now has a `wellness: CategoryStat` field.
  - `normalizeDay(d: Partial<DayStat> | undefined): DayStat` (new export, used by StatsStore to keep old files valid).

- [ ] **Step 1: Write the failing test**

Add to `src/shared/stats.test.ts`:

```ts
import { normalizeDay } from './stats'
// (add alongside existing imports: emptyStats, recordEvent, aggregateRange, totalSkipped …)

describe('wellness category', () => {
  it('recordEvent tallies wellness into total and today', () => {
    const now = new Date('2026-07-29T10:00:00').getTime()
    const next = recordEvent(emptyStats(), { category: 'wellness', restedMs: 0, completed: true }, now)
    expect(next.total.wellness.completed).toBe(1)
    expect(next.days['2026-07-29'].wellness.completed).toBe(1)
  })

  it('totalSkipped includes wellness', () => {
    const now = new Date('2026-07-29T10:00:00').getTime()
    const next = recordEvent(emptyStats(), { category: 'wellness', restedMs: 0, completed: false }, now)
    expect(totalSkipped(next.total)).toBe(1)
  })

  it('normalizeDay backfills a missing wellness field', () => {
    const legacy = { short: emptyCategory(), long: emptyCategory(), blink: emptyCategory() }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixed = normalizeDay(legacy as any)
    expect(fixed.wellness).toEqual({ completed: 0, skipped: 0, restedMs: 0 })
  })
})
```

(Ensure `emptyCategory` is imported in the test file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/shared/stats.test.ts`
Expected: FAIL — `wellness` missing on `DayStat`; `normalizeDay` not exported.

- [ ] **Step 3: Implement**

In `src/shared/stats.ts`:

Change the category type:

```ts
export type StatCategory = 'short' | 'long' | 'blink' | 'wellness'
```

Add `wellness` to `DayStat`:

```ts
export interface DayStat {
  short: CategoryStat
  long: CategoryStat
  blink: CategoryStat
  wellness: CategoryStat
}
```

Bump the schema version:

```ts
export const STATS_SCHEMA_VERSION = 2
```

Update `emptyDay`:

```ts
export function emptyDay(): DayStat {
  return {
    short: emptyCategory(),
    long: emptyCategory(),
    blink: emptyCategory(),
    wellness: emptyCategory()
  }
}
```

Update `cloneDay`:

```ts
function cloneDay(d: DayStat): DayStat {
  return {
    short: cloneCategory(d.short),
    long: cloneCategory(d.long),
    blink: cloneCategory(d.blink),
    wellness: cloneCategory(d.wellness)
  }
}
```

Update `aggregateRange` to also fold wellness (add one line inside the loop):

```ts
    addInto(out.blink, d.blink)
    addInto(out.wellness, d.wellness)
```

Update the three totals helpers to include wellness:

```ts
export function totalRestedMs(d: DayStat): number {
  return d.short.restedMs + d.long.restedMs + d.blink.restedMs + d.wellness.restedMs
}

export function totalCompleted(d: DayStat): number {
  return d.short.completed + d.long.completed + d.blink.completed + d.wellness.completed
}

export function totalSkipped(d: DayStat): number {
  return d.short.skipped + d.long.skipped + d.blink.skipped + d.wellness.skipped
}
```

Add `normalizeDay` (used by StatsStore to upgrade legacy buckets):

```ts
/** Fill any missing category on a (possibly legacy) day bucket. */
export function normalizeDay(d: Partial<DayStat> | undefined): DayStat {
  const base = emptyDay()
  if (!d) return base
  return {
    short: { ...base.short, ...d.short },
    long: { ...base.long, ...d.long },
    blink: { ...base.blink, ...d.blink },
    wellness: { ...base.wellness, ...d.wellness }
  }
}
```

- [ ] **Step 4: Wire StatsStore to normalize on read**

In `src/main/StatsStore.ts`, import `normalizeDay` and use it so old buckets (and `total`) gain the `wellness` field:

```ts
import { emptyStats, normalizeDay, recordEvent, type StatEvent, type StatsData } from '../shared/stats'
```

Replace `getAll()`'s return with:

```ts
  getAll(): StatsData {
    const stored = this.store.store
    const days: Record<string, ReturnType<typeof normalizeDay>> = {}
    for (const [k, v] of Object.entries(stored.days ?? {})) days[k] = normalizeDay(v)
    return {
      ...emptyStats(),
      ...stored,
      total: normalizeDay(stored.total),
      days
    }
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/shared/stats.test.ts`
Expected: PASS (existing + new cases).

- [ ] **Step 6: Commit**

```bash
git add src/shared/stats.ts src/shared/stats.test.ts src/main/StatsStore.ts
git commit -m "feat: add wellness category to Insights stats model"
```

---

### Task 4: IPC channels + preload API

**Files:**
- Modify: `src/shared/ipc.ts`
- Modify: `src/preload/index.ts`

**Interfaces:**
- Consumes: `ReminderPresentation` from Task 1.
- Produces:
  - `IPC.reminderShow`, `IPC.reminderAction`, `IPC.takeReminderNow`, `IPC.getReminder`.
  - `type ReminderMode = ReminderPresentation`
  - `interface ReminderPayload { id: string; emoji: string; title: string; message: string; mode: ReminderMode; durationSec: number }`
  - `type ReminderAction = 'complete' | 'skip'`
  - preload: `onReminderShow(cb)`, `getReminder()`, `sendReminderAction(action)`, `takeReminderNow(id)`.

- [ ] **Step 1: Add IPC keys and types**

In `src/shared/ipc.ts`, add the import at top:

```ts
import type { ReminderPresentation } from './reminders'
```

Add keys to the `IPC` object (after the blink/stats keys):

```ts
  reminderShow: 'reminder:show',
  reminderAction: 'reminder:action',
  takeReminderNow: 'reminder:take-now',
  getReminder: 'reminder:get',
```

Add the payload/action types at the end of the file:

```ts
export type ReminderMode = ReminderPresentation

export interface ReminderPayload {
  id: string
  emoji: string
  title: string
  message: string
  mode: ReminderMode
  durationSec: number
}

export type ReminderAction = 'complete' | 'skip'
```

- [ ] **Step 2: Expose the preload API**

In `src/preload/index.ts`, extend the imports:

```ts
import {
  IPC,
  type AppInfo,
  type BreakAction,
  type BreakPayload,
  type ReminderPayload,
  type ReminderAction,
  type StatusPayload
} from '../shared/ipc'
```

Add these entries to the `api` object (after `onStatsUpdate`):

```ts
  onReminderShow: (cb: (p: ReminderPayload) => void): (() => void) => {
    const h = (_e: unknown, p: ReminderPayload): void => cb(p)
    ipcRenderer.on(IPC.reminderShow, h)
    return () => ipcRenderer.removeListener(IPC.reminderShow, h)
  },
  getReminder: (): Promise<ReminderPayload | null> => ipcRenderer.invoke(IPC.getReminder),
  reminderAction: (action: ReminderAction): void => ipcRenderer.send(IPC.reminderAction, action),
  takeReminderNow: (id: string): void => ipcRenderer.send(IPC.takeReminderNow, id)
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc -p tsconfig.node.json --noEmit && npx tsc -p tsconfig.web.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ipc.ts src/preload/index.ts
git commit -m "feat: add reminder IPC channels and preload API"
```

---

### Task 5: Reminder renderer — `src/renderer/reminder/`

**Files:**
- Create: `src/renderer/reminder/index.html`
- Create: `src/renderer/reminder/main.tsx`
- Create: `src/renderer/reminder/index.css`
- Create: `src/renderer/reminder/ReminderScreen.tsx`
- Modify: `electron.vite.config.ts:18-22` (add renderer input)

**Interfaces:**
- Consumes: `ReminderPayload` (Task 4), preload `getReminder`/`onReminderShow`/`reminderAction`.
- Produces: a page rendering banner or overlay per `payload.mode`.

- [ ] **Step 1: Add the renderer input to the build**

In `electron.vite.config.ts`, add `reminder` to the `input` map:

```ts
        input: {
          preferences: resolve('src/renderer/preferences/index.html'),
          break: resolve('src/renderer/break/index.html'),
          blink: resolve('src/renderer/blink/index.html'),
          reminder: resolve('src/renderer/reminder/index.html')
        }
```

- [ ] **Step 2: Create the HTML entry**

```html
<!-- src/renderer/reminder/index.html -->
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EyeProtector — Reminder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create the CSS (transparent body so banner/overlay fill their window)**

```css
/* src/renderer/reminder/index.css */
@import 'tailwindcss';

html,
body,
#root {
  margin: 0;
  height: 100%;
  background: transparent;
  overflow: hidden;
}
```

- [ ] **Step 4: Create the React entry**

```tsx
// src/renderer/reminder/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ReminderScreen } from './ReminderScreen'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReminderScreen />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create the screen (banner + overlay modes)**

```tsx
// src/renderer/reminder/ReminderScreen.tsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReminderPayload } from '../../shared/ipc'

export function ReminderScreen(): JSX.Element | null {
  const [payload, setPayload] = useState<ReminderPayload | null>(null)

  useEffect(() => {
    // Pull in case the push fired before this listener mounted.
    window.eyeprotector.getReminder().then((p) => p && setPayload(p))
    return window.eyeprotector.onReminderShow(setPayload)
  }, [])

  // Overlay mode: ESC skips (renderer has focus in the fullscreen window's
  // absence is handled by the main global shortcut too; this is a fallback).
  useEffect(() => {
    if (!payload || payload.mode !== 'overlay') return
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.eyeprotector.reminderAction('skip')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [payload])

  if (!payload) return null

  const done = (): void => window.eyeprotector.reminderAction('complete')
  const skip = (): void => window.eyeprotector.reminderAction('skip')

  if (payload.mode === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          className="flex h-full w-full items-center gap-3 rounded-2xl px-4 py-3 text-white select-none"
          style={{
            background: 'linear-gradient(120deg, #4338CA 0%, #6D28D9 60%, #0F766E 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28 }}
        >
          <span className="text-3xl leading-none">{payload.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{payload.title}</p>
            {payload.message && (
              <p className="truncate text-[12px] text-white/75">{payload.message}</p>
            )}
          </div>
          <button
            className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/30"
            onClick={done}
          >
            Done
          </button>
          <button
            aria-label="Dismiss"
            className="shrink-0 rounded-full px-1 text-white/60 transition hover:text-white"
            onClick={skip}
          >
            ✕
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // overlay mode
  return (
    <AnimatePresence>
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center text-white select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 30%, #4338CA, transparent 55%), radial-gradient(circle at 70% 70%, #0f766e, transparent 55%), linear-gradient(#0b1220, #0b1220)'
          }}
        />
        <div className="text-7xl">{payload.emoji}</div>
        <h1 className="mt-6 text-3xl font-semibold">{payload.title}</h1>
        {payload.message && <p className="mt-3 text-white/70">{payload.message}</p>}
        <div className="mt-10 flex gap-4">
          <button
            className="rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
            onClick={skip}
          >
            Skip
          </button>
          <button
            className="rounded-full bg-white/25 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/40"
            onClick={done}
          >
            Done
          </button>
        </div>
        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
          esc to skip
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 6: Verify the renderer builds**

Run: `npx electron-vite build`
Expected: build succeeds and emits a `reminder` renderer bundle (check `out/renderer` contains a `reminder` entry). If the project uses a dev-only flow, run `npx tsc -p tsconfig.web.json --noEmit` instead and confirm no errors.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/reminder electron.vite.config.ts
git commit -m "feat: reminder renderer with banner and overlay modes"
```

---

### Task 6: `ReminderPresenter` — window + recording — `src/main/ReminderPresenter.ts`

**Files:**
- Create: `src/main/ReminderPresenter.ts`
- Modify: `src/main/BlinkOverlay.ts` (add `isVisible()`)

**Interfaces:**
- Consumes: `ReminderPayload`, `ReminderAction`, `IPC` (Task 4).
- Produces:
  - `class ReminderPresenter` with:
    - `show(payload: ReminderPayload, opts?: { record?: boolean }): void`
    - `getCurrent(): ReminderPayload | null`
    - `isVisible(): boolean`
    - `handleAction(action: ReminderAction): void`
    - `onRecord: ((e: { restedMs: number; completed: boolean }) => void) | null`
  - `BlinkOverlay.isVisible(): boolean`

- [ ] **Step 1: Add `isVisible()` to BlinkOverlay**

In `src/main/BlinkOverlay.ts`, add a method (e.g. after `show`):

```ts
  isVisible(): boolean {
    return this.frostWin !== null || this.faceWin !== null
  }
```

- [ ] **Step 2: Implement the presenter**

```ts
// src/main/ReminderPresenter.ts
import { BrowserWindow, globalShortcut, screen } from 'electron'
import { join } from 'path'
import { IPC, type ReminderAction, type ReminderPayload } from '../shared/ipc'

const BANNER_W = 380
const BANNER_H = 96
const BANNER_MARGIN = 24

/**
 * Renders a wellness reminder as either a bottom-right banner (non-blocking,
 * auto-dismiss) or a full-screen overlay (screen-saver level, ESC-to-skip),
 * mirroring OverlayManager/BlinkOverlay. Records the outcome once via onRecord.
 */
export class ReminderPresenter {
  private win: BrowserWindow | null = null
  private current: ReminderPayload | null = null
  private timer: NodeJS.Timeout | null = null
  private escRegistered = false
  private closing = false
  private session: { shownAt: number; plannedMs: number; mode: string; record: boolean } | null =
    null

  onRecord: ((e: { restedMs: number; completed: boolean }) => void) | null = null

  getCurrent(): ReminderPayload | null {
    return this.current
  }

  isVisible(): boolean {
    return this.win !== null
  }

  show(payload: ReminderPayload, opts: { record?: boolean } = {}): void {
    if (this.win) this.destroy()
    this.current = payload
    this.closing = false
    this.session = {
      shownAt: Date.now(),
      plannedMs: payload.durationSec * 1000,
      mode: payload.mode,
      record: opts.record ?? false
    }

    const primary = screen.getPrimaryDisplay()
    const isBanner = payload.mode === 'banner'
    const area = primary.workArea

    const win = new BrowserWindow({
      x: isBanner ? area.x + area.width - BANNER_W - BANNER_MARGIN : primary.bounds.x,
      y: isBanner ? area.y + area.height - BANNER_H - BANNER_MARGIN : primary.bounds.y,
      width: isBanner ? BANNER_W : primary.bounds.width,
      height: isBanner ? BANNER_H : primary.bounds.height,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      alwaysOnTop: true,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    win.setAlwaysOnTop(true, 'screen-saver')
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    win.on('closed', () => {
      if (this.win === win) this.win = null
    })

    const load = process.env['ELECTRON_RENDERER_URL']
      ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/reminder/index.html`)
      : win.loadFile(join(__dirname, '../renderer/reminder/index.html'))
    load.then(() => win.webContents.send(IPC.reminderShow, payload))
    win.showInactive()
    this.win = win

    // Overlay is dismissible with ESC (a global shortcut, since the window
    // never takes focus — same technique as breaks/blink).
    if (!isBanner) {
      globalShortcut.register('Escape', () => this.handleAction('skip'))
      this.escRegistered = true
    }

    // Auto-end: overlay auto-completes (you rested); banner auto-dismisses as
    // skipped (an ignored nudge).
    const ms = payload.durationSec * 1000
    this.timer = setTimeout(() => this.close(isBanner ? 'skipped' : 'completed'), ms)
  }

  handleAction(action: ReminderAction): void {
    this.close(action === 'complete' ? 'completed' : 'skipped')
  }

  private close(reason: 'completed' | 'skipped'): void {
    if (this.closing || !this.win) return
    this.closing = true
    this.recordSession(reason)
    this.destroy()
  }

  private recordSession(reason: 'completed' | 'skipped'): void {
    const s = this.session
    this.session = null
    if (!s || !s.record) return
    const completed = reason === 'completed'
    // Banners aren't measured rest; overlays record actual on-screen time.
    const restedMs =
      s.mode === 'overlay'
        ? completed
          ? s.plannedMs
          : Math.min(s.plannedMs, Math.max(0, Date.now() - s.shownAt))
        : 0
    this.onRecord?.({ restedMs, completed })
  }

  private destroy(): void {
    if (this.escRegistered) {
      globalShortcut.unregister('Escape')
      this.escRegistered = false
    }
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.win && !this.win.isDestroyed()) this.win.close()
    this.win = null
    this.current = null
    this.closing = false
  }
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/main/ReminderPresenter.ts src/main/BlinkOverlay.ts
git commit -m "feat: reminder presenter for banner + overlay windows"
```

---

### Task 7: `ReminderController` — scheduling — `src/main/ReminderController.ts`

**Files:**
- Create: `src/main/ReminderController.ts`

**Interfaces:**
- Consumes: `SettingsStore`, `ReminderPresenter` (Task 6), `dueReminders`/`Reminder` (Task 1), `ReminderPayload` (Task 4).
- Produces:
  - `class ReminderController` with `start()`, `stop()`, `triggerNow(id: string): void`.

- [ ] **Step 1: Implement the controller**

```ts
// src/main/ReminderController.ts
import { dueReminders, type Reminder } from '../shared/reminders'
import type { SettingsStore } from './SettingsStore'
import type { ReminderPresenter } from './ReminderPresenter'
import type { ReminderPayload } from '../shared/ipc'

/**
 * Drives N independent wellness reminders on one 1s ticker (like
 * BlinkController). Each reminder keeps its own nextAt; a due reminder fires
 * only when the screen is free (no break/blink/other reminder), otherwise it
 * simply comes due again next tick. At most one reminder fires per tick.
 */
export class ReminderController {
  private ticker: NodeJS.Timeout | null = null
  private nextAt: Record<string, number> = {}

  constructor(
    private settings: SettingsStore,
    private presenter: ReminderPresenter,
    private isScreenBusy: () => boolean = () => false
  ) {
    this.settings.onChange(() => this.reconcile(Date.now()))
  }

  start(): void {
    this.reconcile(Date.now())
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  /** Seed nextAt for new reminders; drop removed ones; keep existing timers. */
  private reconcile(now: number): void {
    const reminders = this.settings.get().reminders
    const next: Record<string, number> = {}
    for (const r of reminders) {
      next[r.id] = this.nextAt[r.id] ?? now + r.intervalMin * 60_000
    }
    this.nextAt = next
  }

  private tick(): void {
    const now = Date.now()
    const reminders = this.settings.get().reminders
    const due = dueReminders(reminders, this.nextAt, now)
    if (due.length === 0) return
    // Reschedule every due reminder regardless of whether we can show it now,
    // so a suppressed reminder doesn't fire in a burst once the screen frees.
    for (const id of due) {
      const r = reminders.find((x) => x.id === id)
      if (r) this.nextAt[id] = now + r.intervalMin * 60_000
    }
    if (this.isScreenBusy()) return
    const r = reminders.find((x) => x.id === due[0])
    if (r) this.presenter.show(this.toPayload(r), { record: true })
  }

  /** Preview from the prefs page — manual, excluded from Insights. */
  triggerNow(id: string): void {
    if (this.isScreenBusy()) return
    const r = this.settings.get().reminders.find((x) => x.id === id)
    if (r) this.presenter.show(this.toPayload(r), { record: false })
  }

  private toPayload(r: Reminder): ReminderPayload {
    return {
      id: r.id,
      emoji: r.emoji,
      title: r.title,
      message: r.message,
      mode: r.presentation,
      durationSec: r.durationSec
    }
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/main/ReminderController.ts
git commit -m "feat: reminder controller scheduling N reminders on a 1s ticker"
```

---

### Task 8: Wire the subsystem into `src/main/index.ts`

**Files:**
- Modify: `src/main/index.ts`

**Interfaces:**
- Consumes: `ReminderPresenter` (Task 6), `ReminderController` (Task 7), IPC keys (Task 4).
- Produces: a running reminder subsystem; blink + reminders share one busy check.

- [ ] **Step 1: Add imports**

After the existing controller imports in `src/main/index.ts`:

```ts
import { ReminderPresenter } from './ReminderPresenter'
import { ReminderController } from './ReminderController'
```

And extend the `ipc` type import to include the reminder action type:

```ts
import { IPC, type BreakAction, type ReminderAction, type StatusPayload } from '../shared/ipc'
```

- [ ] **Step 2: Instantiate the presenter and a shared busy check**

Inside `app.whenReady().then(...)`, after `blinkOverlay` is created and its `onRecord` set, add:

```ts
  const reminderPresenter = new ReminderPresenter()
  reminderPresenter.onRecord = (r) => stats.record({ category: 'wellness', ...r })

  // One busy predicate shared by blink + reminders so overlays never stack.
  const isScreenBusy = (): boolean =>
    overlay.getCurrentPayload() !== null || blinkOverlay.isVisible() || reminderPresenter.isVisible()
```

- [ ] **Step 3: Use the shared busy check for blink and reminders**

Replace the `blinkController` construction's third argument with `isScreenBusy`:

```ts
  const blinkController = new BlinkController(settings, blinkOverlay, isScreenBusy)
  const reminderController = new ReminderController(settings, reminderPresenter, isScreenBusy)
```

(The old inline `() => overlay.getCurrentPayload() !== null` is replaced by `isScreenBusy`.)

- [ ] **Step 4: Register the reminder IPC handlers**

Alongside the other `ipcMain` registrations:

```ts
  ipcMain.handle(IPC.getReminder, () => reminderPresenter.getCurrent())
  ipcMain.on(IPC.reminderAction, (_e, action: ReminderAction) => reminderPresenter.handleAction(action))
  ipcMain.on(IPC.takeReminderNow, (_e, id: string) => reminderController.triggerNow(id))
```

- [ ] **Step 5: Start the controller**

Where `controller.start()` and `blinkController.start()` are called, add:

```ts
  reminderController.start()
```

- [ ] **Step 6: Verify + run the app**

Run: `npx tsc -p tsconfig.node.json --noEmit`
Expected: no errors.

Then run the app (`npm run dev` or the project's dev script). Verify: preferences opens, breaks/blinks still work. (Reminder UI comes in Task 9; to smoke-test now, temporarily lower a preset interval via `stats.json`/settings or wait — full verification happens after Task 9.)

- [ ] **Step 7: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: wire reminder controller/presenter into main process"
```

---

### Task 9: Preferences — Reminders page + sidebar + routing

**Files:**
- Create: `src/renderer/preferences/pages/RemindersPage.tsx`
- Modify: `src/renderer/preferences/components/Sidebar.tsx` (glyph + item + PageId)
- Modify: `src/renderer/preferences/App.tsx` (route + title)

**Interfaces:**
- Consumes: `AppSettings`, `Reminder`, reminder helpers/constants (Task 1), preload `takeReminderNow`.
- Produces: a `'reminders'` `PageId` and its page.

- [ ] **Step 1: Add the sidebar item**

In `src/renderer/preferences/components/Sidebar.tsx`:

Extend `PageId`:

```ts
export type PageId = 'general' | 'breaks' | 'blink' | 'reminders' | 'insights' | 'about'
```

Add a glyph constant (near the others):

```tsx
const GLYPH_BELL = (
  <path
    d="M8 2.2a3.2 3.2 0 0 0-3.2 3.2c0 3.4-1 4.4-1.4 4.9-.2.2-.05.6.25.6h8.8c.3 0 .45-.4.25-.6-.4-.5-1.4-1.5-1.4-4.9A3.2 3.2 0 0 0 8 2.2zm0 11.6a1.6 1.6 0 0 0 1.5-1.1h-3A1.6 1.6 0 0 0 8 13.8z"
    fill="currentColor"
  />
)
```

Add the item to the "Productivity & Care" section, after `blink` (before `insights`):

```tsx
      { id: 'reminders', label: 'Reminders', color: '#FF375F', glyph: GLYPH_BELL },
```

- [ ] **Step 2: Route it in App.tsx**

In `src/renderer/preferences/App.tsx`, import the page:

```ts
import { RemindersPage } from './pages/RemindersPage'
```

Add the title:

```ts
  blink: 'Blink Reminders',
  reminders: 'Reminders',
  insights: 'Insights',
```

Add the route (after the `blink` line):

```tsx
          {page === 'reminders' && <RemindersPage settings={settings} update={update} />}
```

- [ ] **Step 3: Create the page**

```tsx
// src/renderer/preferences/pages/RemindersPage.tsx
import { Card, Row, Switch, SelectField, NumberSelect, COLORS, fmtMinutes, fmtSeconds } from '../components/controls'
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
        Gentle nudges for hydration, posture, and movement. Each can appear as a corner
        banner or a full-screen overlay. Only scheduled reminders count toward Insights.
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
                presets={r.presentation === 'overlay' ? OVERLAY_DURATION_OPTIONS : BANNER_DURATION_OPTIONS}
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
```

- [ ] **Step 4: Verify + run**

Run: `npx tsc -p tsconfig.web.json --noEmit`
Expected: no errors.

Run the app. Verify: the **Reminders** sidebar item appears; editing a reminder persists (reopen prefs); **Play demo** on a banner reminder shows a bottom-right banner that auto-dismisses; **Play demo** on the "Stand up" overlay reminder shows a full-screen overlay dismissible by ESC/Skip/Done; **Add reminder** appends a card; **Delete** removes a custom one; **Reset** restores a preset.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/preferences/pages/RemindersPage.tsx src/renderer/preferences/components/Sidebar.tsx src/renderer/preferences/App.tsx
git commit -m "feat: reminders preferences page with per-reminder config"
```

---

### Task 10: Insights — Wellness row

**Files:**
- Modify: `src/renderer/preferences/pages/InsightsPage.tsx`

**Interfaces:**
- Consumes: the `wellness` category on `DayStat` (Task 3).
- Produces: a Wellness row in the breakdown; `hasAnyData` counts wellness.

- [ ] **Step 1: Include wellness in `hasAnyData`**

In `src/renderer/preferences/pages/InsightsPage.tsx` line ~66, extend the guard:

```ts
  const hasAnyData =
    shownCount(data.total.short) +
      shownCount(data.total.long) +
      shownCount(data.total.blink) +
      shownCount(data.total.wellness) >
    0
```

- [ ] **Step 2: Add the Wellness breakdown row**

The breakdown is driven by the `CATEGORY_META` array (lines ~19-22), whose `map` (line ~159) indexes `view[meta.id]`. Add a wellness entry after `blink`:

```ts
const CATEGORY_META: { id: StatCategory; label: string; color: string }[] = [
  { id: 'short', label: 'Short breaks', color: '#30B0C7' },
  { id: 'long', label: 'Long breaks', color: '#5E5CE6' },
  { id: 'blink', label: 'Blink reminders', color: '#007AFF' },
  { id: 'wellness', label: 'Wellness', color: '#FF375F' }
]
```

Because the row `map` already keys off `meta.id` and `StatCategory` now includes `'wellness'` (Task 3), no other change to the table is needed.

- [ ] **Step 3: Verify + run**

Run: `npx tsc -p tsconfig.web.json --noEmit`
Expected: no errors.

Run the app. Trigger a scheduled reminder (set a preset interval to its minimum and wait, or leave a banner to auto-dismiss and click Done on another). Open **Insights**: the **Wellness** row shows shown/completed/skipped, and the "Skipped" hero card and "Total rest" reflect wellness.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/preferences/pages/InsightsPage.tsx
git commit -m "feat: show Wellness row in Insights breakdown"
```

---

## Self-Review

**Spec coverage:**
- Data model (`reminders.ts`, presets, custom, validation) → Task 1. ✓
- Settings field + migration → Task 2. ✓
- `wellness` stats category + StatsStore merge → Task 3. ✓
- IPC/preload channels → Task 4. ✓
- Banner + overlay renderer → Task 5. ✓
- Presenter (window creation, recording semantics, banner=skip / overlay=complete auto-end) → Task 6. ✓
- Controller (N reminders, suppression, triggerNow) → Task 7. ✓
- Wiring + shared busy check + onRecord→stats → Task 8. ✓
- Reminders prefs page (full config, add/delete/reset, play demo) → Task 9. ✓
- Insights Wellness row + hasAnyData → Task 10. ✓
- Recording semantics (banner Done=completed / auto-dismiss=skipped, restedMs 0; overlay like breaks) → Task 6 `recordSession`. ✓

**Type consistency:** `Reminder`/`ReminderPresentation` (Task 1) used identically in settings (2), ipc (4), presenter (6), controller (7), page (9). `ReminderPayload`/`ReminderAction` defined in Task 4, consumed by preload (4), renderer (5), presenter (6), controller (7), index (8). `dueReminders` signature matches between Task 1 definition and Task 7 use. `normalizeDay` defined in Task 3, used in Task 3 StatsStore. `isVisible()` added to BlinkOverlay (6) and used in index (8). `getCurrent()`/`isVisible()`/`handleAction()`/`show()` signatures on `ReminderPresenter` match between Task 6 and Tasks 7–8.

**Placeholder scan:** No TBD/TODO. Task 10 Step 2 gives concrete alternatives because the exact breakdown-row shape must be read from the file at implementation time; both branches specify exact values (`view.wellness`, label `Wellness`, tint `#FF375F`).

**Note for the implementer:** verified against the repo — `tsconfig.node.json` and `tsconfig.web.json` exist, and `package.json` provides `npm run typecheck` (runs both) and `npm test` (`vitest run`). You may use those scripts in place of the per-file commands.

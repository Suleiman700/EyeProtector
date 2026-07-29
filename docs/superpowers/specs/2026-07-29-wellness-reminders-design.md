# Wellness Reminders + Reminder Framework — Design Spec

**Date:** 2026-07-29
**Status:** Approved, implementing

## Goal

Add user-configurable **wellness reminders** (hydration, posture, stand-up, plus fully
custom ones) that fire on independent intervals and appear either as a gentle corner
**banner** or a **full-screen overlay**. This is the first of several planned feature
sub-projects; it also establishes a small, reusable reminder subsystem that future
reminder types can build on.

## Scope note

This spec is sub-project **#1 (reminder framework) + #2 (wellness reminders)** from the
feature decomposition. The remaining sub-projects — multi-monitor overlays, smart pause,
smart snooze, global keyboard shortcuts, streaks & goals — are **out of scope here** and
get their own specs.

## Decisions (confirmed with author)

- **Presentation:** per-reminder choice of `banner` (non-blocking corner toast, auto-dismiss)
  or `overlay` (full-screen, same technique as breaks).
- **Customization:** ship three presets (Hydration, Posture, Stand up) AND let users create
  their own reminders (custom emoji, title, message, interval, presentation, duration).
  Presets can be disabled/reset but not deleted; custom reminders can be deleted.
- **Insights:** track all scheduled reminders, aggregated into a single **Wellness** category
  (not one row per reminder). Manual "Play demo" is excluded, matching breaks/blinks.
- **Recording semantics:**
  - overlay reminder → Done = completed (`restedMs` = clamped time on screen), Skip/ESC =
    skipped. Identical to breaks.
  - banner reminder → **Done = completed; auto-dismiss or close = skipped**, `restedMs` = 0
    (a nudge, not measured rest). Chosen as an honest compliance signal over the generous
    "auto-dismiss = completed" alternative.

## Approach — do NOT rewrite Break/Blink

Break and Blink are working, tested, and each has quirks (scheduler pairing; the blink
mascot's two-window frost). Refactoring them into a unified engine buys nothing functional
and risks regressions. Instead, wellness reminders are a **self-contained parallel
subsystem** that borrows existing patterns (a 1s-tick controller like `BlinkController`, a
presenter like `OverlayManager`). The "framework" is that this one subsystem drives *N*
configurable reminders in two presentation modes. Break/Blink stay untouched.

## Data Model — `src/shared/reminders.ts` (pure, unit-tested)

```ts
export type ReminderPresentation = 'banner' | 'overlay'

export interface Reminder {
  id: string              // stable; presets use fixed ids ('hydration', 'posture', 'standup')
  emoji: string           // customizable
  title: string           // customizable
  message: string         // customizable
  intervalMin: number
  presentation: ReminderPresentation
  durationSec: number     // banner: auto-dismiss seconds; overlay: on-screen seconds
  enabled: boolean
  preset: boolean         // shipped presets: cannot delete, only disable/reset
}
```

`AppSettings` gains `reminders: Reminder[]`. `DEFAULT_SETTINGS.reminders` = the three presets:

| id | emoji | title | message | interval | presentation | duration |
|----|-------|-------|---------|----------|--------------|----------|
| hydration | 💧 | Time to hydrate | Take a sip of water | 45 min | banner | 8 s |
| posture | 🪑 | Check your posture | Sit up straight, relax your shoulders | 30 min | banner | 8 s |
| standup | 🚶 | Stand up & stretch | Get up and move for a moment | 60 min | overlay | 30 s |

Pure helpers (all deterministic, `now` passed in — no internal clock):
- `defaultReminders(): Reminder[]`
- `makeCustomReminder(seed?): Reminder` — a fresh custom reminder with a generated id and
  sensible defaults (`preset: false`). Id generation takes a uniqueness source from the
  caller (e.g. existing ids + an index) so the module stays pure — no `Math.random`.
- `validateReminder(r): Reminder` — clamps `intervalMin` (1–240), `durationSec` (banner
  3–30, overlay 10–600), trims text, forces non-empty title (falls back to a default).
- `dueReminders(reminders, nextAt: Record<id, number>, now): string[]` — ids of enabled
  reminders whose `nextAt` has passed. Pure; the controller owns the `nextAt` map and
  suppression.

Interval option lists reuse the iOS-style select pattern already used for breaks.

## Scheduling & Interaction — `src/main/ReminderController.ts`

Mirrors `BlinkController`:
- One 1s `setInterval`; a `Map<id, nextAt>` seeded on start and on settings change (new
  reminders scheduled, removed ones dropped; unchanged ids keep their `nextAt`).
- `tick()`: compute `dueReminders(...)`. For each due id, if **no** break, blink, or other
  reminder is currently on screen, fire it via the presenter and set `nextAt = now +
  interval`. **Never stacks** — if the screen is busy, the reminder is skipped this cycle
  and simply comes due again next tick (same suppression pattern Blink uses). At most one
  reminder fires per tick.
- Busy check is injected: `isScreenBusy: () => boolean` composed in `index.ts` from
  `overlay.getCurrentPayload() !== null`, the blink overlay's visibility, and the presenter's
  own "a reminder is showing" flag.
- `triggerNow(id)`: manual demo — shows the reminder with `record: false`, does not touch
  its schedule.

## Presentation — `src/main/ReminderPresenter.ts` + `src/renderer/reminder/`

One presenter class, one renderer, `mode` carried in the payload. Tracks whether a reminder
is currently visible (for the busy check) and records the outcome exactly once (a `closing`
guard, like `BlinkOverlay`).

**banner mode:** a small (~360×96) always-on-top, non-focusable, non-click-blocking window
positioned bottom-right of the primary display's work area; fades in. Content: emoji, title,
message, **Done** button. Auto-dismiss after `durationSec`. Done → completed; auto-dismiss
or clicking the close affordance → skipped. `restedMs` = 0.

**overlay mode:** full-screen window at screen-saver level (same construction as
`OverlayManager`: display-bounds window, `showInactive`, `setVisibleOnAllWorkspaces`).
Content: emoji, title, message, **Skip / Done**. ESC-to-skip via a global shortcut held
while visible (same as breaks/blink). Done → completed (`restedMs` = clamped time on
screen); Skip/ESC → skipped.

`onRecord?: (e: { restedMs; completed }) => void` is set in `index.ts` to
`stats.record({ category: 'wellness', ...e })`, but only for scheduled shows (`record: true`).

## Insights — `src/shared/stats.ts`

- `StatCategory` gains `'wellness'`.
- `DayStat` gains a `wellness: CategoryStat` field.
- `emptyDay`, `cloneDay`, `aggregateRange`, `totalRestedMs`, `totalCompleted`,
  `totalSkipped` all include `wellness`.
- `STATS_SCHEMA_VERSION` bumped to 2.
- `StatsStore` read-merge fills a missing `wellness` field on `total` and each day bucket
  (mirrors the `SettingsStore` merge-over-defaults approach) so older `stats.json` files
  stay valid.
- `InsightsPage` breakdown table gains a **Wellness** row. Hero cards/totals that go through
  the `total…` helpers pick up `wellness` automatically, but the `hasAnyData` guard (which
  hardcodes short/long/blink) must be extended to include `wellness`.

## IPC / Preload — `src/shared/ipc.ts`, `src/preload/index.ts`

Reuse `getSettings` / `setSettings` for reminder config. Add:
- `reminderShow: 'reminder:show'` — main → reminder window (payload: id, emoji, title,
  message, mode, durationSec).
- `reminderAction: 'reminder:action'` — reminder window → main (`'complete' | 'skip'`).
- `takeReminderNow: 'reminder:take-now'` — prefs → main (per-card **Play demo**), carries the
  reminder id.

Preload exposes `onReminderShow(cb)`, `sendReminderAction(action)`, `takeReminderNow(id)`.

## Preferences UI — `src/renderer/preferences/pages/RemindersPage.tsx`

New sidebar item **Reminders** in the "Productivity & Care" section (new glyph, distinct
color), `PageId` `'reminders'`, wired in `App.tsx` + `PAGE_TITLES` + `Sidebar.tsx`.

- A card per reminder: enable toggle, interval select, presentation select, duration select,
  editable emoji + title + message, **Play demo**, and **Delete** (custom) / **Reset**
  (preset).
- **+ Add reminder** button appends a custom reminder (`makeCustomReminder`) and persists via
  `setSettings({ reminders })`.
- Empty-state copy when all reminders are disabled.
- Reuses `Card`, `COLORS`, `SF_FONT`, and the existing iOS-style select components.

## Testing

`src/shared/reminders.test.ts` (Vitest):
- `dueReminders` — none due, one due, several due, disabled excluded, `nextAt` in the future.
- `validateReminder` — interval/duration clamping per mode, text trimming, empty-title fallback.
- `defaultReminders` — three presets, correct ids/flags.

`src/shared/stats.test.ts`: extend existing cases to cover the `wellness` category in
`recordEvent`, `aggregateRange`, and the `total…` helpers.

Presenter behavior, banner positioning, overlay/ESC, and live prefs updates verified by
running the app.

## Files

**New:** `src/shared/reminders.ts`, `src/shared/reminders.test.ts`,
`src/main/ReminderController.ts`, `src/main/ReminderPresenter.ts`,
`src/renderer/reminder/index.html`, `src/renderer/reminder/App.tsx` (+ entry).

**Edit:** `src/shared/settings.ts`, `src/shared/stats.ts`, `src/main/StatsStore.ts`,
`src/shared/ipc.ts`, `src/preload/index.ts`, `src/main/index.ts`,
`src/renderer/preferences/App.tsx`, `src/renderer/preferences/components/Sidebar.tsx`,
`src/renderer/preferences/pages/RemindersPage.tsx` (new),
`src/renderer/preferences/pages/InsightsPage.tsx`. Build config
(`electron.vite.config`) gains the new `reminder` renderer entry.

## Out of Scope

- Rewriting Break/Blink into a unified engine.
- Multi-monitor reminder coverage (banner/overlay show on the primary display only for now).
- Per-reminder Insights rows, streaks/goals, CSV export.
- Smart pause, smart snooze, global keyboard shortcuts (separate specs).

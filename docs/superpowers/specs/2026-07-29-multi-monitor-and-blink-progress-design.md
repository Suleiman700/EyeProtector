# Multi-Monitor Overlays + Blink Progress Bar — Design Spec

**Date:** 2026-07-29
**Status:** Approved, implementing

## Goals

1. **Multi-monitor:** break overlay, blink overlay, and reminders (overlay + banner) appear on
   **every** connected display, not just the primary/active one.
2. **Blink progress bar:** the blink screen shows a slim bar animating 100% → 0% over the blink
   duration, in sync with auto-dismiss.

## Decisions (confirmed with author)

- Full UI on every monitor (ring / mascot / countdown / reminder content everywhere), not a
  plain dimmed cover on secondaries.
- Applies to breaks, blink, and reminders.
- Displays enumerated at show-time; mid-overlay hot-plug is not handled (rare).
- To avoid duplicate events with N windows, only the **primary display's** window drives
  side-effects (chime + auto-complete / blinkDone). ESC and auto-end already live in the main
  process (single global shortcut / single timer), so they fire once regardless.

## Multi-monitor architecture

Each window manager creates one window per `screen.getAllDisplays()` instead of one for
`getPrimaryDisplay()`, tracked as an array, and closes/fades them together.

### `OverlayManager` (breaks)
- `private wins: BrowserWindow[]`. `show(payload)` builds a window per display at
  `display.bounds`; sends `breakStart` with `{ ...payload, primary }` where
  `primary = display.id === primaryId`. ESC global shortcut registered once (non-strict).
- `BreakPayload` gains `primary: boolean`. `BreakScreen` gates the auto-complete timer **and**
  the chime to `payload.primary`; Skip/Postpone buttons still send from any window (idempotent
  in the controller).
- `close()` unregisters ESC and closes all windows. `getCurrentPayload()` unchanged.

### `BlinkOverlay`
- `frostWins: BrowserWindow[]`, `faceWins: BrowserWindow[]`. `show()` builds a frost+face pair
  per display; the face URL carries `?primary=1` only on the primary display. One safety
  timeout, one ESC registration, one `recordSession` (guarded by `closing`). `isVisible()` →
  `frostWins.length > 0 || faceWins.length > 0`. Fades and `destroy()` iterate all windows.
- `BlinkScreen` reads `?primary=1`; only the primary window plays the chime and fires
  `blinkDone`. The blink animation and progress bar run on all windows.

### `ReminderPresenter`
- `private wins: BrowserWindow[]`. `show()` builds a window per display: banner mode →
  bottom-right of each display's `workArea`; overlay mode → each display's `bounds`. Sends
  `reminderShow` to each. One ESC registration (overlay), one auto-end timer, one
  `recordSession`. `isVisible()` → `wins.length > 0`. `getCurrent()` unchanged.

## Blink progress bar

`BlinkScreen` adds a fixed-width track (~240px, matching the mascot) with a fill that animates
from `100%` to `0%` over `durationSec` using a Framer Motion tween
(`initial={{ width: '100%' }}` → `animate={{ width: 0 }}`, `transition={{ duration, ease:
'linear' }}`). It reads `durationSec` from settings (already fetched for the auto-dismiss
timer), so bar and dismissal stay in sync. Runs on every screen; primary still owns the actual
`blinkDone`.

## Testing

Window/display behavior is Electron side-effect code, verified by running the app on a
multi-display setup: overlays/toasts on all screens; a single chime; break completes/records
once; blink records once; ESC dismisses all; the blink bar drains smoothly to empty as the
reminder ends. No new pure logic to unit-test (existing 38 tests must stay green;
`BreakPayload.primary` is additive).

## Files

**Edit:** `src/shared/ipc.ts` (`BreakPayload.primary`), `src/main/OverlayManager.ts`,
`src/main/BlinkOverlay.ts`, `src/main/ReminderPresenter.ts`,
`src/renderer/break/BreakScreen.tsx`, `src/renderer/blink/BlinkScreen.tsx`.

## Out of scope

- Mid-overlay display hot-plug re-layout.
- Per-display independent schedules / choosing which monitors participate.

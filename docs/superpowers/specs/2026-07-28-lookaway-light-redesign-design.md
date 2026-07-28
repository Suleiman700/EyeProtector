# LookAway-Style Light Preferences Redesign

**Date:** 2026-07-28
**Scope:** Preferences window redesign (sidebar + pages), plus wiring three already-defined settings (autostart, sound, preBreakWarningSec) in the main process. Separate follow-up: fix break-screen skip/ESC.

## Goal

Replace the single-column iOS grouped list with a LookAway-style two-pane preferences window — left sidebar navigation, right content area with feature cards (gradient hero, control rows, Play demo) — rendered in **light mode**.

## Shell & Window

- Prefs window resized to **980×700** (min 900×640), `titleBarStyle: 'hiddenInset'` so traffic lights float over the sidebar.
- Left sidebar **~230px**, light gray `#F2F2F7`; right content area `#FAFAFA` with generous padding; hairline divider between panes.
- Sidebar items: iOS-Settings-style colored rounded-square icon (20×20, white glyph) + 13px label; selected item = subtle gray pill `rgba(120,120,128,0.16)`.
- Section headers (11px, uppercase, gray): *Productivity & Care*, *EyeProtector*.

## Sidebar → Pages

| Item | Icon color | Page |
|---|---|---|
| General | gray gear | autostart, sounds, pre-break warning |
| Breaks | teal | Short + Long break cards side-by-side |
| Blink Reminders | blue | Blink card |
| About | orange info | app info |

Active page held in `useState` (no router).

## Feature Card (shared component)

Matches the image, light mode:
- Title (15px semibold) + 2-line gray description above the card.
- **Gradient hero** (~140px, 12px radius): CSS gradient — teal→blue for Short Break, pink→purple for Long Break, cyan→violet for Blink — with a centered circular outline icon (arrow-up for long/get-up, closed-eyes face for blink, eye for short).
- White rows card below hero: control rows with hairline separators (Switch / stepper / select per feature).
- Right-aligned **Play demo** button (gray pill, play glyph) under the card → `takeBreakNow` / `takeBlinkNow`.

### Rows per card
- **Short Break:** Strict toggle · Show every (min stepper) · Duration (sec stepper) · Play demo.
- **Long Break:** same rows for `long`.
- **Blink:** Enabled toggle · Show every (min stepper) · Duration (existing 2–15s Radix Select) · Play demo. Footer note: "Blink reminders are not shown during breaks."

## General Page

Grouped white cards (iOS style, reusing Row):
- **Launch at Login** toggle → `settings.autostart`, applied in main via `app.setLoginItemSettings({ openAtLogin })` on startup and on change.
- **Sounds** toggle + **volume slider** (Radix Slider, blue track) → `settings.sound`. Main process plays a soft chime when a break or blink overlay appears (only if enabled; volume applied). Implementation: hidden/utility playback via the overlay renderer (WebAudio in overlay page using payload-passed sound config — no new native deps).
- **Pre-break warning** stepper (seconds) → `settings.preBreakWarningSec` (exposed in UI; scheduler use unchanged for now).
- Status pill "Next break mm:ss" at top of content header.

## About Page

Centered app icon (gradient circle w/ eye glyph), name, version (`app.getVersion()` via new IPC or `process.env`), short line, Quit button (`app.quit()` via existing tray path → add IPC `app:quit`).

## Components

- `Sidebar.tsx`, `pages/{General,Breaks,Blink,About}.tsx`, `components/{FeatureCard,Switch,Stepper,SelectField,Slider,Row,Card}.tsx` under `src/renderer/preferences/`.
- Existing `useSettings` hook unchanged; all updates via same `update()` patches.

## Color Tokens (light)

Screen `#FAFAFA` / sidebar `#F2F2F7` / card `#FFFFFF` / text `#1C1C1E` / secondary `#8A8A8E` / hairline `#C6C6C8` / accent `#007AFF` / switch-on `#34C759`.

## Follow-up Fix (separate task)

Break overlay: non-strict breaks must be skippable — ensure Skip/Postpone buttons receive input and add **ESC-to-skip** key handler; ensure overlay window is focused so it receives keys.

## Out of Scope

- Dark mode; new reminder types (posture/focus/rest); notifications & keyboard-shortcut pages.

## Success Criteria

- Window reads like the reference image in light mode; sidebar navigation works.
- All controls persist via existing settings flow; autostart + sound actually function.
- `npm run build`/typecheck clean; existing tests pass.

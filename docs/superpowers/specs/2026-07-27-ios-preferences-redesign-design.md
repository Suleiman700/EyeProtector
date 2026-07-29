# iOS-Style Preferences Redesign

**Date:** 2026-07-27
**Scope:** Visual redesign of the preferences window only. No changes to settings logic, `useSettings`, IPC, or the blink/break screens.

## Goal

Replace the current dark slate + teal preferences UI with an authentic, premium **iOS Settings** look (Light mode), so the window feels like a native Apple settings screen.

## Design Decisions (approved)

- **Direction:** Light mode, authentic iOS Settings (grouped inset list).
- **Accent:** iOS Blue `#007AFF` for buttons, values, and the select control.
- **Switches:** native iOS green `#34C759` when on, neutral gray `#E9E9EA` when off.
- **Number fields:** tap-to-edit — value shown as clean blue text; clicking allows typing. Native number spinners hidden.

## Color Tokens

| Token | Value | Use |
|-------|-------|-----|
| Screen background | `#F2F2F7` | systemGroupedBackground |
| Card background | `#FFFFFF` | grouped list card |
| Text primary | `#000000` | row labels, title |
| Text secondary | `#8A8A8E` | units, group headers, chip |
| Separator | `#C6C6C8` (hairline) | row dividers, inset from left |
| Accent blue | `#007AFF` | buttons, values, select |
| Switch on | `#34C759` | iOS switch track (on) |
| Switch off | `#E9E9EA` | iOS switch track (off) |
| Button pressed | opacity ~0.8 | filled-button active state |

## Layout

1. **Header** — large bold "EyeProtector" title (iOS large-title style). "Next break mm:ss" as a subtle gray pill on the right.
2. **Groups** — small uppercase gray header above each card (BLINK REMINDER / SHORT BREAK · EYE REST / LONG BREAK · GET UP).
3. **Card** — white, ~12px radius, very subtle shadow; rows separated by hairline dividers inset ~16px from the left (aligned to label text).
4. **Row** — min-height ~44px, label left, control right, 16px horizontal padding.
5. **Buttons** — full-width filled iOS buttons: solid blue, ~12px radius, white bold text, pressed = reduced opacity. "Preview Blink" after the Blink group; "Take a Break Now" at the bottom.

## Components

- **Switch** (Radix): iOS pill track, white thumb with soft shadow, smooth 200ms slide. Green on / gray off.
- **NumberInput**: `<input type="number">` styled as right-aligned blue text (no spinners via CSS), gray unit label beside it. Min 1 preserved.
- **SelectField** (Radix): blue value + gray chevron; dropdown restyled as a small white iOS-style sheet (rounded, soft shadow, blue check on selected item).

## Implementation

- Rewrite styling in `src/renderer/preferences/App.tsx` (Group/Row/Switch/NumberInput/SelectField + layout). Keep all props, state, and update calls identical.
- Add minimal CSS to `src/renderer/preferences/index.css` for: hiding number-input spinners, hairline (0.5px) separators. Keep `@import "tailwindcss";`.
- Exact colors applied via inline styles where Tailwind lacks the precise token; use SF font stack already present.

## Out of Scope

- Settings schema, IPC, scheduler, blink/break overlay screens.
- Dark mode (Light only for this pass).

## Success Criteria

- Window reads as a native iOS Settings screen: white grouped cards on light-gray background, blue accents, green switches, hairline separators.
- All existing controls work exactly as before (no behavior change).
- Renderer builds with no type errors.

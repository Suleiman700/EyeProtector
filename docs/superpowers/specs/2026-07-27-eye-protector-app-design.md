# EyeProtector — Design Spec

**Date:** 2026-07-27
**Status:** Approved (design), pending implementation plan
**Author:** iStoreJaber (with Claude)

## Summary

A cross-platform desktop app (macOS primary; Windows & Linux via one codebase) that
protects eyes and enforces healthy screen breaks, inspired by the LookAway macOS app.
It runs quietly in the tray, schedules short (eye-rest) and long (get-up) breaks on the
20-20-20 principle, shows animated fullscreen break overlays on every monitor, and skips
breaks intelligently when the user is idle or in a fullscreen app. Deeply customizable,
with rich animations and effects.

A separate **landing page** (its own spec, built later) will showcase the app and link to
installers hosted on GitHub Release assets.

## Goals

- Full-featured break/eye-protection app from the start ("full clone" scope).
- Deep customization (intervals, durations, themes, sounds, custom messages, modes).
- Configurable **gentle** (skippable) vs **strict** (locked) break behavior.
- Rich animations and effects on the break screen and in settings.
- One codebase → macOS, Windows, Linux. Focus first on a working macOS dev build.
- Build pipeline that can emit `.dmg` / `.exe` / `.AppImage` for GitHub Releases.

## Non-Goals (for now)

- Code signing / notarization (unsigned is fine while running on the author's Mac; revisit
  before the public landing-page launch — Gatekeeper/SmartScreen will warn otherwise).
- The landing page itself (separate spec once the app is feature-complete).
- Cloud sync, accounts, telemetry, analytics.

## Tech Stack (decided)

| Concern | Choice |
|---|---|
| Desktop shell | Electron |
| Packaging | electron-builder → `.dmg` / `.exe` / `.AppImage` (+ `.deb`) |
| UI | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion (+ CSS) |
| Config persistence | `electron-store` (typed JSON in OS user-data dir, versioned) |
| Idle detection | Electron `powerMonitor` (built-in, cross-platform) |
| Active window / fullscreen detection | `active-win` + display heuristics |
| Autostart | Electron `setLoginItemSettings` (+ `auto-launch` fallback on Linux) |
| Unit tests | Vitest (on the pure scheduler logic) |

**Rationale for Electron over Tauri:** bundled Chromium renders animations identically on
all three OSes (Tauri's system webviews — especially Linux WebKitGTK — break fancy CSS
effects); built-in cross-platform idle detection; mature multi-monitor overlays, tray,
autostart, notifications; one-command packaging. Trade-off accepted: higher idle RAM
(~150 MB) in exchange for animation consistency and dev speed.

**React over Svelte:** most mainstream, widest ecosystem, polished results with Framer
Motion. (Svelte would be lighter — revisit only if footprint becomes a priority.)

## Architecture

Clean, single-purpose modules with well-defined boundaries.

### Main process (Node)

- **`SchedulerEngine`** — pure logic, **zero Electron dependencies**. Owns the timing state
  machine: when the next short/long break fires, and handling of pause / resume / skip /
  postpone / snooze / "take break now". Fully unit-testable in isolation.
- **`IdleMonitor`** — wraps `powerMonitor`; emits idle/active transitions so the engine can
  skip or reset breaks (the "smart breaks" behavior).
- **`FullscreenGuard`** — detects a fullscreen app / presentation / OS Do-Not-Disturb and
  tells the engine to defer a break. Degrades gracefully where detection is unreliable.
- **`OverlayManager`** — creates one always-on-top, borderless, fullscreen break window
  **per monitor**, and tears them down after the break.
- **`TrayController`** — tray / menu-bar icon and menu (take break now, skip next, pause
  for 1h, preferences, quit), with a live countdown to the next break.
- **`SettingsStore`** — typed config schema over `electron-store`; emits change events that
  the engine and windows react to.
- **`AutostartManager`** — launch-at-login toggle.
- **IPC bridge** — the only channel between renderers and main.

### Renderers (React)

- **Break overlay app** — the animated fullscreen break screen.
- **Preferences app** — the deep settings window.

### Preload

- `contextBridge` exposing a small, typed, safe API. No raw Node in the renderer.

## Features (full clone)

- **20-20-20 engine:** frequent short breaks (eye rest) + periodic long breaks (get up),
  each independently configurable.
- **Smart breaks:** auto-skip / reset when idle or away; clean resume.
- **Multi-monitor overlays:** the break screen covers every display simultaneously.
- **Gentle vs Strict (configurable, per break type):** gentle = Skip / "Postpone 5 min";
  strict = locked for the full duration, no early exit.
- **Pre-break nudge:** a small slide-in warning ~10s before a full break so it's never
  jarring.
- **Fullscreen / DND guard:** won't interrupt presentations, video, or games.
- **Tray, autostart, native notifications.**

## Animations & Effects

- Break screen: fade + scale entrance, frosted-glass blur backdrop, ambient animated
  gradient / particles.
- **Breathing guide:** an expanding/contracting circle to pace the eye-rest, synced with a
  circular countdown ring.
- Smooth themed exit transition; spring-loaded toggles and live theme previews in settings.

## Customization (deep) — config schema

Versioned JSON. Covers:

- Short break: interval, duration, gentle/strict.
- Long break: interval, duration, gentle/strict.
- Pre-break warning lead time.
- Themes: built-in presets + custom accent / background.
- Sounds: on/off, choice, volume.
- Custom break messages / exercise text.
- Autostart on/off.
- Per-monitor behavior.
- Pause schedules (e.g., quiet hours).

Stored versioned so upgrades migrate rather than wipe settings.

## Break Flow (data flow)

```
SettingsStore → SchedulerEngine ticks → break due
  → check IdleMonitor + FullscreenGuard
    → if clear: OverlayManager shows overlays on all displays
      → overlay renderer runs countdown + animation
        → user completes (or skips / postpones in gentle mode)
          → engine schedules the next cycle
```

## Risks & Hard Parts

- **Fullscreen / DND detection** is the trickiest cross-platform piece. Approach: `active-win`
  + display-bounds heuristics; degrade gracefully rather than promise perfection.
- **Code signing** deferred; required before public distribution to avoid OS warnings.
- **Overlay reliability on Linux** (Wayland vs X11) may need per-environment handling.

## Testing

- **Vitest** unit tests on `SchedulerEngine` — the piece where correctness bites (timing,
  skip/postpone, idle resets, short/long interleaving).
- UI verified by running the app on macOS.

## Implementation Phasing

1. **Skeleton** — Electron + Vite + React scaffold, tray, one window; runs on macOS.
2. **Core loop** — `SchedulerEngine` + single-monitor animated break overlay + start/stop.
3. **System integration** — idle-skip, autostart, notifications, multi-monitor.
4. **Depth** — gentle/strict, fullscreen guard, deep settings UI, themes, sounds.
5. **Packaging** — electron-builder → installers for GitHub Releases.
6. **(Separate spec)** — Landing page.

## Open Decisions (deferred, not blocking)

- Code signing certs (Apple Developer + Windows) — before landing-page launch.
- Linux display-server handling specifics — during phase 3.

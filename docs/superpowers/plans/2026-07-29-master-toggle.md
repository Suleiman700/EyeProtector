# Master Enable/Disable Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single master switch (in the app header and the tray) that turns the whole app on/off — when off, all schedulers stop, any overlay closes, the tray icon shows a slashed variant, and the countdown hides.

**Architecture:** Add `enabled` to settings. A coordinator in `index.ts` reacts only to transitions of that flag: start/stop the three controllers and close overlays. The tray builds a slashed template icon at runtime and swaps it. The preferences header gains a pill bound to `settings.enabled`.

**Tech Stack:** Electron (main + tray + nativeImage), TypeScript, React, electron-store.

## Global Constraints

- OFF = full stop + close active; ON = restart all timers fresh (no resume-from-remaining).
- No new npm dependency (org policy: only approved packages). The disabled tray icon is built at runtime with Electron `nativeImage` built-ins.
- The header pill and tray checkbox must always reflect the same state; both flip `settings.enabled` through the normal settings flow (no new IPC).
- `msUntilNext: -1` is the existing "hide countdown" convention — reuse it, add no new status field.
- Match existing style: named exports, explicit return types, reuse the `Switch`/`COLORS` controls.
- Commit messages: conventional commits, imperative mood.

---

### Task 1: Add `enabled` to settings

**Files:**
- Modify: `src/shared/settings.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `AppSettings.enabled: boolean` (default `true`).

- [ ] **Step 1: Add the field to the interface**

In `src/shared/settings.ts`, add `enabled` as the first field of `AppSettings`:

```ts
export interface AppSettings {
  enabled: boolean
  schemaVersion: number
  short: BreakSettings
  // …rest unchanged…
}
```

- [ ] **Step 2: Add the default**

In `DEFAULT_SETTINGS`, add `enabled: true` as the first field:

```ts
export const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  schemaVersion: 1,
  // …rest unchanged…
}
```

(No `SettingsStore` change needed: `get()` spreads `...DEFAULT_SETTINGS` first, so a stored
file without `enabled` reads back as `true`.)

- [ ] **Step 3: Verify it type-checks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/settings.ts
git commit -m "feat: add master enabled flag to settings"
```

---

### Task 2: Tray — disabled icon + setEnabled + menu

**Files:**
- Modify: `src/main/TrayController.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `TrayHandlers.setEnabled(enabled: boolean): void` (new handler field).
  - `TrayController.setEnabled(enabled: boolean): void`.
  - Internal: `enabled` state, drives icon + menu.

- [ ] **Step 1: Extend handlers and store enabled state**

Replace the top of `src/main/TrayController.ts` (imports + interface + class fields +
constructor) with:

```ts
import { Tray, Menu, nativeImage, type NativeImage } from 'electron'
import { join } from 'path'

interface TrayHandlers {
  openPreferences(): void
  takeBreakNow(): void
  setEnabled(enabled: boolean): void
  quit(): void
}

export class TrayController {
  private tray: Tray
  private iconEnabled: NativeImage
  private iconDisabled: NativeImage
  private enabled = true
  private countdown: string | null = null

  constructor(private handlers: TrayHandlers) {
    this.iconEnabled = nativeImage.createFromPath(
      join(__dirname, '../../resources/trayTemplate.png')
    )
    this.iconEnabled.setTemplateImage(true)
    this.iconDisabled = this.buildDisabledIcon()
    this.tray = new Tray(this.iconEnabled)
    this.tray.setToolTip('EyeProtector')
    this.render()
  }
```

- [ ] **Step 2: Add the runtime disabled-icon builder**

Add this private method (draws a diagonal slash across the 2× template, black + alpha only):

```ts
  private buildDisabledIcon(): NativeImage {
    const base = nativeImage.createFromPath(
      join(__dirname, '../../resources/trayTemplate@2x.png')
    )
    const { width, height } = base.getSize()
    const buf = Buffer.from(base.getBitmap()) // BGRA
    const thickness = Math.max(2, Math.round(width / 12))
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.abs(x - y) <= thickness) {
          const i = (y * width + x) * 4
          buf[i] = 0
          buf[i + 1] = 0
          buf[i + 2] = 0
          buf[i + 3] = 255
        }
      }
    }
    const img = nativeImage.createFromBitmap(buf, { width, height, scaleFactor: 2 })
    img.setTemplateImage(true)
    return img
  }
```

- [ ] **Step 3: Add setEnabled and rewrite setCountdown/render for the enabled state**

Replace the existing `setCountdown` and `render` methods with:

```ts
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.tray.setImage(enabled ? this.iconEnabled : this.iconDisabled)
    if (!enabled) this.countdown = null
    this.render()
  }

  setCountdown(msUntilNext: number): void {
    if (!this.enabled || msUntilNext < 0) {
      this.countdown = null
    } else {
      const totalSec = Math.max(0, Math.round(msUntilNext / 1000))
      const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
      const ss = String(totalSec % 60).padStart(2, '0')
      this.countdown = `${mm}:${ss}`
    }
    this.render()
  }

  private render(): void {
    const items: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Enable EyeProtector',
        type: 'checkbox',
        checked: this.enabled,
        click: () => this.handlers.setEnabled(!this.enabled)
      },
      { type: 'separator' }
    ]
    if (this.enabled) {
      if (this.countdown !== null) {
        items.push({ label: `Next break in ${this.countdown}`, enabled: false })
        items.push({ type: 'separator' })
      }
      items.push({ label: 'Take a break now', click: () => this.handlers.takeBreakNow() })
    }
    items.push({ label: 'Preferences…', click: () => this.handlers.openPreferences() })
    items.push({ type: 'separator' })
    items.push({ label: 'Quit EyeProtector', click: () => this.handlers.quit() })
    this.tray.setContextMenu(Menu.buildFromTemplate(items))
  }
```

- [ ] **Step 4: Verify it type-checks**

Run: `npm run typecheck`
Expected: no errors. (`index.ts` will report a missing `setEnabled` handler — that's fixed in
Task 3; if typecheck fails only on that, proceed.)

- [ ] **Step 5: Commit**

```bash
git add src/main/TrayController.ts
git commit -m "feat: tray master toggle with slashed disabled icon"
```

---

### Task 3: Main-process coordinator + handler wiring

**Files:**
- Modify: `src/main/index.ts`

**Interfaces:**
- Consumes: `AppSettings.enabled` (Task 1); `tray.setEnabled` / `TrayHandlers.setEnabled` (Task 2); existing `controller`/`blinkController`/`reminderController` `start()`/`stop()`, `overlay.close()`, `blinkOverlay.close()`, `reminderPresenter.handleAction()`, `broadcastStatus`.
- Produces: runtime start/stop gated by `settings.enabled`.

- [ ] **Step 1: Add the tray setEnabled handler**

In `src/main/index.ts`, the `tray = new TrayController({...})` call currently passes
`openPreferences`, `takeBreakNow`, `quit`. Add a `setEnabled` handler:

```ts
  tray = new TrayController({
    openPreferences,
    takeBreakNow: () => controller.takeBreakNow(),
    setEnabled: (enabled: boolean) => settings.set({ enabled }),
    quit: () => app.quit()
  })
```

- [ ] **Step 2: Replace the unconditional starts with the coordinator**

Find the three start calls near the end of `app.whenReady()`:

```ts
  controller.start()
  blinkController.start()
  reminderController.start()
  openPreferences()
```

Replace them with the transition-guarded coordinator:

```ts
  let enabledNow = settings.get().enabled
  const applyEnabled = (s: AppSettings): void => {
    if (s.enabled) {
      controller.start()
      blinkController.start()
      reminderController.start()
    } else {
      controller.stop()
      blinkController.stop()
      reminderController.stop()
      overlay.close()
      blinkOverlay.close('completed')
      reminderPresenter.handleAction('skip')
      broadcastStatus({ status: 'disabled', msUntilNext: -1 })
    }
    tray.setEnabled(s.enabled)
  }
  applyEnabled(settings.get())
  settings.onChange((s) => {
    if (s.enabled !== enabledNow) {
      enabledNow = s.enabled
      applyEnabled(s)
    }
  })
  openPreferences()
```

(`AppSettings` is already imported in `index.ts`. `broadcastStatus` is defined earlier in the
same scope.)

- [ ] **Step 3: Verify it type-checks and builds**

Run: `npm run typecheck && npx electron-vite build`
Expected: no errors; build succeeds.

- [ ] **Step 4: Run the app and verify tray behavior**

Run the dev app (`npm run dev`). Verify:
- Tray menu shows a checked "Enable EyeProtector".
- Uncheck it → tray icon shows the slashed variant; "Take a break now" and the countdown row
  disappear; any overlay currently up closes.
- Re-check it → icon returns to normal; countdown row returns after a moment.

- [ ] **Step 5: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: gate all schedulers behind the master toggle"
```

---

### Task 4: Preferences header pill + paused banner

**Files:**
- Modify: `src/renderer/preferences/App.tsx`

**Interfaces:**
- Consumes: `AppSettings.enabled` (Task 1); existing `useSettings()` `{ settings, update }`; `Switch`, `COLORS` from `./components/controls`.
- Produces: header master pill + paused banner.

- [ ] **Step 1: Import the Switch control**

In `src/renderer/preferences/App.tsx`, extend the controls import:

```ts
import { COLORS, SF_FONT, Switch } from './components/controls'
```

- [ ] **Step 2: Add the header pill and gate the countdown**

The header currently is:

```tsx
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-end px-8 pt-2">
          {showCountdown && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.secondary }}
            >
              Next break {mmss(status.msUntilNext)}
            </span>
          )}
        </div>
```

Replace it with a left master pill + right countdown (countdown only when enabled):

```tsx
        <div className="titlebar-drag flex h-12 shrink-0 items-center justify-between px-8 pt-2">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1"
            style={{ backgroundColor: 'rgba(120,120,128,0.12)' }}
          >
            <span className="text-[12px] font-semibold" style={{ color: COLORS.text }}>
              EyeProtector
            </span>
            <Switch
              checked={settings.enabled}
              onChange={(v) => update({ enabled: v })}
            />
          </div>
          {settings.enabled && showCountdown && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-medium tabular-nums"
              style={{ backgroundColor: 'rgba(120,120,128,0.12)', color: COLORS.secondary }}
            >
              Next break {mmss(status.msUntilNext)}
            </span>
          )}
        </div>
```

(The header's `index.css` already sets `-webkit-app-region: no-drag` on `button`/`input`
inside `.titlebar-drag`, and the Radix `Switch` renders a `<button>`, so the switch is
clickable with no extra class. Clicking the surrounding text just drags the window — harmless.)

- [ ] **Step 3: Add the paused banner above page content**

The main content block is:

```tsx
        <div className="px-8 pb-10">
          <h1 className="mb-6 text-[22px] font-bold tracking-[-0.01em]">{PAGE_TITLES[page]}</h1>
```

Insert the banner just inside that div, before the `<h1>`:

```tsx
        <div className="px-8 pb-10">
          {!settings.enabled && (
            <div
              className="mb-5 rounded-lg px-4 py-2.5 text-[13px]"
              style={{ backgroundColor: 'rgba(255,159,10,0.14)', color: '#B25E00' }}
            >
              EyeProtector is paused — nothing will run until you turn it back on.
            </div>
          )}
          <h1 className="mb-6 text-[22px] font-bold tracking-[-0.01em]">{PAGE_TITLES[page]}</h1>
```

- [ ] **Step 4: Verify + run**

Run: `npm run typecheck`
Expected: no errors.

Run the app. Verify:
- The header shows an `EyeProtector` pill with a switch, on every page.
- Toggling it off hides the countdown, shows the amber paused banner, and (via Task 3) stops
  the schedulers + slashes the tray icon.
- Toggling the tray checkbox updates the header pill, and vice-versa (shared `settings.enabled`).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/preferences/App.tsx
git commit -m "feat: master toggle pill and paused banner in preferences header"
```

---

## Self-Review

**Spec coverage:**
- `enabled` field + default → Task 1. ✓
- Coordinator: stop controllers, close overlays, broadcast disabled, restart fresh on enable → Task 3. ✓
- Tray `setEnabled`, checkbox item, hide "Take a break now"/countdown when off, icon swap → Task 2. ✓
- Runtime-generated slashed template icon → Task 2 `buildDisabledIcon`. ✓
- Header pill on every page + hide countdown + paused banner → Task 4. ✓
- Both controls share state via `settings.enabled`/normal flow → Task 3 handler (`settings.set`) + Task 4 (`update`). ✓
- Testing by running the app → Tasks 3 & 4 run steps. ✓

**Placeholder scan:** No TBD/TODO. Task 4 Step 2 offers a concrete fallback for `no-drag`
with exact code, not a vague instruction.

**Type consistency:** `TrayHandlers.setEnabled(enabled: boolean)` defined in Task 2, supplied
in Task 3. `TrayController.setEnabled` called from `applyEnabled` (Task 3), defined in Task 2.
`AppSettings.enabled` defined Task 1, consumed in Tasks 3 (`s.enabled`) and 4
(`settings.enabled`). `broadcastStatus({ status, msUntilNext })` matches the existing
`StatusPayload` shape. `overlay.close()`, `blinkOverlay.close('completed')`,
`reminderPresenter.handleAction('skip')` all match existing signatures verified in the
current source.

**Note:** the coordinator calls `controller.start()` again on each enable; `BreakController`
/`BlinkController`/`ReminderController` all reset their `nextAt`/engine and create a new
ticker in `start()`, and the OFF branch always calls `stop()` first, so tickers never double
up (transitions strictly alternate via the `enabledNow` guard).

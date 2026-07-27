# EyeProtector — Milestone 1 (Skeleton + Core Loop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable macOS Electron app that schedules short/long breaks with a tested pure scheduler engine and shows an animated single-monitor fullscreen break overlay, controllable from the tray and a minimal preferences window.

**Architecture:** Electron main process owns a `SchedulerEngine` (pure, tested), a `SettingsStore` (persisted config), a `BreakController` (drives real timers, opens the overlay when a break is due), and a `TrayController`. Two React renderers (break overlay + preferences) talk to main only through a typed `contextBridge` preload API.

**Tech Stack:** Electron, electron-vite, Vite, React, TypeScript (strict), Tailwind CSS v4, Framer Motion, electron-store, Vitest.

## Global Constraints

- App name (product + UI copy): `EyeProtector` (English identifiers/code; this app's UI copy is English).
- Node.js `>= 20`. Electron `^31`. electron-vite `^2`. electron-store `^8` (CJS, avoids ESM interop issues). framer-motion `^11`. Tailwind CSS `^4` via `@tailwindcss/vite`.
- TypeScript `strict: true` everywhere.
- Electron security: every window uses `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (preload needs Node). Renderers get Node access ONLY through the preload `contextBridge`.
- The `SchedulerEngine` must have **zero** Electron/Node imports so it is unit-testable with Vitest.
- No code signing in this milestone (unsigned macOS dev build is fine).
- Commit after every task (conventional-commit messages). Work happens on a feature branch, not `main`.
- All durations are milliseconds internally; the UI shows minutes/seconds.

---

### Task 1: Project scaffold (electron-vite + React + TS + Tailwind), runs on macOS

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`
- Create: `.gitignore`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/preferences/index.html`
- Create: `src/renderer/preferences/main.tsx`
- Create: `src/renderer/preferences/App.tsx`
- Create: `src/renderer/preferences/index.css`

**Interfaces:**
- Produces: an `npm run dev` command that launches Electron with a visible preferences window rendering React + Tailwind. Later tasks add a second renderer entry (`break`).

- [ ] **Step 1: Initialize package.json**

Create `package.json`:

```json
{
  "name": "eyeprotector",
  "version": "0.1.0",
  "description": "Cross-platform eye-protection and break reminder app",
  "main": "./out/main/index.js",
  "author": "iStoreJaber",
  "license": "MIT",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json"
  },
  "dependencies": {
    "electron-store": "^8.2.0",
    "framer-motion": "^11.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "electron": "^31.0.0",
    "electron-vite": "^2.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.3.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `node_modules` populated, no peer-dependency errors that block install.

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules/
out/
dist/
*.log
.DS_Store
```

- [ ] **Step 4: TypeScript configs**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json` (main + preload + shared):
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "lib": ["ES2022"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts"]
}
```

`tsconfig.web.json` (renderers + shared):
```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 5: electron-vite config**

`electron.vite.config.ts`:
```ts
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } }
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          preferences: resolve('src/renderer/preferences/index.html')
        }
      }
    }
  }
})
```

- [ ] **Step 6: Preferences renderer files**

`src/renderer/preferences/index.html`:
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EyeProtector — Preferences</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/renderer/preferences/index.css`:
```css
@import "tailwindcss";
```

`src/renderer/preferences/main.tsx`:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/renderer/preferences/App.tsx`:
```tsx
export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <h1 className="text-2xl font-semibold">EyeProtector</h1>
    </div>
  )
}
```

- [ ] **Step 7: Preload stub**

`src/preload/index.ts`:
```ts
// Real API bridge is added in Task 4.
```

- [ ] **Step 8: Main process — open the preferences window**

`src/main/index.ts`:
```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createPreferencesWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 720,
    height: 560,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.on('ready-to-show', () => win.show())
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/preferences/index.html`)
  } else {
    win.loadFile(join(__dirname, '../renderer/preferences/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  createPreferencesWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createPreferencesWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 9: Run the app**

Run: `npm run dev`
Expected: an Electron window opens showing a dark screen with "EyeProtector" centered (confirms Electron + React + Tailwind all work). Close it.

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold electron-vite + react + tailwind app shell"
```

---

### Task 2: SchedulerEngine (pure logic, TDD)

**Files:**
- Create: `src/shared/scheduler.ts`
- Test: `src/shared/scheduler.test.ts`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces (relied on by Task 5 `BreakController`):
  - `SchedulerConfig { shortIntervalMs, shortDurationMs, longIntervalMs, longDurationMs }`
  - `type BreakType = 'short' | 'long'`
  - `type SchedulerStatus = 'idle' | 'running' | 'paused' | 'breaking'`
  - `interface NextBreak { type: BreakType; dueAt: number }`
  - `class SchedulerEngine` with methods: `constructor(config)`, `getStatus(): SchedulerStatus`, `start(now)`, `getNextBreak(): NextBreak`, `msUntilNext(now): number`, `isDue(now): boolean`, `beginBreak(now): { type: BreakType; endsAt: number }`, `completeBreak(now)`, `skip(now)`, `postpone(ms, now)`, `pause(now)`, `resume(now)`, `reset(now)`, `updateConfig(config, now)`. All time args are epoch-ms numbers passed in by the caller (no internal clock — keeps it deterministic and testable).

- [ ] **Step 1: Vitest config**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
})
```

- [ ] **Step 2: Write the failing tests**

`src/shared/scheduler.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { SchedulerEngine, type SchedulerConfig } from './scheduler'

const config: SchedulerConfig = {
  shortIntervalMs: 20 * 60_000, // 20 min
  shortDurationMs: 20_000,       // 20 s
  longIntervalMs: 60 * 60_000,   // 60 min
  longDurationMs: 5 * 60_000     // 5 min
}

describe('SchedulerEngine', () => {
  it('starts idle then running', () => {
    const e = new SchedulerEngine(config)
    expect(e.getStatus()).toBe('idle')
    e.start(0)
    expect(e.getStatus()).toBe('running')
  })

  it('schedules the short break as the next break', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: config.shortIntervalMs })
    expect(e.msUntilNext(0)).toBe(config.shortIntervalMs)
  })

  it('is not due before the interval and due after', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    expect(e.isDue(config.shortIntervalMs - 1)).toBe(false)
    expect(e.isDue(config.shortIntervalMs)).toBe(true)
  })

  it('beginBreak returns the correct type and end time', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    expect(e.beginBreak(now)).toEqual({ type: 'short', endsAt: now + config.shortDurationMs })
    expect(e.getStatus()).toBe('breaking')
  })

  it('completing a short break reschedules the next short and returns to running', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.beginBreak(now)
    const end = now + config.shortDurationMs
    e.completeBreak(end)
    expect(e.getStatus()).toBe('running')
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: end + config.shortIntervalMs })
  })

  it('completing a long break resets both timers', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    // fast-forward to when the long break is due by postponing short past long
    e.postpone(config.longIntervalMs + 1, config.longIntervalMs) // push short beyond long
    const now = config.longIntervalMs
    const nb = e.getNextBreak()
    expect(nb.type).toBe('long')
    e.beginBreak(now)
    const end = now + config.longDurationMs
    e.completeBreak(end)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: end + config.shortIntervalMs })
  })

  it('skip reschedules without taking a break', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.skip(now)
    expect(e.getStatus()).toBe('running')
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: now + config.shortIntervalMs })
  })

  it('postpone pushes the due break by the given ms', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    const now = config.shortIntervalMs
    e.postpone(5 * 60_000, now)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: now + 5 * 60_000 })
  })

  it('pause preserves remaining time and resume re-anchors it', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    e.pause(5 * 60_000) // 5 min elapsed, 15 min remaining on short
    expect(e.getStatus()).toBe('paused')
    e.resume(100 * 60_000) // resume much later
    expect(e.getStatus()).toBe('running')
    expect(e.msUntilNext(100 * 60_000)).toBe(15 * 60_000)
  })

  it('reset behaves like a fresh start', () => {
    const e = new SchedulerEngine(config)
    e.start(0)
    e.reset(30 * 60_000)
    expect(e.getNextBreak()).toEqual({ type: 'short', dueAt: 30 * 60_000 + config.shortIntervalMs })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './scheduler'` / `SchedulerEngine is not defined`.

- [ ] **Step 4: Implement SchedulerEngine**

`src/shared/scheduler.ts`:
```ts
export interface SchedulerConfig {
  shortIntervalMs: number
  shortDurationMs: number
  longIntervalMs: number
  longDurationMs: number
}

export type BreakType = 'short' | 'long'
export type SchedulerStatus = 'idle' | 'running' | 'paused' | 'breaking'

export interface NextBreak {
  type: BreakType
  dueAt: number
}

export class SchedulerEngine {
  private config: SchedulerConfig
  private status: SchedulerStatus = 'idle'
  private nextShortAt = 0
  private nextLongAt = 0
  private currentBreak: { type: BreakType; endsAt: number } | null = null
  private pausedRemaining: { short: number; long: number } | null = null

  constructor(config: SchedulerConfig) {
    this.config = config
  }

  getStatus(): SchedulerStatus {
    return this.status
  }

  start(now: number): void {
    this.status = 'running'
    this.nextShortAt = now + this.config.shortIntervalMs
    this.nextLongAt = now + this.config.longIntervalMs
    this.currentBreak = null
    this.pausedRemaining = null
  }

  getNextBreak(): NextBreak {
    // Tie or long-sooner → long takes precedence (it's the more important break).
    if (this.nextLongAt <= this.nextShortAt) {
      return { type: 'long', dueAt: this.nextLongAt }
    }
    return { type: 'short', dueAt: this.nextShortAt }
  }

  msUntilNext(now: number): number {
    return Math.max(0, this.getNextBreak().dueAt - now)
  }

  isDue(now: number): boolean {
    return this.status === 'running' && now >= this.getNextBreak().dueAt
  }

  beginBreak(now: number): { type: BreakType; endsAt: number } {
    const { type } = this.getNextBreak()
    const duration = type === 'short' ? this.config.shortDurationMs : this.config.longDurationMs
    this.status = 'breaking'
    this.currentBreak = { type, endsAt: now + duration }
    return this.currentBreak
  }

  completeBreak(now: number): void {
    const type = this.currentBreak?.type ?? this.getNextBreak().type
    // A short break resets the short timer; a long break resets both
    // (you've already rested your eyes, so don't fire a short immediately).
    this.nextShortAt = now + this.config.shortIntervalMs
    if (type === 'long') {
      this.nextLongAt = now + this.config.longIntervalMs
    }
    this.status = 'running'
    this.currentBreak = null
  }

  skip(now: number): void {
    const { type } = this.getNextBreak()
    if (type === 'short') this.nextShortAt = now + this.config.shortIntervalMs
    else this.nextLongAt = now + this.config.longIntervalMs
    this.status = 'running'
    this.currentBreak = null
  }

  postpone(ms: number, now: number): void {
    const { type } = this.getNextBreak()
    if (type === 'short') this.nextShortAt = now + ms
    else this.nextLongAt = now + ms
    this.status = 'running'
    this.currentBreak = null
  }

  pause(now: number): void {
    if (this.status === 'paused') return
    this.pausedRemaining = {
      short: Math.max(0, this.nextShortAt - now),
      long: Math.max(0, this.nextLongAt - now)
    }
    this.status = 'paused'
  }

  resume(now: number): void {
    if (this.status !== 'paused' || !this.pausedRemaining) return
    this.nextShortAt = now + this.pausedRemaining.short
    this.nextLongAt = now + this.pausedRemaining.long
    this.pausedRemaining = null
    this.status = 'running'
  }

  reset(now: number): void {
    this.start(now)
  }

  updateConfig(config: SchedulerConfig, now: number): void {
    const wasRunning = this.status === 'running'
    this.config = config
    if (wasRunning) this.start(now)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all SchedulerEngine tests green).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add tested pure SchedulerEngine break-timing state machine"
```

---

### Task 3: SettingsStore + config schema

**Files:**
- Create: `src/shared/settings.ts` (types + defaults, pure)
- Test: `src/shared/settings.test.ts`
- Create: `src/main/SettingsStore.ts` (electron-store wrapper)

**Interfaces:**
- Produces:
  - `interface AppSettings` with fields: `short: { intervalMin: number; durationSec: number; strict: boolean }`, `long: { intervalMin: number; durationSec: number; strict: boolean }`, `preBreakWarningSec: number`, `sound: { enabled: boolean; volume: number }`, `autostart: boolean`, `theme: string`, `schemaVersion: number`.
  - `const DEFAULT_SETTINGS: AppSettings`.
  - `function toSchedulerConfig(s: AppSettings): SchedulerConfig` (converts minutes/seconds → ms).
  - `class SettingsStore` (main-process) with `get(): AppSettings`, `set(patch: Partial<AppSettings>): AppSettings`, `onChange(cb: (s: AppSettings) => void): () => void`.

- [ ] **Step 1: Write failing tests for the pure conversion**

`src/shared/settings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, toSchedulerConfig } from './settings'

describe('settings', () => {
  it('has sane 20-20-20 defaults', () => {
    expect(DEFAULT_SETTINGS.short.intervalMin).toBe(20)
    expect(DEFAULT_SETTINGS.short.durationSec).toBe(20)
    expect(DEFAULT_SETTINGS.long.intervalMin).toBe(60)
  })

  it('converts settings to SchedulerConfig in milliseconds', () => {
    const cfg = toSchedulerConfig(DEFAULT_SETTINGS)
    expect(cfg.shortIntervalMs).toBe(20 * 60_000)
    expect(cfg.shortDurationMs).toBe(20 * 1000)
    expect(cfg.longIntervalMs).toBe(60 * 60_000)
    expect(cfg.longDurationMs).toBe(DEFAULT_SETTINGS.long.durationSec * 1000)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot find `./settings`.

- [ ] **Step 3: Implement the pure settings module**

`src/shared/settings.ts`:
```ts
import type { SchedulerConfig } from './scheduler'

export interface BreakSettings {
  intervalMin: number
  durationSec: number
  strict: boolean
}

export interface AppSettings {
  schemaVersion: number
  short: BreakSettings
  long: BreakSettings
  preBreakWarningSec: number
  sound: { enabled: boolean; volume: number }
  autostart: boolean
  theme: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  short: { intervalMin: 20, durationSec: 20, strict: false },
  long: { intervalMin: 60, durationSec: 300, strict: false },
  preBreakWarningSec: 10,
  sound: { enabled: true, volume: 0.6 },
  autostart: false,
  theme: 'calm'
}

export function toSchedulerConfig(s: AppSettings): SchedulerConfig {
  return {
    shortIntervalMs: s.short.intervalMin * 60_000,
    shortDurationMs: s.short.durationSec * 1000,
    longIntervalMs: s.long.intervalMin * 60_000,
    longDurationMs: s.long.durationSec * 1000
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the electron-store wrapper**

`src/main/SettingsStore.ts`:
```ts
import Store from 'electron-store'
import { DEFAULT_SETTINGS, type AppSettings } from '../shared/settings'

export class SettingsStore {
  private store: Store<AppSettings>
  private listeners = new Set<(s: AppSettings) => void>()

  constructor() {
    this.store = new Store<AppSettings>({ defaults: DEFAULT_SETTINGS })
  }

  get(): AppSettings {
    return this.store.store
  }

  set(patch: Partial<AppSettings>): AppSettings {
    const next = { ...this.store.store, ...patch }
    this.store.store = next
    for (const cb of this.listeners) cb(next)
    return next
  }

  onChange(cb: (s: AppSettings) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck` (expected: no errors)
```bash
git add -A
git commit -m "feat: add settings schema, defaults, and persistent SettingsStore"
```

---

### Task 4: Preload bridge + typed IPC contract

**Files:**
- Create: `src/shared/ipc.ts` (channel names + payload types shared by main & renderer)
- Modify: `src/preload/index.ts`
- Create: `src/preload/api.d.ts` (global `window.eyeprotector` typing)

**Interfaces:**
- Produces:
  - `src/shared/ipc.ts`: exported const `IPC` map of channel names, and types `BreakPayload { type: BreakType; durationMs: number; strict: boolean; theme: string }`, `BreakAction = 'complete' | 'skip' | 'postpone'`.
  - `window.eyeprotector` API (used by both renderers): `getSettings(): Promise<AppSettings>`, `setSettings(patch): Promise<AppSettings>`, `onBreakStart(cb: (p: BreakPayload) => void): () => void`, `breakAction(action: BreakAction): void`, `takeBreakNow(): void`, `onStatus(cb: (s: { status: string; msUntilNext: number }) => void): () => void`.

- [ ] **Step 1: Shared IPC contract**

`src/shared/ipc.ts`:
```ts
import type { BreakType } from './scheduler'

export const IPC = {
  getSettings: 'settings:get',
  setSettings: 'settings:set',
  breakStart: 'break:start',
  breakAction: 'break:action',
  takeBreakNow: 'break:take-now',
  status: 'status:update'
} as const

export interface BreakPayload {
  type: BreakType
  durationMs: number
  strict: boolean
  theme: string
}

export type BreakAction = 'complete' | 'skip' | 'postpone'

export interface StatusPayload {
  status: string
  msUntilNext: number
}
```

- [ ] **Step 2: Preload bridge**

`src/preload/index.ts`:
```ts
import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type BreakAction, type BreakPayload, type StatusPayload } from '../shared/ipc'
import type { AppSettings } from '../shared/settings'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.getSettings),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.setSettings, patch),
  onBreakStart: (cb: (p: BreakPayload) => void): (() => void) => {
    const h = (_e: unknown, p: BreakPayload): void => cb(p)
    ipcRenderer.on(IPC.breakStart, h)
    return () => ipcRenderer.removeListener(IPC.breakStart, h)
  },
  breakAction: (action: BreakAction): void => ipcRenderer.send(IPC.breakAction, action),
  takeBreakNow: (): void => ipcRenderer.send(IPC.takeBreakNow),
  onStatus: (cb: (s: StatusPayload) => void): (() => void) => {
    const h = (_e: unknown, s: StatusPayload): void => cb(s)
    ipcRenderer.on(IPC.status, h)
    return () => ipcRenderer.removeListener(IPC.status, h)
  }
}

contextBridge.exposeInMainWorld('eyeprotector', api)
export type EyeProtectorApi = typeof api
```

- [ ] **Step 3: Global typing for renderers**

`src/preload/api.d.ts`:
```ts
import type { EyeProtectorApi } from './index'

declare global {
  interface Window {
    eyeprotector: EyeProtectorApi
  }
}
```

- [ ] **Step 4: Include the preload typing in the web tsconfig**

Modify `tsconfig.web.json` `include` array to add `"src/preload/api.d.ts"` and `"src/preload/index.ts"` so `window.eyeprotector` types resolve in renderers. Final `include`:
```json
"include": ["src/renderer/**/*", "src/shared/**/*", "src/preload/api.d.ts", "src/preload/index.ts"]
```

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` (expected: no errors)
```bash
git add -A
git commit -m "feat: add typed preload contextBridge + shared IPC contract"
```

---

### Task 5: BreakController + main wiring + tray

**Files:**
- Create: `src/main/BreakController.ts`
- Create: `src/main/OverlayManager.ts`
- Create: `src/main/TrayController.ts`
- Create: `resources/trayTemplate.png` (16×16 + @2x tray icon; a simple monochrome eye glyph)
- Modify: `src/main/index.ts`

**Interfaces:**
- Consumes: `SchedulerEngine` (Task 2), `SettingsStore` + `toSchedulerConfig` (Task 3), `IPC`/`BreakPayload`/`BreakAction`/`StatusPayload` (Task 4).
- Produces:
  - `OverlayManager` with `show(payload: BreakPayload): void` (opens a fullscreen borderless always-on-top window on the primary display and sends `IPC.breakStart`) and `close(): void`.
  - `BreakController` with `constructor(settings: SettingsStore, overlay: OverlayManager, broadcastStatus: (s: StatusPayload) => void)`, `start(): void`, `stop(): void`, `takeBreakNow(): void`, `handleAction(action: BreakAction): void`. Internally runs a 1-second `setInterval` that calls `engine.isDue(Date.now())`.
  - `TrayController` with `constructor(handlers: { openPreferences(): void; takeBreakNow(): void; togglePause(): void; quit(): void })`, `setCountdown(msUntilNext: number): void`.

- [ ] **Step 1: OverlayManager**

`src/main/OverlayManager.ts`:
```ts
import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { IPC, type BreakPayload } from '../shared/ipc'

export class OverlayManager {
  private win: BrowserWindow | null = null

  show(payload: BreakPayload): void {
    if (this.win) this.close()
    const { bounds } = screen.getPrimaryDisplay()
    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      fullscreen: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
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
      this.win = null
    })
    const load = process.env['ELECTRON_RENDERER_URL']
      ? win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/break/index.html`)
      : win.loadFile(join(__dirname, '../renderer/break/index.html'))
    load.then(() => win.webContents.send(IPC.breakStart, payload))
    this.win = win
  }

  close(): void {
    this.win?.close()
    this.win = null
  }
}
```

- [ ] **Step 2: BreakController**

`src/main/BreakController.ts`:
```ts
import { SchedulerEngine } from '../shared/scheduler'
import { toSchedulerConfig } from '../shared/settings'
import type { SettingsStore } from './SettingsStore'
import type { OverlayManager } from './OverlayManager'
import type { BreakAction, BreakPayload, StatusPayload } from '../shared/ipc'

export class BreakController {
  private engine: SchedulerEngine
  private ticker: NodeJS.Timeout | null = null

  constructor(
    private settings: SettingsStore,
    private overlay: OverlayManager,
    private broadcastStatus: (s: StatusPayload) => void
  ) {
    this.engine = new SchedulerEngine(toSchedulerConfig(settings.get()))
    settings.onChange((s) => this.engine.updateConfig(toSchedulerConfig(s), Date.now()))
  }

  start(): void {
    this.engine.start(Date.now())
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  private tick(): void {
    const now = Date.now()
    if (this.engine.getStatus() === 'running' && this.engine.isDue(now)) {
      this.beginBreak(now)
    }
    this.broadcastStatus({ status: this.engine.getStatus(), msUntilNext: this.engine.msUntilNext(now) })
  }

  private beginBreak(now: number): void {
    const { type } = this.engine.beginBreak(now)
    const s = this.settings.get()
    const payload: BreakPayload = {
      type,
      durationMs: type === 'short' ? s.short.durationSec * 1000 : s.long.durationSec * 1000,
      strict: type === 'short' ? s.short.strict : s.long.strict,
      theme: s.theme
    }
    this.overlay.show(payload)
  }

  takeBreakNow(): void {
    const now = Date.now()
    this.engine.postpone(0, now) // make the next break due immediately
    this.beginBreak(now)
  }

  handleAction(action: BreakAction): void {
    const now = Date.now()
    if (action === 'complete') this.engine.completeBreak(now)
    else if (action === 'skip') this.engine.skip(now)
    else if (action === 'postpone') this.engine.postpone(5 * 60_000, now)
    this.overlay.close()
  }
}
```

- [ ] **Step 3: TrayController**

`src/main/TrayController.ts`:
```ts
import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'

interface TrayHandlers {
  openPreferences(): void
  takeBreakNow(): void
  quit(): void
}

export class TrayController {
  private tray: Tray

  constructor(private handlers: TrayHandlers) {
    const icon = nativeImage.createFromPath(join(__dirname, '../../resources/trayTemplate.png'))
    icon.setTemplateImage(true)
    this.tray = new Tray(icon)
    this.tray.setToolTip('EyeProtector')
    this.render('—')
  }

  setCountdown(msUntilNext: number): void {
    const totalSec = Math.max(0, Math.round(msUntilNext / 1000))
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
    const ss = String(totalSec % 60).padStart(2, '0')
    this.render(`${mm}:${ss}`)
  }

  private render(countdown: string): void {
    const menu = Menu.buildFromTemplate([
      { label: `Next break in ${countdown}`, enabled: false },
      { type: 'separator' },
      { label: 'Take a break now', click: () => this.handlers.takeBreakNow() },
      { label: 'Preferences…', click: () => this.handlers.openPreferences() },
      { type: 'separator' },
      { label: 'Quit EyeProtector', click: () => this.handlers.quit() }
    ])
    this.tray.setContextMenu(menu)
  }
}
```

- [ ] **Step 4: Create the tray icon asset**

Create a 16×16 monochrome PNG (with a 32×32 `@2x` if convenient) at `resources/trayTemplate.png` — a simple eye outline in solid black on transparent (template images are recolored by macOS). A minimal placeholder eye glyph is acceptable for this milestone.

Run: `ls -la resources/trayTemplate.png`
Expected: file exists, non-zero size.

- [ ] **Step 5: Wire everything in main**

Rewrite `src/main/index.ts`:
```ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SettingsStore } from './SettingsStore'
import { OverlayManager } from './OverlayManager'
import { BreakController } from './BreakController'
import { TrayController } from './TrayController'
import { IPC, type BreakAction, type StatusPayload } from '../shared/ipc'
import type { AppSettings } from '../shared/settings'

let prefsWin: BrowserWindow | null = null
let tray: TrayController

function openPreferences(): void {
  if (prefsWin) {
    prefsWin.show()
    prefsWin.focus()
    return
  }
  prefsWin = new BrowserWindow({
    width: 720,
    height: 560,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  prefsWin.on('ready-to-show', () => prefsWin?.show())
  prefsWin.on('closed', () => {
    prefsWin = null
  })
  if (process.env['ELECTRON_RENDERER_URL']) {
    prefsWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/preferences/index.html`)
  } else {
    prefsWin.loadFile(join(__dirname, '../renderer/preferences/index.html'))
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide() // tray-only app

  const settings = new SettingsStore()
  const overlay = new OverlayManager()

  const broadcastStatus = (s: StatusPayload): void => {
    tray?.setCountdown(s.msUntilNext)
    prefsWin?.webContents.send(IPC.status, s)
  }

  const controller = new BreakController(settings, overlay, broadcastStatus)

  tray = new TrayController({
    openPreferences,
    takeBreakNow: () => controller.takeBreakNow(),
    quit: () => app.quit()
  })

  ipcMain.handle(IPC.getSettings, () => settings.get())
  ipcMain.handle(IPC.setSettings, (_e, patch: Partial<AppSettings>) => settings.set(patch))
  ipcMain.on(IPC.breakAction, (_e, action: BreakAction) => controller.handleAction(action))
  ipcMain.on(IPC.takeBreakNow, () => controller.takeBreakNow())

  controller.start()
  openPreferences()
})

app.on('window-all-closed', () => {
  // Tray app stays alive when windows close; quit only via tray menu.
})
```

- [ ] **Step 6: Run and verify tray + break trigger**

Temporarily set a fast interval to test: run the app, open Preferences (Task 7 adds controls; for now use "Take a break now" from the tray).
Run: `npm run dev`
Expected: a tray icon appears; clicking "Take a break now" opens a fullscreen window (blank until Task 6 builds the UI — that's fine, it confirms the overlay + IPC path work). Quit via the tray menu.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire BreakController, OverlayManager, and tray into main process"
```

---

### Task 6: Animated break overlay renderer

**Files:**
- Create: `src/renderer/break/index.html`
- Create: `src/renderer/break/main.tsx`
- Create: `src/renderer/break/BreakScreen.tsx`
- Create: `src/renderer/break/index.css`
- Modify: `electron.vite.config.ts` (add the `break` renderer entry)

**Interfaces:**
- Consumes: `window.eyeprotector.onBreakStart`, `window.eyeprotector.breakAction` (Task 4); `BreakPayload` (Task 4).
- Produces: the visible break experience — animated backdrop, breathing circle, circular countdown ring, and (gentle mode) Skip / Postpone buttons or (strict mode) a locked countdown.

- [ ] **Step 1: Add the break entry to electron-vite**

In `electron.vite.config.ts`, extend `renderer.build.rollupOptions.input` to:
```ts
input: {
  preferences: resolve('src/renderer/preferences/index.html'),
  break: resolve('src/renderer/break/index.html')
}
```

- [ ] **Step 2: Break HTML + CSS + entry**

`src/renderer/break/index.html`:
```html
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EyeProtector — Break</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

`src/renderer/break/index.css`:
```css
@import "tailwindcss";
html, body, #root { height: 100%; margin: 0; overflow: hidden; }
```

`src/renderer/break/main.tsx`:
```tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BreakScreen } from './BreakScreen'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BreakScreen />
  </React.StrictMode>
)
```

- [ ] **Step 3: BreakScreen component**

`src/renderer/break/BreakScreen.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BreakPayload } from '../../shared/ipc'

export function BreakScreen(): JSX.Element | null {
  const [payload, setPayload] = useState<BreakPayload | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    return window.eyeprotector.onBreakStart((p) => {
      setPayload(p)
      setRemainingMs(p.durationMs)
    })
  }, [])

  useEffect(() => {
    if (!payload) return
    const startedAt = Date.now()
    const id = setInterval(() => {
      const left = Math.max(0, payload.durationMs - (Date.now() - startedAt))
      setRemainingMs(left)
      if (left <= 0) {
        clearInterval(id)
        window.eyeprotector.breakAction('complete')
      }
    }, 200)
    return () => clearInterval(id)
  }, [payload])

  if (!payload) return null

  const totalSec = Math.ceil(remainingMs / 1000)
  const progress = payload.durationMs > 0 ? 1 - remainingMs / payload.durationMs : 1
  const isLong = payload.type === 'long'
  const title = isLong ? 'Time for a long break' : 'Look away and rest your eyes'
  const subtitle = isLong
    ? 'Stand up, stretch, and let your eyes relax.'
    : 'Focus on something ~6 meters away for 20 seconds.'

  return (
    <AnimatePresence>
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Ambient animated gradient backdrop */}
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #1e3a8a, transparent 60%), radial-gradient(circle at 70% 70%, #0f766e, transparent 60%), #0b1220'
          }}
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        {/* Breathing circle + countdown ring */}
        <div className="relative mb-10 flex items-center justify-center">
          <svg width="240" height="240" className="-rotate-90">
            <circle cx="120" cy="120" r="110" stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
            <circle
              cx="120"
              cy="120"
              r="110"
              stroke="white"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={2 * Math.PI * 110 * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.2s linear' }}
            />
          </svg>
          <motion.div
            className="absolute rounded-full bg-white/10 backdrop-blur"
            style={{ width: 150, height: 150 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="absolute text-5xl font-light tabular-nums">{totalSec}</span>
        </div>

        <motion.h1
          className="text-3xl font-semibold"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h1>
        <p className="mt-3 text-white/70">{subtitle}</p>

        {!payload.strict && (
          <motion.div
            className="mt-10 flex gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              className="rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              onClick={() => window.eyeprotector.breakAction('postpone')}
            >
              Postpone 5 min
            </button>
            <button
              className="rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
              onClick={() => window.eyeprotector.breakAction('skip')}
            >
              Skip
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Run and verify the animated break**

Run: `npm run dev`, then use the tray → "Take a break now".
Expected: fullscreen animated break screen — moving gradient, pulsing breathing circle, countdown ring depleting, live seconds. In gentle mode (default) the Skip / Postpone buttons appear and work (window closes, tray countdown resets). Let a short break run out to confirm it auto-completes.

- [ ] **Step 5: Visual polish pass**

Invoke the `frontend-design:frontend-design` skill and refine the break screen's palette, typography, motion easing, and theme hook (`payload.theme`) so it reads as intentional, not templated. Keep the component API unchanged.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: animated fullscreen break overlay (breathing guide + countdown ring)"
```

---

### Task 7: Minimal preferences window (adjust intervals, live status)

**Files:**
- Modify: `src/renderer/preferences/App.tsx`
- Create: `src/renderer/preferences/useSettings.ts`

**Interfaces:**
- Consumes: `window.eyeprotector.getSettings/setSettings/onStatus/takeBreakNow` (Task 4); `AppSettings` (Task 3).
- Produces: a working settings screen so intervals/durations/strict/theme are editable and persist, with a live "next break in mm:ss" readout. (Deep multi-tab settings, themes gallery, and sounds are a later milestone.)

- [ ] **Step 1: Settings hook**

`src/renderer/preferences/useSettings.ts`:
```tsx
import { useEffect, useState } from 'react'
import type { AppSettings } from '../../shared/settings'

export function useSettings(): {
  settings: AppSettings | null
  update: (patch: Partial<AppSettings>) => void
} {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    window.eyeprotector.getSettings().then(setSettings)
  }, [])

  const update = (patch: Partial<AppSettings>): void => {
    window.eyeprotector.setSettings(patch).then(setSettings)
  }

  return { settings, update }
}
```

- [ ] **Step 2: Preferences UI**

Rewrite `src/renderer/preferences/App.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSettings } from './useSettings'
import type { StatusPayload } from '../../shared/ipc'

export function App(): JSX.Element {
  const { settings, update } = useSettings()
  const [status, setStatus] = useState<StatusPayload | null>(null)

  useEffect(() => window.eyeprotector.onStatus(setStatus), [])

  if (!settings) return <div className="min-h-screen bg-slate-900" />

  const mmss = (ms: number): string => {
    const s = Math.max(0, Math.round(ms / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <div className="mx-auto max-w-lg space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">EyeProtector</h1>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm tabular-nums">
            Next break {status ? mmss(status.msUntilNext) : '—'}
          </span>
        </header>

        <Section title="Short break (eye rest)">
          <NumberField label="Every (minutes)" value={settings.short.intervalMin}
            onChange={(v) => update({ short: { ...settings.short, intervalMin: v } })} />
          <NumberField label="For (seconds)" value={settings.short.durationSec}
            onChange={(v) => update({ short: { ...settings.short, durationSec: v } })} />
          <Toggle label="Strict (cannot skip)" checked={settings.short.strict}
            onChange={(v) => update({ short: { ...settings.short, strict: v } })} />
        </Section>

        <Section title="Long break (get up)">
          <NumberField label="Every (minutes)" value={settings.long.intervalMin}
            onChange={(v) => update({ long: { ...settings.long, intervalMin: v } })} />
          <NumberField label="For (seconds)" value={settings.long.durationSec}
            onChange={(v) => update({ long: { ...settings.long, durationSec: v } })} />
          <Toggle label="Strict (cannot skip)" checked={settings.long.strict}
            onChange={(v) => update({ long: { ...settings.long, strict: v } })} />
        </Section>

        <button
          className="rounded-lg bg-teal-500 px-4 py-2 font-medium text-slate-900 hover:bg-teal-400"
          onClick={() => window.eyeprotector.takeBreakNow()}
        >
          Take a break now
        </button>
      </div>
    </div>
  )
}

function Section(props: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-3 rounded-xl bg-slate-800/60 p-5">
      <h2 className="text-lg font-medium">{props.title}</h2>
      {props.children}
    </section>
  )
}

function NumberField(props: { label: string; value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-300">{props.label}</span>
      <input
        type="number"
        min={1}
        className="w-24 rounded-md bg-slate-900 px-3 py-1 text-right"
        value={props.value}
        onChange={(e) => props.onChange(Math.max(1, Number(e.target.value)))}
      />
    </label>
  )
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-300">{props.label}</span>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
    </label>
  )
}
```

- [ ] **Step 3: Run and verify end-to-end**

Run: `npm run dev`
Expected: Preferences shows editable short/long fields + strict toggles + a live "Next break mm:ss" that ticks down. Changing an interval persists (reopen app to confirm). Toggling strict then triggering that break type shows the locked (no-buttons) overlay. "Take a break now" works.

- [ ] **Step 4: Typecheck + commit**

Run: `npm run typecheck` (expected: no errors)
```bash
git add -A
git commit -m "feat: minimal preferences window with live status and persistence"
```

---

## Milestone 1 Complete — Definition of Done

- `npm run dev` launches a tray-based macOS app.
- Short/long breaks fire on schedule; an animated fullscreen overlay appears on the primary display.
- Gentle mode shows working Skip / Postpone; strict mode locks the break.
- Settings (intervals, durations, strict) persist across restarts; tray + preferences show a live countdown.
- `npm test` passes (SchedulerEngine + settings conversion).
- `npm run typecheck` is clean.

## Next plans (each its own spec-aligned plan)

1. **Milestone 2 — System integration:** multi-monitor overlays, `IdleMonitor` (smart skip/reset), autostart, native notifications, pre-break nudge.
2. **Milestone 3 — Depth:** `FullscreenGuard` (don't interrupt fullscreen/DND), themes gallery + custom colors, sounds, custom break messages, deep settings UI, pause schedules.
3. **Milestone 4 — Packaging:** electron-builder targets (`.dmg`/`.exe`/`.AppImage`/`.deb`), icons, GitHub Releases artifacts. (Signing decision revisited here.)
4. **Landing page:** separate brainstorming → spec → plan; links to GitHub Release assets.

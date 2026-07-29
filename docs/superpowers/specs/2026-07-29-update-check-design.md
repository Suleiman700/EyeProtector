# Update Check (Notify-Only, GitHub Releases) — Design Spec

**Date:** 2026-07-29
**Status:** Approved, implementing

## Goal

On launch (and via a manual button), the app checks GitHub Releases for a newer version and,
if one exists, shows a banner with a **Download** link to the release page. Notify-only — no
auto-install (no code signing), and **no new dependencies** (Electron built-in `fetch` +
`shell.openExternal`).

## Decisions (confirmed with author)

- **Feed:** the public repo `iStoreJaber/EyeProtector` — its GitHub Releases are the source of
  truth. (Prerequisite the author owns: purge the leaked API key from history, then make the
  repo public.)
- **Notify-only:** detect + link to the release page; do not download/install.
- **Placement:** a dismissible banner at the top of every preferences page, plus a
  "Check for updates" row on the About page.
- **Timing:** auto-check once per launch (~4s after ready, so startup isn't blocked); manual
  button any time.
- **No embedded token** (repo is public; anonymous API is fine).

## How "newer" is decided

Compare `app.getVersion()` (baked from `package.json`) against the latest release's `tag_name`
(leading `v` stripped) as semver `major.minor.patch`. Newer remote → banner. Equal/older →
nothing. `/releases/latest` already excludes drafts and pre-releases. Discipline: the release
tag must match the built `package.json` version.

## Pure version logic — `src/shared/version.ts` (unit-tested)

```ts
export interface Version { major: number; minor: number; patch: number }
export function parseVersion(raw: string): Version | null   // 'v0.2.0' / '0.2' → {…}; junk → null
export function isNewer(remote: string, current: string): boolean
```

- `parseVersion` strips a leading `v`, splits on `.`, coerces up to three numeric parts
  (missing parts → 0), returns `null` if the first part isn't numeric.
- `isNewer` returns `false` when either side is unparseable (fail safe: never nag on garbage).
  Compares major, then minor, then patch.

## Update checker — `src/main/UpdateChecker.ts`

```ts
type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'error'
interface UpdateInfo { status: UpdateStatus; version?: string; notes?: string; url?: string }
```

- `REPO = 'iStoreJaber/EyeProtector'`; `API = https://api.github.com/repos/${REPO}/releases/latest`.
- `check(): Promise<UpdateInfo>` — `fetch(API, { headers: { 'User-Agent': 'EyeProtector', Accept:
  'application/vnd.github+json' }, signal })` with an `AbortController` ~8s timeout. On HTTP ok,
  read `tag_name`, `body`, `html_url`; `isNewer(tag, app.getVersion())` → `available` (carry
  version/notes/url) else `up-to-date`. Network/HTTP/parse failure → `error`. Caches the last
  non-error result in `last`.
- `getLast(): UpdateInfo` — cached (default `{ status: 'idle' }`).
- `onChange(cb)` — notify listeners; `index.ts` broadcasts to the prefs window.
- Auto-check: `index.ts` calls `check()` once, ~4s after `app.whenReady()`; a failure is
  swallowed (stays silent).

## IPC / preload — `src/shared/ipc.ts`, `src/preload/index.ts`

- `checkUpdate: 'update:check'` — invoke → `checker.check()` (manual button).
- `getUpdate: 'update:get'` — invoke → `checker.getLast()`.
- `updateAvailable: 'update:changed'` — main → prefs window on any status change.
- `openUpdatePage: 'update:open'` — renderer → main → `shell.openExternal(url)`.
- Preload: `checkUpdate()`, `getUpdate()`, `onUpdateChange(cb)`, `openUpdatePage(url)`.

## Renderer

- **Banner** (`App.tsx`): when the cached status is `available`, a dismissible bar above page
  content (below the paused banner): *"EyeProtector {version} is available"* + **What's new**
  (expands `notes`) + **Download** (`openUpdatePage(url)`). Dismiss hides it until next launch
  (local component state). Loads `getUpdate()` on mount, subscribes to `onUpdateChange`.
- **About page** (`AboutPage.tsx`): a "Check for updates" row showing the current version and a
  button; button calls `checkUpdate()` and reflects `checking` / `up to date` / `vX available`
  (Download) / `couldn't check` (error).

## Testing

- Unit (`src/shared/version.test.ts`): `parseVersion` (`v` prefix, two-part `1.2`, junk →
  null); `isNewer` (older/equal/newer, `1.2` vs `1.2.1`, unparseable → false).
- Manual (run app): temporarily point `REPO`/version so the remote tag is higher → banner +
  About row show "available" with a working Download link; equal → "up to date"; offline →
  silent on launch, "couldn't check" on manual.

## Files

**New:** `src/shared/version.ts`, `src/shared/version.test.ts`, `src/main/UpdateChecker.ts`.
**Edit:** `src/shared/ipc.ts`, `src/preload/index.ts`, `src/main/index.ts`,
`src/renderer/preferences/App.tsx`, `src/renderer/preferences/pages/AboutPage.tsx`.

## Out of scope (flagged)

- Building/packaging the installer to attach to a release (`electron-builder`) — separate,
  needs dependency approval.
- Auto-download / silent install (needs code signing).
- Repeating background timer (only once per launch + manual).

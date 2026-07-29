# Releasing EyeProtector

Builds are produced with **electron-builder** and published as **GitHub Releases**; the app's
in-app update check (see `src/main/UpdateChecker.ts`) reads the latest release and notifies
users. Builds are currently **unsigned** (no Apple Developer ID / Windows cert), so users get a
one-time "unidentified developer" / SmartScreen prompt on first launch.

## One-time setup

```bash
npm install          # installs electron-builder (declared in package.json)
```

To publish, export a GitHub token with `repo` scope (store it in your shell keychain / a secret
manager — never commit it, never paste it anywhere shared):

```bash
export GH_TOKEN=<your-token>   # ephemeral, for the publish command only
```

The repo must be **public** for the in-app update check to read releases anonymously
(⚠️ purge the leaked key from git history and rotate it *before* making it public).

## Cutting a release

1. Bump the version in `package.json` (e.g. `0.1.0` → `0.2.0`). The GitHub release tag must
   match this version — electron-builder tags it `v0.2.0` automatically.
2. Build + publish for the current OS:
   ```bash
   npm run dist:publish     # build, package, upload installer + update manifest to a GitHub Release
   ```
   or build locally without publishing:
   ```bash
   npm run dist             # artifacts land in dist/
   ```
3. Because electron-builder only builds for the OS it runs on, run `dist:publish` **on macOS**
   for the `.dmg`/`.zip` and **on Windows** for the `.exe` (or wire a CI matrix later).
4. Publish/verify the GitHub Release. Users on older versions see the update banner on next
   launch and can download from the release page.

## Targets (`electron-builder.yml`)

- **macOS** — `.dmg` + `.zip` (zip is required for the update feed), unsigned (`identity: null`).
- **Windows** — NSIS `.exe` installer.
- **Linux** — AppImage.

## App icon

`build/icon.png` (1024×1024) is the source; electron-builder derives `.icns`/`.ico`/platform
PNGs from it. Regenerate it with `node scripts/gen-icon.mjs`, or replace it with your own
1024×1024 PNG.

## Enabling signed macOS auto-update later

Once you have an Apple Developer ID + notarization credentials: remove `mac.identity: null`,
add signing/notarize config, and switch the renderer/updater from notify-only to
`electron-updater` auto-install. The GitHub publish + `.zip`/`latest-mac.yml` plumbing is
already in place.

import { app } from 'electron'
import { isNewer } from '../shared/version'
import type { UpdateInfo } from '../shared/ipc'

const REPO = 'Suleiman700/EyeProtector'
const API = `https://api.github.com/repos/${REPO}/releases/latest`
const TIMEOUT_MS = 8000

/**
 * Notify-only update check against the repo's public GitHub Releases. No
 * dependency and no auto-install: it compares the latest release tag to the
 * running app version and, if newer, exposes the release URL for the UI to
 * open. Failures (offline, rate-limited, no releases) resolve to `error` and
 * are shown only on a manual check.
 */
export class UpdateChecker {
  private last: UpdateInfo = { status: 'idle' }
  private listeners = new Set<(info: UpdateInfo) => void>()

  getLast(): UpdateInfo {
    return this.last
  }

  onChange(cb: (info: UpdateInfo) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private emit(info: UpdateInfo): UpdateInfo {
    this.last = info
    for (const cb of this.listeners) cb(info)
    return info
  }

  async check(): Promise<UpdateInfo> {
    this.emit({ status: 'checking' })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(API, {
        headers: {
          'User-Agent': 'EyeProtector',
          Accept: 'application/vnd.github+json'
        },
        signal: controller.signal
      })
      if (!res.ok) return this.emit({ status: 'error' })
      const json = (await res.json()) as {
        tag_name?: string
        body?: string
        html_url?: string
      }
      const tag = json.tag_name ?? ''
      if (isNewer(tag, app.getVersion())) {
        return this.emit({
          status: 'available',
          version: tag.replace(/^v/i, ''),
          notes: json.body ?? '',
          url: json.html_url ?? `https://github.com/${REPO}/releases/latest`
        })
      }
      return this.emit({ status: 'up-to-date' })
    } catch {
      return this.emit({ status: 'error' })
    } finally {
      clearTimeout(timer)
    }
  }
}

import Store from 'electron-store'
import { DEFAULT_SETTINGS, type AppSettings } from '../shared/settings'

export class SettingsStore {
  private store: Store<AppSettings>
  private listeners = new Set<(s: AppSettings) => void>()

  constructor() {
    this.store = new Store<AppSettings>({ defaults: DEFAULT_SETTINGS })
  }

  get(): AppSettings {
    // Merge over defaults so configs saved before a new key was added still
    // return a complete, valid settings object — including keys added inside
    // nested groups (e.g. `short.enabled`).
    const stored = this.store.store
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      short: { ...DEFAULT_SETTINGS.short, ...stored.short },
      long: { ...DEFAULT_SETTINGS.long, ...stored.long },
      blink: { ...DEFAULT_SETTINGS.blink, ...stored.blink },
      sound: { ...DEFAULT_SETTINGS.sound, ...stored.sound }
    }
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

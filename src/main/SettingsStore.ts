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
    // return a complete, valid settings object.
    return { ...DEFAULT_SETTINGS, ...this.store.store }
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

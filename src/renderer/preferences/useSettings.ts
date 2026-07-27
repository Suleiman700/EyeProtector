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

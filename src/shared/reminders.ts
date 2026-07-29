/**
 * Pure wellness-reminder model — no Electron, no storage, no clock. Owns the
 * shape of a reminder and the timing/validation helpers, so everything here is
 * deterministic and unit-testable (see reminders.test.ts).
 */

export type ReminderPresentation = 'banner' | 'overlay'

export interface Reminder {
  /** Stable id. Presets use fixed ids ('hydration'…); custom use 'custom-N'. */
  id: string
  emoji: string
  title: string
  message: string
  intervalMin: number
  presentation: ReminderPresentation
  /** banner: auto-dismiss seconds; overlay: on-screen seconds. */
  durationSec: number
  enabled: boolean
  /** Shipped presets can be disabled/reset but never deleted. */
  preset: boolean
}

export const REMINDER_INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120]
export const BANNER_DURATION_OPTIONS = [3, 5, 8, 10, 15, 30]
export const OVERLAY_DURATION_OPTIONS = [10, 20, 30, 45, 60, 120]

const clamp = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Math.round(n)))

export function validateReminder(r: Reminder): Reminder {
  const [lo, hi] = r.presentation === 'overlay' ? [10, 600] : [3, 30]
  const title = r.title.trim()
  return {
    ...r,
    emoji: r.emoji.trim() || '⏰',
    title: title || 'Reminder',
    message: r.message.trim(),
    intervalMin: clamp(r.intervalMin, 1, 240),
    durationSec: clamp(r.durationSec, lo, hi),
    preset: r.preset
  }
}

export function defaultReminders(): Reminder[] {
  const presets: Reminder[] = [
    {
      id: 'hydration',
      emoji: '💧',
      title: 'Time to hydrate',
      message: 'Take a sip of water',
      intervalMin: 45,
      presentation: 'banner',
      durationSec: 8,
      enabled: true,
      preset: true
    },
    {
      id: 'posture',
      emoji: '🪑',
      title: 'Check your posture',
      message: 'Sit up straight, relax your shoulders',
      intervalMin: 30,
      presentation: 'banner',
      durationSec: 8,
      enabled: true,
      preset: true
    },
    {
      id: 'standup',
      emoji: '🚶',
      title: 'Stand up & stretch',
      message: 'Get up and move for a moment',
      intervalMin: 60,
      presentation: 'overlay',
      durationSec: 30,
      enabled: true,
      preset: true
    }
  ]
  return presets.map(validateReminder)
}

export function makeCustomReminder(existingIds: string[]): Reminder {
  let n = existingIds.length + 1
  let id = `custom-${n}`
  while (existingIds.includes(id)) {
    n++
    id = `custom-${n}`
  }
  return validateReminder({
    id,
    emoji: '⏰',
    title: 'New reminder',
    message: 'Time for a quick check-in',
    intervalMin: 30,
    presentation: 'banner',
    durationSec: 8,
    enabled: true,
    preset: false
  })
}

/** Ids of enabled reminders whose scheduled time has arrived. */
export function dueReminders(
  reminders: Reminder[],
  nextAt: Record<string, number>,
  now: number
): string[] {
  return reminders
    .filter((r) => r.enabled && (nextAt[r.id] ?? Infinity) <= now)
    .map((r) => r.id)
}

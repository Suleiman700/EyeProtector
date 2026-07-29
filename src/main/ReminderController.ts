import { dueReminders, type Reminder } from '../shared/reminders'
import type { SettingsStore } from './SettingsStore'
import type { ReminderPresenter } from './ReminderPresenter'
import type { ReminderPayload } from '../shared/ipc'

/**
 * Drives N independent wellness reminders on one 1s ticker (like
 * BlinkController). Each reminder keeps its own nextAt; a due reminder fires
 * only when the screen is free (no break/blink/other reminder), otherwise it
 * simply comes due again next tick. At most one reminder fires per tick.
 */
export class ReminderController {
  private ticker: NodeJS.Timeout | null = null
  private nextAt: Record<string, number> = {}

  constructor(
    private settings: SettingsStore,
    private presenter: ReminderPresenter,
    private isScreenBusy: () => boolean = () => false
  ) {
    this.settings.onChange(() => this.reconcile(Date.now()))
  }

  start(): void {
    this.reconcile(Date.now())
    this.ticker = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
  }

  /** Seed nextAt for new reminders; drop removed ones; keep existing timers. */
  private reconcile(now: number): void {
    const reminders = this.settings.get().reminders
    const next: Record<string, number> = {}
    for (const r of reminders) {
      next[r.id] = this.nextAt[r.id] ?? now + r.intervalMin * 60_000
    }
    this.nextAt = next
  }

  private tick(): void {
    const now = Date.now()
    const reminders = this.settings.get().reminders
    const due = dueReminders(reminders, this.nextAt, now)
    if (due.length === 0) return
    // Reschedule every due reminder regardless of whether we can show it now,
    // so a suppressed reminder doesn't fire in a burst once the screen frees.
    for (const id of due) {
      const r = reminders.find((x) => x.id === id)
      if (r) this.nextAt[id] = now + r.intervalMin * 60_000
    }
    if (this.isScreenBusy()) return
    const r = reminders.find((x) => x.id === due[0])
    if (r) this.presenter.show(this.toPayload(r), { record: true })
  }

  /** Preview from the prefs page — manual, excluded from Insights. */
  triggerNow(id: string): void {
    if (this.isScreenBusy()) return
    const r = this.settings.get().reminders.find((x) => x.id === id)
    if (r) this.presenter.show(this.toPayload(r), { record: false })
  }

  private toPayload(r: Reminder): ReminderPayload {
    return {
      id: r.id,
      icon: r.icon,
      title: r.title,
      message: r.message,
      mode: r.presentation,
      durationSec: r.durationSec
    }
  }
}

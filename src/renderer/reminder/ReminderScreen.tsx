import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReminderPayload } from '../../shared/ipc'

export function ReminderScreen(): JSX.Element | null {
  const [payload, setPayload] = useState<ReminderPayload | null>(null)

  useEffect(() => {
    // Pull in case the push fired before this listener mounted.
    window.eyeprotector.getReminder().then((p) => p && setPayload(p))
    return window.eyeprotector.onReminderShow(setPayload)
  }, [])

  // Overlay mode: ESC skips. The main process also holds a global ESC shortcut
  // (the window never takes focus); this is a focused-window fallback.
  useEffect(() => {
    if (!payload || payload.mode !== 'overlay') return
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.eyeprotector.reminderAction('skip')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [payload])

  if (!payload) return null

  const done = (): void => window.eyeprotector.reminderAction('complete')
  const skip = (): void => window.eyeprotector.reminderAction('skip')

  if (payload.mode === 'banner') {
    return (
      <AnimatePresence>
        <motion.div
          className="flex h-full w-full items-center gap-3 rounded-2xl px-4 py-3 text-white select-none"
          style={{
            background: 'linear-gradient(120deg, #4338CA 0%, #6D28D9 60%, #0F766E 100%)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.28 }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{payload.title}</p>
            {payload.message && (
              <p className="truncate text-[12px] text-white/75">{payload.message}</p>
            )}
          </div>
          <button
            className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-medium transition hover:bg-white/30"
            onClick={done}
          >
            Done
          </button>
          <button
            aria-label="Dismiss"
            className="shrink-0 rounded-full px-1 text-white/60 transition hover:text-white"
            onClick={skip}
          >
            ✕
          </button>
        </motion.div>
      </AnimatePresence>
    )
  }

  // overlay mode
  return (
    <AnimatePresence>
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center text-white select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 30%, #4338CA, transparent 55%), radial-gradient(circle at 70% 70%, #0f766e, transparent 55%), linear-gradient(#0b1220, #0b1220)'
          }}
        />
        <h1 className="text-3xl font-semibold">{payload.title}</h1>
        {payload.message && <p className="mt-3 text-white/70">{payload.message}</p>}
        <div className="mt-10 flex gap-4">
          <button
            className="rounded-full bg-white/15 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/25"
            onClick={skip}
          >
            Skip
          </button>
          <button
            className="rounded-full bg-white/25 px-6 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/40"
            onClick={done}
          >
            Done
          </button>
        </div>
        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
          esc to skip
        </p>
      </motion.div>
    </AnimatePresence>
  )
}

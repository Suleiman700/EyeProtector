import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playChime } from '../shared/chime'
import { BREAK_EXTEND_CAP_MS, type BreakPayload } from '../../shared/ipc'

const RING_R = 110
const RING_C = 2 * Math.PI * RING_R

export function BreakScreen(): JSX.Element | null {
  const [payload, setPayload] = useState<BreakPayload | null>(null)
  const [remainingMs, setRemainingMs] = useState(0)
  const [totalMs, setTotalMs] = useState(0)
  // Added by the ↑ / + shortcut; read inside the interval via a ref so extending
  // never resets the countdown.
  const extraRef = useRef(0)

  useEffect(
    () =>
      window.eyeprotector.onBreakExtend((ms) => {
        extraRef.current = Math.min(BREAK_EXTEND_CAP_MS, extraRef.current + ms)
      }),
    []
  )

  useEffect(() => {
    // Pull in case the push already fired before this listener mounted
    // (avoids a blank overlay when the window loads slower than the send).
    window.eyeprotector.getBreak().then((p) => {
      if (p) {
        setPayload(p)
        setRemainingMs(p.durationMs)
      }
    })
    return window.eyeprotector.onBreakStart((p) => {
      setPayload(p)
      setRemainingMs(p.durationMs)
    })
  }, [])

  useEffect(() => {
    if (!payload) return
    extraRef.current = 0
    setTotalMs(payload.durationMs)
    // On multi-monitor, only the primary window plays the chime and drives
    // completion — otherwise every screen would chime and fire 'complete'.
    if (payload.primary) {
      window.eyeprotector.getSettings().then((s) => {
        if (s.sound.enabled) playChime(s.sound.volume)
      })
    }
    const startedAt = Date.now()
    const id = setInterval(() => {
      const total = payload.durationMs + extraRef.current
      const left = Math.max(0, total - (Date.now() - startedAt))
      setRemainingMs(left)
      setTotalMs(total)
      if (left <= 0) {
        clearInterval(id)
        if (payload.primary) window.eyeprotector.breakAction('complete')
      }
    }, 200)
    return () => clearInterval(id)
  }, [payload])

  useEffect(() => {
    if (!payload || payload.strict) return
    const h = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.eyeprotector.breakAction('skip')
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [payload])

  if (!payload) return null

  const totalSec = Math.ceil(remainingMs / 1000)
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 1
  const isLong = payload.type === 'long'
  const title = isLong ? 'Time for a long break' : 'Look away and rest your eyes'
  const subtitle = isLong
    ? 'Stand up, stretch, and let your eyes relax.'
    : 'Focus on something about 6 meters away for a moment.'

  return (
    <AnimatePresence>
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center text-white select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Ambient animated gradient backdrop */}
        <motion.div
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 30%, #1e3a8a, transparent 55%), radial-gradient(circle at 70% 70%, #0f766e, transparent 55%), linear-gradient(#0b1220, #0b1220)',
            backgroundSize: '200% 200%'
          }}
          animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />

        {/* Breathing circle + countdown ring */}
        <div className="relative mb-12 flex items-center justify-center">
          <svg width="240" height="240" className="-rotate-90">
            <circle cx="120" cy="120" r={RING_R} stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
            <circle
              cx="120"
              cy="120"
              r={RING_R}
              stroke="white"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress)}
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

        {!payload.strict && (
          <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
            X skip · P postpone · ↑ add 1 min
          </p>
        )}

        {payload.strict && (
          <>
            <p className="mt-10 text-sm text-white/40">
              Strict break — please wait until it ends.
            </p>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
              ↑ add 1 min
            </p>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { playChime } from '../shared/chime'

/** Only the primary display's window plays the chime and drives blinkDone. */
const IS_PRIMARY = new URLSearchParams(window.location.search).get('primary') === '1'

/**
 * The blink mascot: the same circle-ring face used on the preferences
 * feature card — capsule eyes inside an outlined circle that double-blink
 * shut into ^^ arcs (pure CSS, see index.css). Rendered on its own
 * fully-opaque window above the 50% blue frost; window fades are handled
 * by the main process, ESC-to-dismiss is a global shortcut held while
 * visible.
 */
export function BlinkScreen(): JSX.Element {
  const [durationSec, setDurationSec] = useState(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    window.eyeprotector.getSettings().then((s) => {
      setDurationSec(s.blink.durationSec)
      if (IS_PRIMARY) {
        if (s.sound.enabled) playChime(s.sound.volume)
        timer = setTimeout(() => window.eyeprotector.blinkDone(), s.blink.durationSec * 1000)
      }
    })
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center">
      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, -7, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            style={{ filter: 'drop-shadow(0 10px 32px rgba(7,17,32,0.55))' }}
          >
            {/* Circle ring, same face as the preferences card */}
            <circle cx="120" cy="120" r="96" stroke="#F8FAFC" strokeWidth="13" fill="none" />
            {/* Open eyes — capsules that squash shut (CSS) ... */}
            <rect className="blink-eye" x="86" y="96" width="18" height="46" rx="9" fill="#F8FAFC" />
            <rect className="blink-eye" x="136" y="96" width="18" height="46" rx="9" fill="#F8FAFC" />
            {/* ...revealing the closed ^^ arcs at the blink moments */}
            <path
              className="blink-arc"
              d="M82 130 q13 -18 26 0"
              fill="none"
              stroke="#F8FAFC"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path
              className="blink-arc"
              d="M132 130 q13 -18 26 0"
              fill="none"
              stroke="#F8FAFC"
              strokeWidth="11"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        <p
          className="mt-3 text-4xl font-light tracking-wide text-white"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
            textShadow: '0 2px 16px rgba(7,17,32,0.6)'
          }}
        >
          Blink
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-white/60">
          rest your eyes
        </p>

        {/* Time-left bar: drains 100% → 0% over the blink duration. */}
        <div
          className="mt-6 h-1.5 w-[240px] overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(248,250,252,0.15)' }}
        >
          {durationSec > 0 && (
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #A5F3FC 0%, #93C5FD 60%, #C4B5FD 100%)',
                boxShadow: '0 0 12px rgba(147,197,253,0.7)'
              }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: durationSec, ease: 'linear' }}
            />
          )}
        </div>

        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
          esc to dismiss
        </p>
      </motion.div>
    </div>
  )
}

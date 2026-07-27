import { useEffect } from 'react'
import { motion } from 'framer-motion'

/**
 * The blink mascot: a friendly LookAway-style face — two capsule eyes that
 * double-blink (pure CSS, see index.css) over a gentle smile. Rendered on
 * its own fully-opaque window above the 50% blue frost; window fades are
 * handled by the main process, ESC-to-dismiss is a global shortcut held
 * while visible.
 */
export function BlinkScreen(): JSX.Element {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    window.eyeprotector.getSettings().then((s) => {
      timer = setTimeout(() => window.eyeprotector.blinkDone(), s.blink.durationSec * 1000)
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
            height="200"
            viewBox="0 0 240 200"
            style={{ filter: 'drop-shadow(0 10px 32px rgba(7,17,32,0.55))' }}
          >
            {/* Eyes — capsules that squash shut and pop back open (CSS) */}
            <rect className="blink-eye" x="62" y="38" width="34" height="84" rx="17" fill="#F8FAFC" />
            <rect className="blink-eye" x="144" y="38" width="34" height="84" rx="17" fill="#F8FAFC" />
            {/* Smile */}
            <path
              d="M 88 152 Q 120 176 152 152"
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
        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
          esc to dismiss
        </p>
      </motion.div>
    </div>
  )
}

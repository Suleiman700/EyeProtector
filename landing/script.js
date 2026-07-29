/* EyeProtector landing — reveal-on-scroll, live countdown ring, parallax glows */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- reveal on scroll (staggered within grids) ---------- */
const revealEls = document.querySelectorAll('.reveal')
if (reduceMotion) {
  revealEls.forEach((el) => el.classList.add('in'))
} else {
  // Stagger siblings that arrive in the same grid
  document.querySelectorAll('.feature-grid, .steps').forEach((grid) => {
    Array.from(grid.children).forEach((child, i) => {
      child.style.setProperty('--d', `${i * 0.08}s`)
    })
  })
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  )
  revealEls.forEach((el) => io.observe(el))
}

/* ---------- live break countdown (20s loop, matches the app) ---------- */
const RING_R = 104
const RING_C = 2 * Math.PI * RING_R
const DURATION = 20_000

const ring = document.getElementById('ringProgress')
const count = document.getElementById('breakCount')

if (ring && count) {
  ring.style.strokeDasharray = String(RING_C)

  if (reduceMotion) {
    // Frozen mid-break: enough to communicate, no motion
    ring.style.strokeDashoffset = String(RING_C * 0.4)
    count.textContent = '12'
  } else {
    let start = performance.now()
    const tick = (now) => {
      let elapsed = now - start
      if (elapsed >= DURATION + 1200) {
        // brief hold at 0, then restart the loop
        start = now
        elapsed = 0
      }
      const clamped = Math.min(elapsed, DURATION)
      const progress = clamped / DURATION
      ring.style.strokeDashoffset = String(RING_C * (1 - progress))
      count.textContent = String(Math.max(0, Math.ceil((DURATION - clamped) / 1000)))
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }
}

/* ---------- gentle parallax on hero glows ---------- */
if (!reduceMotion) {
  const glowA = document.querySelector('.hero-glow-a')
  const glowB = document.querySelector('.hero-glow-b')
  if (glowA && glowB) {
    let raf = null
    window.addEventListener(
      'scroll',
      () => {
        if (raf) return
        raf = requestAnimationFrame(() => {
          const y = window.scrollY
          glowA.style.transform = `translateY(${y * 0.12}px)`
          glowB.style.transform = `translateY(${y * -0.08}px)`
          raf = null
        })
      },
      { passive: true }
    )
  }
}

/* ---------- ticking "Next break" pill in the prefs mockup ---------- */
const nextPill = document.querySelector('.next-pill')
if (nextPill && !reduceMotion) {
  let secs = 14 * 60 + 26
  setInterval(() => {
    secs = secs > 0 ? secs - 1 : 19 * 60 + 59
    const m = String(Math.floor(secs / 60)).padStart(2, '0')
    const s = String(secs % 60).padStart(2, '0')
    nextPill.textContent = `Next break ${m}:${s}`
  }, 1000)
}

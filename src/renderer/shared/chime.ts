/**
 * Soft two-note WebAudio chime played when an overlay appears.
 * Volume is the user's 0..1 sound setting; no audio assets needed.
 */
export function playChime(volume: number): void {
  if (volume <= 0) return
  const ctx = new AudioContext()
  const master = ctx.createGain()
  master.gain.value = Math.min(1, volume) * 0.28
  master.connect(ctx.destination)

  const note = (freq: number, at: number, dur: number): void => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, ctx.currentTime + at)
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur)
    osc.connect(gain)
    gain.connect(master)
    osc.start(ctx.currentTime + at)
    osc.stop(ctx.currentTime + at + dur + 0.05)
  }

  note(660, 0, 0.5)
  note(880, 0.12, 0.6)
  setTimeout(() => void ctx.close(), 1200)
}

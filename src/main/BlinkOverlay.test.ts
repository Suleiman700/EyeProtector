import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * A minimal BrowserWindow stand-in. `windows` records every instance created,
 * so a test can inspect how many are still open (i.e. `close()` was never
 * called on them). Defined inside `vi.hoisted` so the hoisted `vi.mock` factory
 * below can reference it.
 */
const { windows, MockWin } = vi.hoisted(() => {
  class MockWin {
    private listeners: Record<string, Array<() => void>> = {}
    destroyed = false
    closeCalled = false
    private opacity = 0

    constructor() {
      windows.push(this)
    }

    on(event: string, cb: () => void): void {
      ;(this.listeners[event] ||= []).push(cb)
    }

    emit(event: string): void {
      for (const cb of this.listeners[event] ?? []) cb()
    }

    close(): void {
      this.closeCalled = true
    }

    isDestroyed(): boolean {
      return this.destroyed
    }

    getOpacity(): number {
      return this.opacity
    }

    setOpacity(v: number): void {
      this.opacity = v
    }

    setAlwaysOnTop(): void {}
    setIgnoreMouseEvents(): void {}
    setVisibleOnAllWorkspaces(): void {}
    showInactive(): void {}
    loadURL(): Promise<void> {
      return Promise.resolve()
    }
    loadFile(): Promise<void> {
      return Promise.resolve()
    }
  }
  const windows: MockWin[] = []
  return { windows, MockWin }
})

vi.mock('electron', () => ({
  BrowserWindow: MockWin,
  screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 100, height: 100 } }) },
  globalShortcut: { register: vi.fn(), unregister: vi.fn() }
}))

// Imported after the mock is registered.
import { BlinkOverlay } from './BlinkOverlay'

describe('BlinkOverlay rapid re-show', () => {
  beforeEach(() => {
    windows.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('replaces the current overlay instead of stacking, even when a stale closed event fires late', () => {
    const overlay = new BlinkOverlay()

    overlay.show() // pair #1
    const stalePair = windows.slice()

    overlay.show() // should close pair #1, open pair #2

    // The OS delivers the first pair's `closed` events only now — after they
    // were already replaced. A naive handler nulls the refs to the live pair.
    for (const w of stalePair) w.emit('closed')

    overlay.show() // must close pair #2 before opening pair #3

    const stillOpen = windows.filter((w) => !w.closeCalled)
    expect(stillOpen.length).toBe(2)
  })
})

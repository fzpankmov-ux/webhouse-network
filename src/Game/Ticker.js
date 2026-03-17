/**
 * Ticker — Main game loop with priority-based event system
 *
 * Bruno Simon uses priority levels to control execution order:
 * 1-2: Input + pre-physics
 * 3-5: Physics step
 * 6-8: Post-physics + camera + world updates
 * 9: Rendering
 *
 * Usage:
 *   this.game.ticker.on('tick', (delta, elapsed) => { ... }, priority)
 */
export default class Ticker {
  constructor(game) {
    this.game = game
    this.listeners = [] // { callback, priority, context }
    this.clock = { start: 0, elapsed: 0, delta: 0, last: 0 }
    this.running = false
    this.rafId = null
  }

  /**
   * Register a tick listener with priority (lower = runs first)
   */
  on(callback, priority = 5, context = null) {
    this.listeners.push({ callback, priority, context })
    this.listeners.sort((a, b) => a.priority - b.priority)
    return this
  }

  /**
   * Remove a listener
   */
  off(callback) {
    this.listeners = this.listeners.filter(l => l.callback !== callback)
  }

  start() {
    if (this.running) return
    this.running = true
    this.clock.start = performance.now()
    this.clock.last = this.clock.start
    this._tick()
  }

  stop() {
    this.running = false
    if (this.rafId) cancelAnimationFrame(this.rafId)
  }

  _tick() {
    if (!this.running) return

    const now = performance.now()
    this.clock.delta = Math.min((now - this.clock.last) / 1000, 0.05) // Cap at 50ms
    this.clock.elapsed = (now - this.clock.start) / 1000
    this.clock.last = now

    const dt = this.clock.delta
    const elapsed = this.clock.elapsed

    // Update game time
    this.game.update(dt, elapsed)

    // Fire all listeners in priority order
    for (const listener of this.listeners) {
      listener.callback.call(listener.context, dt, elapsed)
    }

    this.rafId = requestAnimationFrame(() => this._tick())
  }

  destroy() {
    this.stop()
    this.listeners = []
  }
}

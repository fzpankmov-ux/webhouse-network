import * as THREE from 'three'

/**
 * Wind — Procedural wind field using Perlin noise
 *
 * Bruno Simon's wind system:
 * - Two octaves of Perlin noise sampled at world position
 * - Direction: fixed angle (0.6π radians)
 * - Noise UVs scroll over time for animation
 * - Strength remapped from weather (0-1 → 0.1-1)
 * - Used by Grass, Trees, Leaves, Flags, etc.
 *
 * For our simplified version, we provide a getOffset(x, z)
 * method that returns a wind displacement vector.
 */
export default class Wind {
  constructor(game) {
    this.game = game

    this.direction = new THREE.Vector2(
      Math.cos(0.6 * Math.PI),
      Math.sin(0.6 * Math.PI)
    )
    this.strength = 0.4
    this.frequency = 0.08
    this.time = 0

    game.ticker.on((dt) => {
      this.time += dt
    }, 9)
  }

  /**
   * Get wind offset at world position
   * Uses simplified noise (sin-based approximation)
   */
  getOffset(x, z) {
    const t = this.time
    const f = this.frequency

    // Two octaves of pseudo-noise
    const n1 = Math.sin(x * f * 0.7 + t * 1.2) * Math.cos(z * f * 0.5 + t * 0.8)
    const n2 = Math.sin(x * f * 0.3 + t * 0.4) * Math.cos(z * f * 0.2 + t * 0.3)
    const intensity = (n1 * 0.6 + n2 * 0.4) * this.strength

    return {
      x: this.direction.x * intensity,
      z: this.direction.y * intensity,
    }
  }
}

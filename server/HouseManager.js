/**
 * HouseManager — Assigns house positions in a grid pattern
 *
 * Houses are placed in a spiral grid around the world center.
 * The road runs along Z axis, so houses go to the sides.
 */
export default class HouseManager {
  constructor() {
    // Pre-defined house positions (spiral outward from center)
    this.plots = [
      // Row 1 — close to spawn, along the crossroad
      { x: -25, z: -20, taken: false, playerId: null },
      { x: 25, z: -20, taken: false, playerId: null },
      // Row 2
      { x: -55, z: -20, taken: false, playerId: null },
      { x: 55, z: -20, taken: false, playerId: null },
      // Row 3 — deeper
      { x: -25, z: -55, taken: false, playerId: null },
      { x: 25, z: -55, taken: false, playerId: null },
      { x: 0, z: -45, taken: false, playerId: null },
      // Row 4 — far
      { x: -55, z: -55, taken: false, playerId: null },
      { x: 55, z: -55, taken: false, playerId: null },
      // Row 5 — even further
      { x: -85, z: -20, taken: false, playerId: null },
      { x: 85, z: -20, taken: false, playerId: null },
      { x: -85, z: -55, taken: false, playerId: null },
      { x: 85, z: -55, taken: false, playerId: null },
      // Row 6
      { x: -25, z: -85, taken: false, playerId: null },
      { x: 25, z: -85, taken: false, playerId: null },
      { x: 0, z: -75, taken: false, playerId: null },
    ]
  }

  /**
   * Assign the next available plot to a player
   * @returns {{ x: number, z: number } | null}
   */
  assignPlot(playerId) {
    const plot = this.plots.find(p => !p.taken)
    if (!plot) return null

    plot.taken = true
    plot.playerId = playerId
    return { x: plot.x, z: plot.z }
  }

  /**
   * Release a plot when a player disconnects permanently
   */
  releasePlot(playerId) {
    const plot = this.plots.find(p => p.playerId === playerId)
    if (plot) {
      plot.taken = false
      plot.playerId = null
    }
  }

  /**
   * Get the plot assigned to a specific player
   */
  getPlot(playerId) {
    return this.plots.find(p => p.playerId === playerId) || null
  }
}

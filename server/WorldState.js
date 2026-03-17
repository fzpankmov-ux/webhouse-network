/**
 * WorldState — In-memory state for the multiplayer world
 *
 * Tracks all connected players and their houses.
 * No database — everything is in memory for now.
 */
export default class WorldState {
  constructor() {
    /** @type {Map<string, PlayerState>} */
    this.players = new Map()

    /** @type {Map<string, HouseState>} */
    this.houses = new Map()
  }

  // ─── Players ───────────────────────────────────────

  addPlayer(id, data) {
    const player = {
      id,
      name: data.name || 'Anónimo',
      color: data.color || this._randomColor(),
      position: { x: 0, y: 0, z: 10 }, // spawn point
      angle: 0,
      speed: 0,
      steering: 0,
      houseId: null,
      lastUpdate: Date.now(),
    }
    this.players.set(id, player)
    return player
  }

  removePlayer(id) {
    this.players.delete(id)
  }

  updatePlayer(id, data) {
    const player = this.players.get(id)
    if (!player) return

    if (data.position) {
      player.position.x = data.position.x
      player.position.y = data.position.y || 0
      player.position.z = data.position.z
    }
    if (data.angle !== undefined) player.angle = data.angle
    if (data.speed !== undefined) player.speed = data.speed
    if (data.steering !== undefined) player.steering = data.steering
    player.lastUpdate = Date.now()
  }

  getPlayer(id) {
    return this.players.get(id)
  }

  // ─── Houses ────────────────────────────────────────

  addHouse(id, data) {
    const house = {
      id,
      owner: data.owner || 'Anónimo',
      name: data.name || `Casa de ${data.owner || 'Anónimo'}`,
      position: data.position, // [x, y, z]
      initial: data.initial || (data.owner || 'A')[0].toUpperCase(),
      tagline: data.tagline || 'Nuevo vecino del metaverso',
      url: data.url || '',
      color1: data.color1 || this._randomColor(),
      color2: data.color2 || this._randomColor(),
      theme: data.theme || 'default',
      posts: 0,
      friends: 0,
      visits: 0,
      rooms: data.rooms || ['Lobby'],
    }
    this.houses.set(id, house)
    return house
  }

  removeHouse(id) {
    this.houses.delete(id)
  }

  // ─── Snapshots ─────────────────────────────────────

  /**
   * Get full world state for a newly connecting client
   */
  getSnapshot() {
    const players = {}
    for (const [id, p] of this.players) {
      players[id] = {
        id: p.id,
        name: p.name,
        color: p.color,
        position: p.position,
        angle: p.angle,
        speed: p.speed,
        steering: p.steering,
      }
    }

    const houses = {}
    for (const [id, h] of this.houses) {
      houses[id] = { ...h }
    }

    return { players, houses }
  }

  /**
   * Get compact position data for broadcast tick
   */
  getPositionsTick() {
    const data = {}
    for (const [id, p] of this.players) {
      data[id] = {
        x: Math.round(p.position.x * 100) / 100,
        z: Math.round(p.position.z * 100) / 100,
        angle: Math.round(p.angle * 1000) / 1000,
        speed: Math.round(p.speed * 10) / 10,
        steering: Math.round(p.steering * 100) / 100,
      }
    }
    return data
  }

  // ─── Helpers ───────────────────────────────────────

  _randomColor() {
    const colors = [
      '#ff6b2b', '#7c5cff', '#00d4aa', '#ff6d6d', '#ffaa22',
      '#ff44aa', '#44aaff', '#d8cf3b', '#ff4f2b', '#b678ff',
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
}

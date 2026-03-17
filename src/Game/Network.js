import { io } from 'socket.io-client'

/**
 * Network — Client-side multiplayer networking via Socket.io
 *
 * Connects to the WebHouse server, sends local player position,
 * receives remote player positions and house data.
 */
export default class Network {
  constructor(game, playerInfo) {
    this.game = game
    this.playerId = null
    this.connected = false
    this.playerInfo = playerInfo

    // Send rate limiting
    this._sendFrame = 0
    this._sendEvery = 3  // Send every 3 frames (~20Hz at 60fps)

    // Connect to server — uses Vite proxy (/socket.io → localhost:3001)
    // Works for both local dev and remote tunnel access
    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    this._setupListeners()

    // Register on ticker — send position updates
    game.ticker.on((dt) => this._sendUpdate(dt), 2)
  }

  _setupListeners() {
    const socket = this.socket

    socket.on('connect', () => {
      console.log('[Network] Connected to server')
      this.connected = true

      // Send join with player info
      socket.emit('join', this.playerInfo)
    })

    socket.on('disconnect', () => {
      console.log('[Network] Disconnected from server')
      this.connected = false
    })

    // Receive full world state on initial connect
    socket.on('world-state', (data) => {
      console.log('[Network] Received world state:', Object.keys(data.houses).length, 'houses,', Object.keys(data.players).length, 'players')
      this.playerId = data.yourId

      // Add all houses to the world
      for (const [id, houseData] of Object.entries(data.houses)) {
        this.game.world.addHouse(houseData)
      }

      // Add all remote players as ghost cars
      for (const [id, playerData] of Object.entries(data.players)) {
        if (id !== this.playerId) {
          this.game.ghostPlayers.addPlayer(id, playerData)
        }
      }

      // Update HUD
      this._updateHUDCount()
    })

    // A new player joined
    socket.on('player-joined', (data) => {
      console.log(`[Network] Player joined: ${data.player.name}`)

      // Add their house
      if (data.house) {
        this.game.world.addHouse(data.house)
      }

      // Add their ghost car
      this.game.ghostPlayers.addPlayer(data.player.id, data.player)

      this._updateHUDCount()
    })

    // Player left (permanent — after grace period)
    socket.on('player-left', (data) => {
      console.log(`[Network] Player left permanently: ${data.id}`)
      this.game.ghostPlayers.removePlayer(data.id)
      this.game.world.removeHouse(data.id)
      this._updateHUDCount()
    })

    // Player left temporarily (still in grace period)
    socket.on('player-left-temp', (data) => {
      this.game.ghostPlayers.removePlayer(data.id)
    })

    // Receive position broadcast
    socket.on('world-tick', (positions) => {
      if (!this.playerId) return
      this.game.ghostPlayers.updateAll(positions, this.playerId)
    })

    // World is full
    socket.on('world-full', () => {
      console.warn('[Network] World is full! No plots available.')
    })

    socket.on('connect_error', (err) => {
      console.warn('[Network] Connection error:', err.message)
    })
  }

  _sendUpdate(dt) {
    if (!this.connected || !this.playerId) return

    this._sendFrame++
    if (this._sendFrame % this._sendEvery !== 0) return

    const player = this.game.player
    if (!player?.mesh) return

    this.socket.volatile.emit('player-update', {
      position: {
        x: player.mesh.position.x,
        y: player.mesh.position.y,
        z: player.mesh.position.z,
      },
      angle: player.angle,
      speed: player.speed,
      steering: player.steeringAngle,
    })
  }

  _updateHUDCount() {
    const count = this.game.world.houses.length
    const badge = document.getElementById('hud-houses')
    if (badge) {
      badge.textContent = `${count} casas online`
    }
  }

  destroy() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

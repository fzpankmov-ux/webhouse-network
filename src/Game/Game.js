import * as THREE from 'three'
import Ticker from './Ticker.js'
import Rendering from './Rendering.js'
import View from './View.js'
import Player from './Player.js'
import World from './World/World.js'
import Lighting from './Lighting.js'
import Wind from './Wind.js'
import HUD from './HUD.js'
import GhostPlayers from './GhostPlayers.js'
import Network from './Network.js'

/**
 * Main Game class — orchestrates all systems
 *
 * Now with multiplayer support via Socket.io
 */
export default class Game {
  constructor(options) {
    this.canvas = options.canvas
    this.housesData = [] // Houses come from the server now
    this.playerInfo = options.playerInfo || { name: 'Anónimo' }

    // Core
    this.scene = new THREE.Scene()
    this.time = { elapsed: 0, delta: 0 }

    // Systems (initialized in order)
    this.ticker = new Ticker(this)           // 1. Update loop
    this.rendering = new Rendering(this)     // 2. WebGL renderer
    this.view = new View(this)               // 3. Camera (magnet system)
    this.lighting = new Lighting(this)       // 4. Lights + shadows
    this.wind = new Wind(this)               // 5. Procedural wind
    this.world = new World(this)             // 6. Floor, houses, trees, etc.
    this.player = new Player(this)           // 7. Vehicle + controls
    this.hud = new HUD(this)                 // 8. UI overlay
    this.ghostPlayers = new GhostPlayers(this) // 9. Remote players

    // Network — connects to server and populates houses + ghost players
    this.network = new Network(this, this.playerInfo) // 10. Networking

    // Hide loader
    setTimeout(() => {
      const loader = document.getElementById('loader')
      if (loader) loader.classList.add('hidden')
    }, 800)

    // Start
    this.ticker.start()

    console.log('[WebHouse] Game initialized')
  }

  /**
   * Called by Ticker every frame
   */
  update(delta, elapsed) {
    this.time.delta = delta
    this.time.elapsed = elapsed
  }

  destroy() {
    this.ticker.destroy()
    this.rendering.destroy()
    this.network?.destroy()
  }
}

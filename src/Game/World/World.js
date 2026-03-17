import * as THREE from 'three'
import Floor from './Floor.js'
import House from './House.js'
import Trees from './Trees.js'
import Scenery from './Scenery.js'
import Grass from './Grass.js'

/**
 * World — Composes all world elements
 *
 * Now supports dynamic house addition/removal for multiplayer.
 * Houses are no longer hardcoded — they come from the server.
 */
export default class World {
  constructor(game) {
    this.game = game
    this.houses = []
    this.panelOpen = false
    this.nearHouse = null
    this.currentHouse = null

    // Build world elements
    this.floor = new Floor(game)
    this.grass = new Grass(game)
    this.trees = new Trees(game)
    this.scenery = new Scenery(game)

    // Houses are added dynamically via addHouse() from Network.js
    // No more hardcoded houses here

    // Sky
    this._buildSky()

    // Proximity check
    game.ticker.on((dt, elapsed) => this._checkProximity(elapsed), 8)
  }

  /**
   * Dynamically add a house to the world (called by Network.js)
   */
  addHouse(houseData) {
    // Check if house already exists
    const existing = this.houses.find(h => h.data.id === houseData.id)
    if (existing) return existing

    const house = new House(this.game, houseData)
    this.houses.push(house)

    // Update HUD badge
    const badge = document.getElementById('hud-houses')
    if (badge) badge.textContent = `${this.houses.length} casas online`

    console.log(`[World] House added: ${houseData.name} at [${houseData.position}]`)
    return house
  }

  /**
   * Remove a house from the world (when player permanently disconnects)
   */
  removeHouse(houseId) {
    const index = this.houses.findIndex(h => h.data.id === houseId)
    if (index === -1) return

    const house = this.houses[index]

    // Remove from scene
    this.game.scene.remove(house.mesh)

    // Dispose geometries and materials
    house.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })

    this.houses.splice(index, 1)

    // Update HUD badge
    const badge = document.getElementById('hud-houses')
    if (badge) badge.textContent = `${this.houses.length} casas online`

    console.log(`[World] House removed: ${houseId}`)
  }

  _buildSky() {
    const skyGeo = new THREE.SphereGeometry(180, 32, 32)
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x1a1250) },    // deep space purple
        midColor: { value: new THREE.Color(0x5a3088) },    // vibrant mid purple
        bottomColor: { value: new THREE.Color(0xaa55cc) }, // warm glowing horizon
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor, midColor, bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = max(h, 0.0);
          // 3-stop gradient: bottom (horizon) -> mid -> top (zenith)
          vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.15, t));
          color = mix(color, topColor, smoothstep(0.15, 0.6, t));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    })
    this.game.scene.add(new THREE.Mesh(skyGeo, skyMat))

    // Stars
    const starsGeo = new THREE.BufferGeometry()
    const count = 3000
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i*3] = (Math.random() - 0.5) * 400
      pos[i*3+1] = 30 + Math.random() * 100
      pos[i*3+2] = (Math.random() - 0.5) * 400
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.game.scene.add(new THREE.Points(starsGeo,
      new THREE.PointsMaterial({ color: 0xccccff, size: 0.3, transparent: true, opacity: 0.7 })
    ))
  }

  _checkProximity(elapsed) {
    if (this.panelOpen) return

    const player = this.game.player
    if (!player?.mesh) return

    this.nearHouse = null

    for (const house of this.houses) {
      const dist = player.mesh.position.distanceTo(house.mesh.position)

      // Animate house elements
      house.update(elapsed, dist)

      if (dist < 14) {
        this.nearHouse = house
        this.game.hud.showPrompt(`Entrar a ${house.data.name}`)
      }
    }

    if (!this.nearHouse) {
      this.game.hud.hidePrompt()
    }
  }

  tryEnterHouse() {
    if (this.nearHouse && !this.panelOpen) {
      this.panelOpen = true
      this.currentHouse = this.nearHouse
      document.exitPointerLock?.()

      // Open the house's website as a 3D screen on the house wall
      const url = this.nearHouse.data.url
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      this.game.hud.openWebsite(fullUrl, this.nearHouse.data, this.nearHouse.mesh)
    }
  }

  closePanel() {
    this.panelOpen = false
    this.currentHouse = null
    this.game.hud.closeWebsite()
  }
}

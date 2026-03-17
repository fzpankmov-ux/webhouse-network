import * as THREE from 'three'

/**
 * Lighting — Bright dusk/twilight palette inspired by Bruno Simon
 * NOT a dark night — a vibrant, well-lit world with warm/cool contrast
 */
export default class Lighting {
  constructor(game) {
    this.game = game

    // Ambient — warm purple fill so everything is well-lit
    this.ambient = new THREE.AmbientLight(0x9988cc, 2.0)
    game.scene.add(this.ambient)

    // Hemisphere — warm sunset sky / cool blue ground bounce
    this.hemi = new THREE.HemisphereLight(0xffbb77, 0x5577bb, 1.4)
    game.scene.add(this.hemi)

    // Main directional — warm golden light
    this.directional = new THREE.DirectionalLight(0xffeedd, 3.8)
    this.directional.position.set(50, 80, 30)
    this.directional.castShadow = true
    this.directional.shadow.mapSize.set(2048, 2048)
    this.directional.shadow.camera.near = 1
    this.directional.shadow.camera.far = 200
    const s = 80
    this.directional.shadow.camera.left = -s
    this.directional.shadow.camera.right = s
    this.directional.shadow.camera.top = s
    this.directional.shadow.camera.bottom = -s
    this.directional.shadow.bias = -0.001
    this.directional.shadow.normalBias = 0.1
    this.directional.shadow.radius = 3
    game.scene.add(this.directional)

    // Secondary fill light from opposite side (cool blue-purple)
    this.fillLight = new THREE.DirectionalLight(0x7799dd, 1.4)
    this.fillLight.position.set(-30, 40, -20)
    game.scene.add(this.fillLight)

    // Fog — warm purple haze
    game.scene.fog = new THREE.Fog(0x3a2868, 90, 220)
    game.scene.background = new THREE.Color(0x3a2868)

    // Ticker: update shadow camera to follow player
    game.ticker.on((dt) => this.update(dt), 9)
  }

  update(dt) {
    const player = this.game.player
    if (player && player.mesh) {
      this.directional.target.position.copy(player.mesh.position)
      this.directional.position.set(
        player.mesh.position.x + 50,
        80,
        player.mesh.position.z + 30
      )
    }
  }
}

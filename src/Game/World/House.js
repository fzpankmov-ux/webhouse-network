import * as THREE from 'three'

/**
 * House — A 3D building representing a user's personal web space
 * PERFORMANCE: Only 1 PointLight per house (porch). Beacon is emissive-only.
 */
export default class House {
  constructor(game, data) {
    this.game = game
    this.data = data
    this.time = 0

    this.color1 = new THREE.Color(data.color1)
    this.color2 = new THREE.Color(data.color2)

    this.mesh = new THREE.Group()
    this.mesh.position.set(...data.position)

    this._buildStructure()
    this._buildSign()
    this._buildBeacon()

    game.scene.add(this.mesh)
  }

  _buildStructure() {
    const { color1, color2 } = this

    // Foundation
    const found = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.3, 10),
      new THREE.MeshStandardMaterial({ color: 0x5a4878, roughness: 0.85 })
    )
    found.position.y = 0.15; found.receiveShadow = true
    this.mesh.add(found)

    // Main block
    const wallMat = new THREE.MeshStandardMaterial({
      color: color1.clone().multiplyScalar(0.8), roughness: 0.55, metalness: 0.3
    })
    const main = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 7), wallMat)
    main.position.y = 2.8; main.castShadow = true; main.receiveShadow = true
    this.mesh.add(main)

    // Roof
    const roofMat = new THREE.MeshStandardMaterial({
      color: color1.clone().multiplyScalar(0.95), roughness: 0.35, metalness: 0.35
    })
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 8), roofMat)
    roof.position.y = 5.45; roof.castShadow = true
    this.mesh.add(roof)

    // Second floor
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3, 5), wallMat)
    f2.position.set(0.5, 6.95, -0.5); f2.castShadow = true
    this.mesh.add(f2)
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 6), roofMat)
    r2.position.set(0.5, 8.6, -0.5); r2.castShadow = true
    this.mesh.add(r2)

    // Windows (emissive)
    const windowMat = new THREE.MeshStandardMaterial({
      color: color2, emissive: color2, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.95
    })
    this._windowMat = windowMat

    for (let col = -1; col <= 1; col++) {
      for (let row = 0; row < 2; row++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), windowMat)
        win.position.set(col * 2, 1.8 + row * 2, 3.51)
        this.mesh.add(win)
      }
    }
    for (let col = -0.5; col <= 0.5; col += 1) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.4), windowMat)
      win.position.set(col * 2 + 0.5, 7, 2.01)
      this.mesh.add(win)
    }

    // Door
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 2.5),
      new THREE.MeshStandardMaterial({ color: color1, emissive: color1, emissiveIntensity: 0.4, roughness: 0.5 })
    )
    door.position.set(0, 1.55, 3.52)
    this.mesh.add(door)

    // Door frame
    const frameMat = new THREE.MeshStandardMaterial({ color: color2, emissive: color2, emissiveIntensity: 1.2 })
    const fg = new THREE.BoxGeometry(0.12, 2.6, 0.12)
    const fl = new THREE.Mesh(fg, frameMat); fl.position.set(-0.9, 1.6, 3.55); this.mesh.add(fl)
    const fr = new THREE.Mesh(fg, frameMat); fr.position.set(0.9, 1.6, 3.55); this.mesh.add(fr)
    const ft = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), frameMat)
    ft.position.set(0, 2.9, 3.55); this.mesh.add(ft)

    // Corner trims
    const trimMat = new THREE.MeshStandardMaterial({
      color: color2, emissive: color2, emissiveIntensity: 0.6, transparent: true, opacity: 0.5
    })
    const tg = new THREE.BoxGeometry(0.08, 5, 0.08)
    ;[[-3.5, 2.8, 3.5], [3.5, 2.8, 3.5], [-3.5, 2.8, -3.5], [3.5, 2.8, -3.5]].forEach(([x, y, z]) => {
      const t = new THREE.Mesh(tg, trimMat); t.position.set(x, y, z); this.mesh.add(t)
    })

    // Screen frame — glowing border where the website screen appears
    // The CSS3D iframe will be placed at z=4.0 in world space (3.6 local + house offset)
    const screenFrameMat = new THREE.MeshStandardMaterial({
      color: color2, emissive: color2, emissiveIntensity: 1.8,
      transparent: true, opacity: 0.7
    })
    const screenW = 7.2, screenH = 5.0
    // Top bar
    const sfTop = new THREE.Mesh(new THREE.BoxGeometry(screenW, 0.1, 0.1), screenFrameMat)
    sfTop.position.set(0, 4.0 + screenH/2, 4.0); this.mesh.add(sfTop)
    // Bottom bar
    const sfBot = new THREE.Mesh(new THREE.BoxGeometry(screenW, 0.1, 0.1), screenFrameMat)
    sfBot.position.set(0, 4.0 - screenH/2, 4.0); this.mesh.add(sfBot)
    // Left bar
    const sfLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, screenH, 0.1), screenFrameMat)
    sfLeft.position.set(-screenW/2, 4.0, 4.0); this.mesh.add(sfLeft)
    // Right bar
    const sfRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, screenH, 0.1), screenFrameMat)
    sfRight.position.set(screenW/2, 4.0, 4.0); this.mesh.add(sfRight)
    // Dark backing plane behind where iframe appears
    const backingMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a, roughness: 1.0, metalness: 0.0
    })
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(screenW - 0.2, screenH - 0.2), backingMat)
    backing.position.set(0, 4.0, 3.98)
    this.mesh.add(backing)

    // Single porch light (the ONLY PointLight per house)
    this._porchLight = new THREE.PointLight(color2, 2.0, 15, 2)
    this._porchLight.position.set(0, 3.5, 5)
    this.mesh.add(this._porchLight)
  }

  _buildSign() {
    const signG = new THREE.Group()
    const signBack = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.2, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x1a1a3a, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.9 })
    )
    signG.add(signBack)

    const borderMat = new THREE.MeshStandardMaterial({ color: this.color1, emissive: this.color1, emissiveIntensity: 1.0 })
    const hb = new THREE.BoxGeometry(5.2, 0.06, 0.2)
    const st = new THREE.Mesh(hb, borderMat); st.position.y = 0.63; signG.add(st)
    const sb = new THREE.Mesh(hb, borderMat); sb.position.y = -0.63; signG.add(sb)

    signG.position.set(0, 10.5, 0)
    this._sign = signG
    this.mesh.add(signG)
  }

  _buildBeacon() {
    // Emissive-only beacon (NO PointLight to save performance)
    const beaconMat = new THREE.MeshStandardMaterial({
      color: this.color2, emissive: this.color2, emissiveIntensity: 2,
      transparent: true, opacity: 0.9
    })
    this._beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), beaconMat)
    this._beacon.position.set(0.5, 9.0, -0.5)
    this.mesh.add(this._beacon)
  }

  update(elapsed, dist) {
    this.time = elapsed
    const proxFactor = Math.max(0, 1 - dist / 30)

    // Window pulse
    if (this._windowMat) {
      this._windowMat.emissiveIntensity = 0.6 + Math.sin(elapsed * 2) * 0.2 + proxFactor * 0.4
    }

    // Porch light
    if (this._porchLight) {
      this._porchLight.intensity = 1.0 + proxFactor * 2
    }

    // Beacon pulse (emissive only)
    if (this._beacon) {
      this._beacon.material.emissiveIntensity = 1.5 + Math.sin(elapsed * 3) * 0.5
    }

    // Sign float + billboard
    if (this._sign) {
      this._sign.position.y = 10.5 + Math.sin(elapsed * 1.2) * 0.25
      const cam = this.game.view?.camera
      if (cam) {
        this._sign.lookAt(cam.position.x, this._sign.position.y + this.mesh.position.y, cam.position.z)
      }
    }
  }
}

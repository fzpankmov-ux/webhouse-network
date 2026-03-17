import * as THREE from 'three'

/**
 * Scenery — Street lights, rocks, signs, decorative elements
 * PERFORMANCE: Only a few lamps get actual PointLights (max ~6).
 * Rest are visual-only emissive meshes.
 */
export default class Scenery {
  constructor(game) {
    this.game = game
    this.animatedLights = []

    this._buildStreetLights()
    this._buildRocks()
    this._buildSigns()
    this._buildDecorations()

    game.ticker.on((dt, elapsed) => this._animate(elapsed), 9)
  }

  _buildStreetLights() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x6a5888, roughness: 0.45, metalness: 0.65 })
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff0dd, emissive: 0xffddaa, emissiveIntensity: 5 })

    const positions = []
    for (let z = -48; z <= 28; z += 20) { positions.push([-5.5, z]); positions.push([5.5, z]) }
    for (let x = -30; x <= 30; x += 20) { if (Math.abs(x) < 8) continue; positions.push([x, -16]); positions.push([x, -24]) }

    positions.forEach(([x, z], i) => {
      const group = new THREE.Group()

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), poleMat)
      pole.position.y = 2.5; pole.castShadow = true; group.add(pole)

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), poleMat)
      arm.position.set(0.75, 5, 0); group.add(arm)

      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), poleMat)
      housing.position.set(1.5, 4.9, 0); group.add(housing)

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bulbMat)
      bulb.position.set(1.5, 4.8, 0); group.add(bulb)

      // Only every 3rd lamp gets a real PointLight
      if (i % 3 === 0) {
        const light = new THREE.PointLight(0xffcc88, 1.5, 20, 2)
        light.position.set(1.5, 4.7, 0); group.add(light)
        this.animatedLights.push({ light, x })
      }

      group.position.set(x, 0, z)
      this.game.scene.add(group)
    })
  }

  _buildRocks() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a4868, roughness: 0.9 })
    const rng = this._seededRandom(77)
    for (let i = 0; i < 20; i++) {
      const x = (rng() - 0.5) * 200, z = (rng() - 0.5) * 200
      if (Math.abs(x) < 8 && z > -55 && z < 40) continue
      if (Math.abs(z + 20) < 6 && Math.abs(x) < 42) continue
      const sz = 0.3 + rng() * 1.0
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(sz, 0), rockMat)
      rock.position.set(x, sz * 0.3, z)
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
      rock.scale.set(1, 0.5 + rng() * 0.5, 1)
      rock.castShadow = true
      this.game.scene.add(rock)
    }
  }

  _buildSigns() {
    const signMat = new THREE.MeshStandardMaterial({ color: 0x2a2050, roughness: 0.4, metalness: 0.3 })
    const textMat = new THREE.MeshStandardMaterial({ color: 0x9977ff, emissive: 0x7755ee, emissiveIntensity: 1.5 })
    const poleMat2 = new THREE.MeshStandardMaterial({ color: 0x5a4878, roughness: 0.5, metalness: 0.6 })

    ;[{ x: -6, z: -15, ry: 0 }, { x: 6, z: -25, ry: Math.PI }, { x: -10, z: -18, ry: Math.PI / 2 }, { x: 10, z: -22, ry: -Math.PI / 2 }]
      .forEach(({ x, z, ry }) => {
        const group = new THREE.Group()
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), poleMat2); pole.position.y = 1.5; group.add(pole)
        const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 0.08), signMat); board.position.y = 3.2; group.add(board)
        const accent = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 0.1), textMat); accent.position.y = 2.88; group.add(accent)
        group.position.set(x, 0, z); group.rotation.y = ry
        this.game.scene.add(group)
      })
  }

  _buildDecorations() {
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x6a5078, roughness: 0.8, metalness: 0.2 })
    ;[[-5, -8], [-5, -32], [5, -8], [5, -32]].forEach(([x, z]) => {
      const g = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.6), benchMat); seat.position.y = 0.5; g.add(seat)
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.08), benchMat); back.position.set(0, 0.8, -0.26); g.add(back)
      const lg = new THREE.BoxGeometry(0.08, 0.5, 0.08)
      ;[[-0.8, 0.25, 0.2], [0.8, 0.25, 0.2], [-0.8, 0.25, -0.2], [0.8, 0.25, -0.2]].forEach(([lx, ly, lz]) => {
        const l = new THREE.Mesh(lg, benchMat); l.position.set(lx, ly, lz); g.add(l)
      })
      g.position.set(x, 0, z); g.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2
      this.game.scene.add(g)
    })
  }

  _animate(elapsed) {
    for (const sl of this.animatedLights) {
      sl.light.intensity = 1.0 + Math.sin(elapsed * 4 + sl.x * 0.5) * 0.15
    }
  }

  _seededRandom(seed) {
    let s = seed
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  }
}

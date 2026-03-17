import * as THREE from 'three'

/**
 * Trees — Colorful low-poly trees with wind animation
 * Bruno Simon palette: birch #ff4f2b/#ff903f, oak #b4b536/#d8cf3b, cherry #ff6d6d/#ff9990
 */
export default class Trees {
  constructor(game) {
    this.game = game
    this.treeMeshes = []

    this._generateTrees()
    game.ticker.on((dt, elapsed) => this._updateWind(elapsed), 9)
  }

  _generateTrees() {
    const avoidZones = [
      { x: 0, z: -10, r: 12 }, { x: 0, z: -20, r: 45 },
      { x: -25, z: -20, r: 16 }, { x: 25, z: -20, r: 16 },
      { x: 0, z: 10, r: 10 }
    ]
    const isValid = (x, z) => {
      for (const a of avoidZones) { if (Math.hypot(x - a.x, z - a.z) < a.r) return false }
      return true
    }

    const rng = this._seededRandom(42)

    // Warm trunk material
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 0.85 })

    // Bruno Simon's tree colors — vibrant and warm
    const foliageMats = [
      // Birch — orange-red
      new THREE.MeshStandardMaterial({ color: 0xff4f2b, roughness: 0.65, emissive: 0xff4f2b, emissiveIntensity: 0.15 }),
      // Cherry — salmon pink
      new THREE.MeshStandardMaterial({ color: 0xff6d6d, roughness: 0.65, emissive: 0xff6d6d, emissiveIntensity: 0.15 }),
      // Oak — golden yellow
      new THREE.MeshStandardMaterial({ color: 0xd8cf3b, roughness: 0.65, emissive: 0xb4b536, emissiveIntensity: 0.1 }),
    ]

    // Shared geometries
    const trunkGeos = [
      new THREE.CylinderGeometry(0.1, 0.15, 2.5, 6),
      new THREE.CylinderGeometry(0.12, 0.18, 3.3, 6),
      new THREE.CylinderGeometry(0.14, 0.2, 4.1, 6)
    ]
    const foliageGeos = [
      new THREE.ConeGeometry(1.4, 4, 6),          // Pine shape
      new THREE.DodecahedronGeometry(1.8, 1),      // Round bush
      new THREE.IcosahedronGeometry(2.0, 1),       // Organic blob
    ]

    const positions = []
    for (let i = 0; i < 300 && positions.length < 70; i++) {
      const x = (rng() - 0.5) * 240, z = (rng() - 0.5) * 240
      if (isValid(x, z)) positions.push({ x, z })
    }

    positions.forEach(pos => {
      const v = Math.floor(rng() * 3)
      const sc = 0.6 + rng() * 0.8
      const group = new THREE.Group()
      group.position.set(pos.x, 0, pos.z)
      group.rotation.y = rng() * Math.PI * 2

      const tH = [2.5, 3.3, 4.1][v] * sc

      // Trunk
      const trunk = new THREE.Mesh(trunkGeos[v], trunkMat)
      trunk.scale.setScalar(sc)
      trunk.position.y = tH / 2
      trunk.castShadow = true
      group.add(trunk)

      // Foliage — use matching color for variant
      const foliageMat = foliageMats[v]
      let foliage

      if (v === 0) {
        // Conical tree with 2-3 layers
        foliage = new THREE.Group()
        for (let l = 0; l < 2; l++) {
          const cone = new THREE.Mesh(foliageGeos[0], foliageMat)
          cone.scale.setScalar(sc * (1 - l * 0.2))
          cone.position.y = tH + (1.5 + l * 1.5) * sc
          cone.castShadow = true
          foliage.add(cone)
        }
        group.add(foliage)
      } else if (v === 1) {
        // Round bush tree
        foliage = new THREE.Group()
        const sp = new THREE.Mesh(foliageGeos[1], foliageMat)
        sp.scale.setScalar(sc)
        sp.position.y = tH + 0.8 * sc
        sp.castShadow = true
        foliage.add(sp)
        // Secondary smaller cluster
        const sp2 = new THREE.Mesh(foliageGeos[1], foliageMat)
        sp2.scale.setScalar(sc * 0.6)
        sp2.position.set(sc * 0.8, tH + 1.6 * sc, sc * 0.3)
        sp2.castShadow = true
        foliage.add(sp2)
        group.add(foliage)
      } else {
        // Organic blob tree
        foliage = new THREE.Group()
        const blob = new THREE.Mesh(foliageGeos[2], foliageMat)
        blob.scale.set(sc * 1.0, sc * 0.8, sc * 1.0)
        blob.position.y = tH + 1.0 * sc
        blob.castShadow = true
        foliage.add(blob)
        group.add(foliage)
      }

      group.userData.foliage = foliage
      this.treeMeshes.push(group)
      this.game.scene.add(group)
    })
  }

  _updateWind(elapsed) {
    const wind = this.game.wind
    if (!wind) return
    for (const tree of this.treeMeshes) {
      const foliage = tree.userData.foliage
      if (!foliage) continue
      const offset = wind.getOffset(tree.position.x, tree.position.z)
      foliage.rotation.x = offset.z * 0.15
      foliage.rotation.z = offset.x * 0.15
    }
  }

  _seededRandom(seed) {
    let s = seed
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  }
}

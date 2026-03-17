import * as THREE from 'three'

/**
 * GhostPlayers — Renders remote players' cars with interpolation
 *
 * Each ghost car is a simplified version of the player's car
 * (no lights, no particles) with a floating name label.
 * Uses lerp interpolation between server ticks for smooth movement.
 */
export default class GhostPlayers {
  constructor(game) {
    this.game = game

    /** @type {Map<string, GhostCar>} */
    this.ghosts = new Map()

    // Shared geometries and materials (reused for all ghost cars)
    this._sharedGeo = {
      body: new THREE.BoxGeometry(2.2, 0.7, 4.0),
      cabin: new THREE.BoxGeometry(1.8, 0.7, 1.8),
      hood: new THREE.BoxGeometry(2.0, 0.35, 1.2),
      wheel: new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12),
    }

    // Register update on ticker
    game.ticker.on((dt, elapsed) => this._update(dt, elapsed), 6)
  }

  /**
   * Add a new remote player ghost car
   */
  addPlayer(id, data) {
    if (this.ghosts.has(id)) return

    const color = new THREE.Color(data.color || '#ff6b2b')
    const ghost = this._createGhostCar(id, data.name || 'Anónimo', color)

    // Set initial position
    if (data.position) {
      ghost.mesh.position.set(data.position.x || 0, 0, data.position.z || 0)
    }
    ghost.mesh.rotation.y = data.angle || 0

    this.ghosts.set(id, ghost)
    this.game.scene.add(ghost.mesh)
  }

  /**
   * Remove a remote player ghost car
   */
  removePlayer(id) {
    const ghost = this.ghosts.get(id)
    if (!ghost) return

    this.game.scene.remove(ghost.mesh)

    // Dispose label
    if (ghost.label) {
      ghost.label.material.map?.dispose()
      ghost.label.material.dispose()
    }

    this.ghosts.delete(id)
  }

  /**
   * Update all ghost positions from server tick data
   */
  updateAll(positions, myId) {
    for (const [id, data] of Object.entries(positions)) {
      if (id === myId) continue

      const ghost = this.ghosts.get(id)
      if (!ghost) continue

      // Store previous state and new target for interpolation
      ghost.prevState = { ...ghost.targetState }
      ghost.targetState = {
        x: data.x,
        z: data.z,
        angle: data.angle,
        speed: data.speed,
      }
      ghost.interpStart = performance.now()
    }
  }

  /**
   * Frame update — interpolate ghost positions
   */
  _update(dt, elapsed) {
    const now = performance.now()

    for (const [id, ghost] of this.ghosts) {
      const { prevState, targetState, interpStart } = ghost
      if (!targetState) continue

      // Interpolation factor (50ms = one server tick)
      const t = Math.min((now - interpStart) / 50, 1)

      // Lerp position
      ghost.mesh.position.x = this._lerp(prevState.x, targetState.x, t)
      ghost.mesh.position.z = this._lerp(prevState.z, targetState.z, t)

      // Lerp angle (handle wrapping)
      ghost.mesh.rotation.y = this._lerpAngle(prevState.angle, targetState.angle, t)

      // Animate wheels based on speed
      const speed = this._lerp(prevState.speed || 0, targetState.speed || 0, t)
      ghost.wheels.forEach(w => {
        w.rotation.x += speed * dt * 3
      })

      // Bob the name label
      if (ghost.label) {
        ghost.label.position.y = 3.5 + Math.sin(elapsed * 2 + id.charCodeAt(0)) * 0.15

        // Billboard — face camera
        const cam = this.game.view?.camera
        if (cam) {
          ghost.label.quaternion.copy(cam.quaternion)
        }
      }
    }
  }

  /**
   * Create a simplified ghost car mesh
   */
  _createGhostCar(id, name, color) {
    const mesh = new THREE.Group()

    // Body material — player's color
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.5,
      emissive: color,
      emissiveIntensity: 0.15,
    })

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1a1020, roughness: 0.4, metalness: 0.4,
    })

    // Body
    const body = new THREE.Group()

    const mainBody = new THREE.Mesh(this._sharedGeo.body, bodyMat)
    mainBody.castShadow = true
    body.add(mainBody)

    const hood = new THREE.Mesh(this._sharedGeo.hood, bodyMat)
    hood.position.set(0, 0.15, 1.6)
    hood.rotation.x = -0.15
    body.add(hood)

    const cabin = new THREE.Mesh(this._sharedGeo.cabin, darkMat)
    cabin.position.set(0, 0.65, -0.3)
    body.add(cabin)

    // Headlight bar (emissive only — no real light for performance)
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffaa22, emissive: 0xffaa22, emissiveIntensity: 2,
    })
    const hlBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), hlMat)
    hlBar.position.set(0, 0.05, 2.01)
    body.add(hlBar)

    // Tail lights
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff1a3a, emissive: 0xff1a3a, emissiveIntensity: 1.2,
    })
    ;[[-0.85, 0, -2.0], [0.85, 0, -2.0]].forEach(([x, y, z]) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.08), tlMat)
      tl.position.set(x, y, z)
      body.add(tl)
    })

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7 })
    const wheels = []
    const wheelPositions = [
      [-1.15, -0.15, 1.2], [1.15, -0.15, 1.2],
      [-1.15, -0.15, -1.2], [1.15, -0.15, -1.2],
    ]
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(this._sharedGeo.wheel, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, y, z)
      body.add(wheel)
      wheels.push(wheel)
    })

    body.position.y = 0.55
    mesh.add(body)

    // Name label (sprite)
    const label = this._createLabel(name, color)
    label.position.set(0, 3.5, 0)
    mesh.add(label)

    return {
      mesh,
      body,
      wheels,
      label,
      prevState: { x: 0, z: 0, angle: 0, speed: 0 },
      targetState: { x: 0, z: 0, angle: 0, speed: 0 },
      interpStart: performance.now(),
    }
  }

  /**
   * Create a floating name label sprite
   */
  _createLabel(name, color) {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = 'rgba(10, 8, 20, 0.75)'
    const radius = 12
    this._roundRect(ctx, 4, 4, 248, 56, radius)
    ctx.fill()

    // Border
    ctx.strokeStyle = `#${color.getHexString()}`
    ctx.lineWidth = 2
    this._roundRect(ctx, 4, 4, 248, 56, radius)
    ctx.stroke()

    // Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, 128, 32)

    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    })

    const sprite = new THREE.Sprite(spriteMat)
    sprite.scale.set(4, 1, 1)
    return sprite
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  _lerp(a, b, t) {
    return a + (b - a) * t
  }

  _lerpAngle(a, b, t) {
    let diff = b - a
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    return a + diff * t
  }
}

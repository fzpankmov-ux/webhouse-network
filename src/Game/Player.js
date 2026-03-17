import * as THREE from 'three'

/**
 * Player — Vehicle controller with physics-like feel
 *
 * Bruno Simon's vehicle system uses:
 * - Rapier vehicle controller with suspension
 * - Separate steering/engine/brake forces
 * - Visual suspension (spring physics)
 * - Wheel rotation + steering visuals
 * - Dust/tire particles
 * - Stuck detection + auto-flip
 *
 * When Rapier is available, this should use PhysicsVehicle.
 * For now, we simulate the feel with arcade physics.
 */
export default class Player {
  constructor(game) {
    this.game = game

    // State
    this.speed = 0
    this.angle = 0
    this.steeringAngle = 0
    this.maxSpeed = 22
    this.boostSpeed = 38
    this.isBoosting = false

    // Suspension (visual spring)
    this.suspension = {
      offset: 0,
      velocity: 0,
      rest: 0.55,
      stiffness: 14,
      damping: 3.5,
    }

    // Input state
    this.input = { forward: 0, backward: 0, left: 0, right: 0, brake: false, boost: false }

    // Build vehicle mesh
    this.mesh = new THREE.Group()
    this.body = new THREE.Group()
    this.wheels = []
    this._buildVehicle()

    this.mesh.position.set(0, 0, 10)
    game.scene.add(this.mesh)

    // Dust particles
    this.dustParticles = []

    // Input listeners
    this._setupInput()

    // Register updates
    game.ticker.on((dt) => this._handleInput(dt), 1)   // Priority 1: input
    game.ticker.on((dt) => this._updatePhysics(dt), 3)  // Priority 3: physics
    game.ticker.on((dt) => this._updateVisuals(dt), 6)   // Priority 6: visuals
  }

  _buildVehicle() {
    // Bruno Simon inspired: orange paint #ff940d to #af0071
    const bodyColor = 0xff6b2b
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor, roughness: 0.25, metalness: 0.55,
      emissive: 0xff4400, emissiveIntensity: 0.12
    })
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1a1020, roughness: 0.3, metalness: 0.5
    })
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x6666dd, roughness: 0.05, metalness: 0.3,
      transparent: true, opacity: 0.65
    })

    // Main body
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.0), bodyMat)
    mainBody.castShadow = true
    this.body.add(mainBody)

    // Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.2), bodyMat)
    hood.position.set(0, 0.15, 1.6)
    hood.rotation.x = -0.15
    hood.castShadow = true
    this.body.add(hood)

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 1.8), darkMat)
    cabin.position.set(0, 0.65, -0.3)
    cabin.castShadow = true
    this.body.add(cabin)

    // Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), glassMat)
    windshield.position.set(0, 0.75, 0.65)
    windshield.rotation.x = -0.5
    this.body.add(windshield)

    // Spoiler
    const spoilerMat = new THREE.MeshStandardMaterial({
      color: 0xcc2244, roughness: 0.3, metalness: 0.5,
      emissive: 0x881133, emissiveIntensity: 0.25
    })
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.4), spoilerMat)
    spoiler.position.set(0, 0.55, -2.0)
    this.body.add(spoiler)

    // Headlight BAR (Bruno Simon style — wide glowing bar)
    const hlBarMat = new THREE.MeshStandardMaterial({
      color: 0xffaa22, emissive: 0xffaa22, emissiveIntensity: 3
    })
    const hlBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), hlBarMat)
    hlBar.position.set(0, 0.05, 2.01)
    this.body.add(hlBar)

    // Individual headlights
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffeedd, emissiveIntensity: 2.5
    })
    ;[[-0.7, 0.05, 2.0], [0.7, 0.05, 2.0]].forEach(([x, y, z]) => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), hlMat)
      hl.position.set(x, y, z)
      this.body.add(hl)
    })

    // Headlight spotlight — warm yellow like Bruno's
    const spotlight = new THREE.SpotLight(0xffcc66, 3, 40, Math.PI / 6, 0.5, 1)
    spotlight.position.set(0, 0.2, 2.2)
    spotlight.target.position.set(0, -0.5, 15)
    this.body.add(spotlight)
    this.body.add(spotlight.target)

    // Tail lights
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff1a3a, emissive: 0xff1a3a, emissiveIntensity: 1.5
    })
    ;[[-0.85, 0, -2.0], [0.85, 0, -2.0]].forEach(([x, y, z]) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.08), tlMat)
      tl.position.set(x, y, z)
      this.body.add(tl)
    })

    // Under glow — warm orange
    this.underGlow = new THREE.PointLight(0xff8844, 1.2, 8, 2)
    this.underGlow.position.set(0, -0.3, 0)
    this.body.add(this.underGlow)

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.7 })
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.2, metalness: 0.8 })
    const wheelPositions = [
      [-1.15, -0.15, 1.2],
      [1.15, -0.15, 1.2],
      [-1.15, -0.15, -1.2],
      [1.15, -0.15, -1.2]
    ]

    wheelPositions.forEach(([x, y, z]) => {
      const wheelGroup = new THREE.Group()
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16), wheelMat)
      tire.rotation.z = Math.PI / 2
      wheelGroup.add(tire)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), rimMat)
      rim.rotation.z = Math.PI / 2
      wheelGroup.add(rim)
      wheelGroup.position.set(x, y, z)
      this.body.add(wheelGroup)
      this.wheels.push(wheelGroup)
    })

    this.body.position.y = this.suspension.rest
    this.mesh.add(this.body)
  }

  _setupInput() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') this.input.forward = 1
      if (key === 's' || key === 'arrowdown') this.input.backward = 1
      if (key === 'a' || key === 'arrowleft') this.input.left = 1
      if (key === 'd' || key === 'arrowright') this.input.right = 1
      if (key === ' ') { this.input.brake = true; e.preventDefault() }
      if (key === 'shift') this.input.boost = true
      if (key === 'e') this.game.world?.tryEnterHouse()
      if (key === 'escape') this.game.world?.closePanel()
    })

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') this.input.forward = 0
      if (key === 's' || key === 'arrowdown') this.input.backward = 0
      if (key === 'a' || key === 'arrowleft') this.input.left = 0
      if (key === 'd' || key === 'arrowright') this.input.right = 0
      if (key === ' ') this.input.brake = false
      if (key === 'shift') this.input.boost = false
    })
  }

  _handleInput(dt) {
    // Processed in _updatePhysics
  }

  _updatePhysics(dt) {
    const { input } = this
    const maxSpd = input.boost ? this.boostSpeed : this.maxSpeed
    this.isBoosting = input.boost

    // Acceleration
    const throttle = input.forward - input.backward * 0.5
    if (throttle !== 0) {
      this.speed += throttle * 18 * dt
      this.speed = Math.max(-maxSpd * 0.4, Math.min(maxSpd, this.speed))
    } else {
      this.speed *= 0.94 // Deceleration
    }

    // Brake
    if (input.brake) this.speed *= 0.88

    // Dead zone
    if (Math.abs(this.speed) < 0.05) this.speed = 0

    // Steering (smoothed)
    const turnInput = input.left - input.right
    const targetSteering = turnInput * 0.6
    this.steeringAngle += (targetSteering - this.steeringAngle) * 8 * dt

    if (Math.abs(this.speed) > 0.5) {
      const turnFactor = Math.min(Math.abs(this.speed) / 5, 1)
      this.angle += this.steeringAngle * 2.2 * dt * Math.sign(this.speed) * turnFactor
    }

    // Move
    const newX = this.mesh.position.x + Math.sin(this.angle) * this.speed * dt
    const newZ = this.mesh.position.z + Math.cos(this.angle) * this.speed * dt

    // Collision check against houses (AABB)
    let blocked = false
    const houses = this.game.world?.houses || []
    for (const house of houses) {
      const hx = house.mesh.position.x
      const hz = house.mesh.position.z
      const margin = 5.2  // house half-width(3.5) + car half-width(1.7)
      const marginZ = 5.5 // house half-depth(3.5) + car half-length(2)
      if (Math.abs(newX - hx) < margin && Math.abs(newZ - hz) < marginZ) {
        blocked = true
        this.speed *= -0.3 // Bounce back
        break
      }
    }

    // Collision check against trees (circular)
    if (!blocked) {
      const trees = this.game.world?.trees?.treeMeshes || []
      for (const tree of trees) {
        const tx = tree.position.x
        const tz = tree.position.z
        const dist = Math.hypot(newX - tx, newZ - tz)
        const collisionRadius = 1.8 // tree trunk + car margin
        if (dist < collisionRadius) {
          blocked = true
          this.speed *= -0.25 // Softer bounce off trees
          break
        }
      }
    }

    if (!blocked) {
      this.mesh.position.x = newX
      this.mesh.position.z = newZ
    }
    this.mesh.rotation.y = this.angle

    // Boundaries
    this.mesh.position.x = Math.max(-140, Math.min(140, this.mesh.position.x))
    this.mesh.position.z = Math.max(-140, Math.min(140, this.mesh.position.z))
  }

  _updateVisuals(dt) {
    const { suspension } = this

    // Spring physics for suspension
    const accelForce = (this.input.forward - this.input.backward) * 0.03 * this.speed
    const bumpForce = (Math.random() - 0.5) * 0.003 * Math.abs(this.speed)
    suspension.velocity += (-suspension.stiffness * suspension.offset + accelForce + bumpForce) * dt
    suspension.velocity *= (1 - suspension.damping * dt)
    suspension.offset += suspension.velocity
    suspension.offset = Math.max(-0.15, Math.min(0.15, suspension.offset))

    this.body.position.y = suspension.rest + suspension.offset

    // Body tilt
    const targetPitch = -(this.input.forward - this.input.backward * 0.5) * 0.03 * Math.min(Math.abs(this.speed), 10)
    const targetRoll = this.steeringAngle * 0.08 * Math.min(Math.abs(this.speed), 10)
    this.body.rotation.x += (targetPitch - this.body.rotation.x) * 5 * dt
    this.body.rotation.z += (targetRoll - this.body.rotation.z) * 5 * dt

    // Wheel spin
    const wheelSpin = this.speed * dt * 3
    this.wheels.forEach((w, i) => {
      w.children[0].rotation.x += wheelSpin
      w.children[1].rotation.x += wheelSpin
      if (i < 2) w.rotation.y = this.steeringAngle * 0.8
    })

    // Under glow intensity
    this.underGlow.intensity = 0.5 + Math.abs(this.speed) * 0.08
    this.underGlow.color.setHex(this.isBoosting ? 0xff44aa : 0xff8844)

    // Dust particles
    if (Math.abs(this.speed) > 5 && Math.random() > 0.6) {
      this._spawnDust()
    }
    this._updateDust(dt)
  }

  _spawnDust() {
    const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.06, 4, 4)
    const mat = new THREE.MeshBasicMaterial({ color: 0x555566, transparent: true, opacity: 0.4 })
    const p = new THREE.Mesh(geo, mat)
    p.position.set(
      this.mesh.position.x + (Math.random() - 0.5) * 1.5,
      0.15,
      this.mesh.position.z - Math.sign(this.speed) * 2 + (Math.random() - 0.5)
    )
    p.userData = {
      vel: new THREE.Vector3((Math.random()-0.5)*2, Math.random()*2+1, (Math.random()-0.5)*2),
      life: 1,
      decay: 0.02 + Math.random() * 0.02
    }
    this.game.scene.add(p)
    this.dustParticles.push(p)
  }

  _updateDust(dt) {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i]
      p.userData.life -= p.userData.decay
      p.position.add(p.userData.vel.clone().multiplyScalar(dt))
      p.userData.vel.y -= 3 * dt
      p.material.opacity = p.userData.life * 0.4
      p.scale.setScalar(1 + (1 - p.userData.life) * 2)
      if (p.userData.life <= 0) {
        this.game.scene.remove(p)
        p.geometry.dispose()
        p.material.dispose()
        this.dustParticles.splice(i, 1)
      }
    }
  }
}

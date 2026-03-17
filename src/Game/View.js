import * as THREE from 'three'

/**
 * View — Camera system with magnet-based follow
 *
 * This is one of the KEY techniques from Bruno Simon's portfolio.
 * The camera doesn't snap to the car — it has a "focus point" that
 * is attracted toward the vehicle via exponential decay.
 *
 * Spherical coordinates control the orbit angle.
 * The look-ahead offset makes the camera anticipate turns.
 * Roll creates cinematic tilt during steering.
 * Dynamic FOV opens up at high speed.
 */
export default class View {
  constructor(game) {
    this.game = game

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50, // FOV
      window.innerWidth / window.innerHeight,
      0.1,
      400
    )
    this.camera.position.set(0, 12, 25)

    // Tell renderer about our camera
    game.rendering.setCamera(this.camera)

    // Magnet system (Bruno Simon's technique)
    this.focusPoint = new THREE.Vector3(0, 2, 0)    // Where camera looks at
    this.smoothedPosition = new THREE.Vector3(0, 12, 25) // Camera position (smoothed)

    this.magnet = {
      strength: 0.04,      // How fast focus follows target (0-1)
      positionStrength: 0.06, // How fast camera moves to orbit position
    }

    // Spherical orbit
    this.spherical = {
      phi: 0.4,        // Vertical angle (0 = side, PI/2 = top)
      theta: 0,        // Horizontal angle
      radius: 16,
      minRadius: 8,
      maxRadius: 30,
    }

    // Cinematic effects
    this.roll = 0            // Camera roll (tilt)
    this.baseFov = 50
    this.lookAhead = 4       // Units to look ahead of car

    // Input
    this.isPointerLocked = false
    this._setupInput()

    // Register update
    game.ticker.on((dt, elapsed) => this.update(dt, elapsed), 7)

    // Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
    })
  }

  _setupInput() {
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return
      this.spherical.theta += e.movementX * 0.003
      this.spherical.phi = Math.max(0.15, Math.min(1.3,
        this.spherical.phi + e.movementY * 0.003
      ))
    })

    document.addEventListener('wheel', (e) => {
      this.spherical.radius = Math.max(
        this.spherical.minRadius,
        Math.min(this.spherical.maxRadius,
          this.spherical.radius + e.deltaY * 0.01
        )
      )
    })

    this.game.canvas.addEventListener('click', () => {
      this.game.canvas.requestPointerLock?.()
    })

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = !!document.pointerLockElement
    })
  }

  /**
   * Main update — called every frame
   * @param {number} dt - Delta time
   * @param {number} elapsed - Total elapsed time
   */
  update(dt, elapsed) {
    const player = this.game.player
    if (!player || !player.mesh) return

    const carPos = player.mesh.position
    const carAngle = player.angle || 0
    const carSpeed = player.speed || 0
    const carSteering = player.steeringAngle || 0
    const maxSpeed = player.maxSpeed || 20

    // --- Focus point: magnet attraction toward car ---
    // Look ahead based on speed (Bruno Simon technique)
    const speedRatio = Math.abs(carSpeed) / maxSpeed
    const aheadDist = this.lookAhead * speedRatio
    const targetX = carPos.x + Math.sin(carAngle) * aheadDist
    const targetZ = carPos.z + Math.cos(carAngle) * aheadDist
    const targetY = carPos.y + 2

    // Exponential decay toward target (the "magnet")
    this.focusPoint.x += (targetX - this.focusPoint.x) * this.magnet.strength
    this.focusPoint.y += (targetY - this.focusPoint.y) * this.magnet.strength
    this.focusPoint.z += (targetZ - this.focusPoint.z) * this.magnet.strength

    // --- Camera orbit position from spherical coords ---
    const { phi, theta, radius } = this.spherical
    const orbitX = this.focusPoint.x - Math.sin(theta) * radius * Math.cos(phi)
    const orbitY = this.focusPoint.y + radius * Math.sin(phi)
    const orbitZ = this.focusPoint.z - Math.cos(theta) * radius * Math.cos(phi)

    // Smooth camera position (secondary magnet)
    this.smoothedPosition.x += (orbitX - this.smoothedPosition.x) * this.magnet.positionStrength
    this.smoothedPosition.y += (orbitY - this.smoothedPosition.y) * this.magnet.positionStrength
    this.smoothedPosition.z += (orbitZ - this.smoothedPosition.z) * this.magnet.positionStrength

    this.camera.position.copy(this.smoothedPosition)
    this.camera.lookAt(this.focusPoint)

    // --- Cinematic roll (tilt during steering) ---
    const targetRoll = -carSteering * 0.025 * Math.min(Math.abs(carSpeed), 12)
    this.roll += (targetRoll - this.roll) * 4 * dt
    this.camera.rotation.z += this.roll

    // --- Dynamic FOV (wider at speed) ---
    const targetFov = this.baseFov + speedRatio * 8
    this.camera.fov += (targetFov - this.camera.fov) * 3 * dt
    this.camera.updateProjectionMatrix()
  }
}

/**
 * Physics — Rapier3D physics wrapper
 *
 * Bruno Simon uses Rapier for:
 * - Vehicle physics (PhysicsVehicle)
 * - HeightField terrain collider
 * - Convex hull colliders for scenery
 * - Rigidbody objects (crates, barrels)
 *
 * This module attempts to init Rapier asynchronously.
 * If Rapier fails to load (WASM issues), the game still works
 * with arcade physics from Player.js.
 *
 * When Rapier is available, we create:
 * - A physics world with gravity
 * - A flat ground collider
 * - Collision groups for player, scenery, houses
 */
export default class Physics {
  constructor(game) {
    this.game = game
    this.world = null
    this.rapier = null
    this.ready = false
    this.bodies = []

    this._init()
  }

  async _init() {
    try {
      const RAPIER = await import('@dimforge/rapier3d')
      await RAPIER.init()
      this.rapier = RAPIER

      // Create physics world
      this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })

      // Ground plane
      const groundDesc = RAPIER.ColliderDesc.cuboid(150, 0.1, 150)
        .setTranslation(0, -0.1, 0)
        .setFriction(0.8)
        .setRestitution(0.1)
      this.world.createCollider(groundDesc)

      // House colliders (simple boxes)
      for (const houseData of this.game.housesData) {
        const [x, y, z] = houseData.position
        const houseDesc = RAPIER.ColliderDesc.cuboid(5, 4, 5)
          .setTranslation(x, 4, z)
          .setFriction(0.5)
        this.world.createCollider(houseDesc)
      }

      this.ready = true

      // Step physics in the game loop
      this.game.ticker.on((dt) => this._step(dt), 2)

      console.log('[WebHouse] Rapier physics initialized')
    } catch (err) {
      console.warn('[WebHouse] Rapier not available, using arcade physics:', err.message)
      // Game continues with arcade physics from Player.js
    }
  }

  _step(dt) {
    if (!this.ready || !this.world) return

    // Cap physics timestep
    const step = Math.min(dt, 0.033)
    this.world.timestep = step
    this.world.step()
  }

  /**
   * Create a kinematic rigid body (for player vehicle when Rapier is active)
   */
  createKinematicBody(position) {
    if (!this.ready) return null

    const RAPIER = this.rapier
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(position.x, position.y, position.z)
    const body = this.world.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc.cuboid(1.1, 0.5, 2)
      .setFriction(0.3)
    this.world.createCollider(colliderDesc, body)

    this.bodies.push(body)
    return body
  }

  /**
   * Raycast down from a point (for terrain detection)
   */
  raycastDown(x, z, maxDist = 50) {
    if (!this.ready) return 0

    const RAPIER = this.rapier
    const ray = new RAPIER.Ray(
      { x, y: maxDist, z },
      { x: 0, y: -1, z: 0 }
    )
    const hit = this.world.castRay(ray, maxDist * 2, true)
    if (hit) {
      return maxDist - hit.timeOfImpact
    }
    return 0
  }

  destroy() {
    if (this.world) {
      this.world.free()
      this.world = null
    }
    this.ready = false
  }
}

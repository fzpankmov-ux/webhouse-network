import * as THREE from 'three'

/**
 * Grass — Instanced grass blades with GPU wind animation
 *
 * Inspired by Bruno Simon's Grass.js:
 * - InstancedMesh with custom shader
 * - Each blade has random position, height, rotation
 * - Vertex shader applies wind displacement using noise
 * - Tip bends more than base (displacement scales with Y)
 * - Player proximity flattens grass nearby
 *
 * Performance: ~15,000 blades using a single draw call
 */
export default class Grass {
  constructor(game) {
    this.game = game

    this.count = 25000
    this.areaSize = 120 // spread across this area

    this._build()

    game.ticker.on((dt, elapsed) => this._update(elapsed), 8)
  }

  _build() {
    // Blade geometry: a thin triangle strip (3 segments)
    // Vertices form a tapered blade from base to tip
    const geo = new THREE.BufferGeometry()
    const positions = []
    const uvs = []
    const indices = []
    const segments = 5
    const bladeWidth = 0.045
    const bladeHeight = 1.0

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const y = t * bladeHeight
      const w = bladeWidth * (1 - t * 0.9) // taper toward tip
      positions.push(-w, y, 0)
      positions.push(w, y, 0)
      uvs.push(0, t)
      uvs.push(1, t)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2
      indices.push(a, a + 1, a + 2)
      indices.push(a + 1, a + 3, a + 2)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)

    // Per-instance attributes: offset (x,z), scale, rotation
    const offsets = new Float32Array(this.count * 2)
    const scales = new Float32Array(this.count)
    const rotations = new Float32Array(this.count)

    const rng = this._seededRandom(123)

    // Avoid zones (roads, houses, spawn)
    const avoidZones = [
      { x: 0, z: -10, r: 6 },   // main road vertical
      { x: 0, z: -20, r: 6 },   // crossroad
      { x: -25, z: -20, r: 12 }, // house 1
      { x: 25, z: -20, r: 12 },  // house 2
      { x: 0, z: 10, r: 8 },    // spawn area
    ]
    // Road strips
    const isOnRoad = (x, z) => {
      if (Math.abs(x) < 5 && z > -55 && z < 35) return true // vertical road
      if (Math.abs(z + 20) < 5 && Math.abs(x) < 40) return true // horizontal road
      return false
    }
    const isValid = (x, z) => {
      if (isOnRoad(x, z)) return false
      for (const a of avoidZones) {
        if (Math.hypot(x - a.x, z - a.z) < a.r) return false
      }
      return true
    }

    let placed = 0
    const half = this.areaSize / 2
    for (let attempts = 0; attempts < this.count * 3 && placed < this.count; attempts++) {
      const x = (rng() - 0.5) * this.areaSize * 2
      const z = (rng() - 0.5) * this.areaSize * 2
      if (Math.abs(x) > half * 1.8 || Math.abs(z) > half * 1.8) continue
      if (!isValid(x, z)) continue

      offsets[placed * 2] = x
      offsets[placed * 2 + 1] = z
      scales[placed] = 0.5 + rng() * 1.0
      rotations[placed] = rng() * Math.PI
      placed++
    }

    // If we didn't place enough, adjust count
    if (placed < this.count) {
      this.count = placed
    }

    // Add instance attributes to geometry
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(
      offsets.slice(0, this.count * 2), 2
    ))
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(
      scales.slice(0, this.count), 1
    ))
    geo.setAttribute('aRotation', new THREE.InstancedBufferAttribute(
      rotations.slice(0, this.count), 1
    ))

    // Shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 10) },
        uWindDirection: { value: new THREE.Vector2(
          Math.cos(0.6 * Math.PI),
          Math.sin(0.6 * Math.PI)
        )},
        uWindStrength: { value: 0.4 },
        uColorBase: { value: new THREE.Color(0x6a6530) },  // olive medium
        uColorTip: { value: new THREE.Color(0xc8c050) },   // bright golden
        uColorHighlight: { value: new THREE.Color(0xddda44) }, // vivid yellow-green
        uFogColor: { value: new THREE.Color(0x3a2868) },   // warm purple haze fog
        uFogNear: { value: 80.0 },
        uFogFar: { value: 200.0 },
      },
      vertexShader: /* glsl */`
        attribute vec2 aOffset;
        attribute float aScale;
        attribute float aRotation;

        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform vec2 uWindDirection;
        uniform float uWindStrength;
        uniform float uFogNear;
        uniform float uFogFar;

        varying float vHeight;
        varying float vFogFactor;
        varying float vNoise;

        // Simple hash-based noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          float h = position.y; // 0 at base, 1 at tip
          vHeight = h;

          // Rotate blade around Y
          float cs = cos(aRotation);
          float sn = sin(aRotation);
          vec3 pos = position;
          pos.x = position.x * cs - position.z * sn;
          pos.z = position.x * sn + position.z * cs;

          // Scale
          pos *= aScale;

          // World position
          pos.x += aOffset.x;
          pos.z += aOffset.y;

          // Wind displacement (stronger at tip)
          float windBend = h * h; // quadratic bend
          vec2 windUV = vec2(aOffset.x * 0.05, aOffset.y * 0.05) + uWindDirection * uTime * 0.3;
          float n1 = noise(windUV * 3.0) * 0.6;
          float n2 = noise(windUV * 7.0 + 5.0) * 0.4;
          float windNoise = (n1 + n2) * uWindStrength;
          vNoise = windNoise;

          pos.x += uWindDirection.x * windNoise * windBend * 1.5;
          pos.z += uWindDirection.y * windNoise * windBend * 1.5;

          // Player interaction: flatten grass near player
          float playerDist = length(vec2(pos.x - uPlayerPos.x, pos.z - uPlayerPos.z));
          float flatten = smoothstep(3.0, 1.0, playerDist);
          vec2 pushDir = normalize(vec2(pos.x - uPlayerPos.x, pos.z - uPlayerPos.z) + 0.001);
          pos.x += pushDir.x * flatten * h * 2.0;
          pos.z += pushDir.y * flatten * h * 2.0;
          pos.y *= (1.0 - flatten * 0.7);

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;

          // Fog
          float fogDist = length(worldPos.xyz - cameraPosition);
          vFogFactor = smoothstep(uFogNear, uFogFar, fogDist);
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uColorBase;
        uniform vec3 uColorTip;
        uniform vec3 uColorHighlight;
        uniform vec3 uFogColor;

        varying float vHeight;
        varying float vFogFactor;
        varying float vNoise;

        void main() {
          // Color gradient: dark at base, brighter at tip
          vec3 color = mix(uColorBase, uColorTip, vHeight);

          // Wind highlight at tips
          color = mix(color, uColorHighlight, vNoise * vHeight * 0.5);

          // Slight ambient occlusion at base
          color *= 0.7 + vHeight * 0.3;

          // Fog
          color = mix(color, uFogColor, vFogFactor);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    })

    // Create instanced mesh
    this.mesh = new THREE.InstancedMesh(geo, this.material, this.count)
    this.mesh.frustumCulled = false

    // Set identity matrices (positioning is done in shader via aOffset)
    const dummy = new THREE.Matrix4()
    for (let i = 0; i < this.count; i++) {
      this.mesh.setMatrixAt(i, dummy)
    }

    this.game.scene.add(this.mesh)
  }

  _update(elapsed) {
    this.material.uniforms.uTime.value = elapsed

    const player = this.game.player?.mesh
    if (player) {
      this.material.uniforms.uPlayerPos.value.copy(player.position)
    }
  }

  _seededRandom(seed) {
    let s = seed
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  }
}

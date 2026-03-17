import * as THREE from 'three'

/**
 * Floor — Shader-based ground with Bruno Simon-style cross grid
 * Colors: warm purple/indigo night palette with visible X markers
 */
export default class Floor {
  constructor(game) {
    this.game = game

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(0x5a3888) }, // vibrant purple
        uColor2: { value: new THREE.Color(0x4a3080) }, // rich indigo
        uColor3: { value: new THREE.Color(0x553878) }, // warm magenta-purple
        uColor4: { value: new THREE.Color(0x483880) }, // soft blue-purple
        uGridColor: { value: new THREE.Color(0xaa88ee) },
        uGridOpacity: { value: 0.35 },
        uFogColor: { value: new THREE.Color(0x3a2868) },
        uFogNear: { value: 80.0 },
        uFogFar: { value: 200.0 },
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vFogFactor;
        uniform float uFogNear;
        uniform float uFogFar;

        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
          float fogDist = length(worldPos.xyz - cameraPosition);
          vFogFactor = smoothstep(uFogNear, uFogFar, fogDist);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1, uColor2, uColor3, uColor4;
        uniform vec3 uGridColor;
        uniform float uGridOpacity;
        uniform vec3 uFogColor;
        uniform float uTime;
        uniform vec2 uPlayerPos;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vFogFactor;

        // Cross/X marker like Bruno Simon's grid
        float crossMark(vec2 p, float size, float thickness) {
          vec2 cell = fract(p / size) - 0.5;
          float d1 = abs(cell.x + cell.y); // diagonal 1
          float d2 = abs(cell.x - cell.y); // diagonal 2
          float cross = min(d1, d2);
          return 1.0 - smoothstep(0.0, thickness / size, cross);
        }

        float grid(vec2 p, float size) {
          vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
          return 1.0 - min(min(g.x, g.y), 1.0);
        }

        void main() {
          // 4-corner interpolation
          vec3 topColor = mix(uColor1, uColor2, vUv.x);
          vec3 bottomColor = mix(uColor3, uColor4, vUv.x);
          vec3 baseColor = mix(bottomColor, topColor, vUv.y);

          // Cross markers (Bruno Simon signature — X pattern at each grid point)
          float crosses = crossMark(vWorldPos.xz, 8.0, 0.12) * 0.4;

          // Fine grid lines
          float g1 = grid(vWorldPos.xz, 8.0) * 0.2;

          float gridVal = max(crosses, g1) * uGridOpacity;
          vec3 color = mix(baseColor, uGridColor, gridVal);

          // Radial glow near player — warm magenta-purple
          float playerDist = length(vWorldPos.xz - uPlayerPos);
          color += vec3(0.15, 0.08, 0.22) * smoothstep(35.0, 0.0, playerDist);

          // Fog
          color = mix(color, uFogColor, vFogFactor);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300, 1, 1),
      this.material
    )
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.receiveShadow = true
    game.scene.add(this.mesh)

    // Roads
    this._buildRoads()

    // Update player position uniform
    game.ticker.on((dt, elapsed) => {
      this.material.uniforms.uTime.value = elapsed
      const p = game.player?.mesh?.position
      if (p) {
        this.material.uniforms.uPlayerPos.value.set(p.x, p.z)
      }
    }, 10)
  }

  _buildRoads() {
    // Road surface — dark but visible against purple ground
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x4a3060, roughness: 0.8 })
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xcc99ff, emissive: 0x9966ee, emissiveIntensity: 1.0
    })
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xdd99ff, emissive: 0xaa66ff, emissiveIntensity: 1.5,
      transparent: true, opacity: 0.6
    })

    // Main vertical road
    const r1 = new THREE.Mesh(new THREE.PlaneGeometry(8, 90), roadMat)
    r1.rotation.x = -Math.PI / 2
    r1.position.set(0, 0.02, -10)
    r1.receiveShadow = true
    this.game.scene.add(r1)

    // Horizontal crossroad
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(80, 8), roadMat)
    r2.rotation.x = -Math.PI / 2
    r2.position.set(0, 0.02, -20)
    r2.receiveShadow = true
    this.game.scene.add(r2)

    // Center dashes
    for (let i = -45; i < 45; i += 4) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2), lineMat)
      line.rotation.x = -Math.PI / 2
      line.position.set(0, 0.04, i)
      this.game.scene.add(line)
    }
    for (let i = -36; i < 36; i += 4) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.25), lineMat)
      line.rotation.x = -Math.PI / 2
      line.position.set(i, 0.04, -20)
      this.game.scene.add(line)
    }

    // Road edges — glowing purple
    ;[-4, 4].forEach(x => {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 90), edgeMat)
      edge.rotation.x = -Math.PI / 2
      edge.position.set(x, 0.04, -10)
      this.game.scene.add(edge)
    })
  }
}

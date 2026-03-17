import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js'

/**
 * Rendering — WebGL renderer with bloom + CSS3DRenderer for in-world iframes
 * CSS3D layer is only visible/rendered when a house screen is open
 */
export default class Rendering {
  constructor(game) {
    this.game = game

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: game.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.8
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    // Post-processing (set up once camera is ready)
    this.composer = null
    this.bloomPass = null

    // CSS3D Renderer — created lazily, only active when a screen is open
    this.cssRenderer = null
    this.cssScene = new THREE.Scene()
    this._cssActive = false

    // Resize
    window.addEventListener('resize', () => this._onResize())

    // Register render pass at lowest priority (runs last)
    game.ticker.on((dt) => this._render(dt), 99)
  }

  /**
   * Called by View once camera is ready
   */
  setCamera(camera) {
    this.camera = camera
    this._setupPostProcessing()
  }

  /**
   * Show/hide the CSS3D layer (called by HUD when opening/closing screens)
   */
  showCSS3D() {
    if (!this.cssRenderer) {
      this.cssRenderer = new CSS3DRenderer()
      this.cssRenderer.setSize(window.innerWidth, window.innerHeight)
      const dom = this.cssRenderer.domElement
      dom.style.position = 'fixed'
      dom.style.top = '0'
      dom.style.left = '0'
      dom.style.width = '100%'
      dom.style.height = '100%'
      dom.style.zIndex = '2'
      dom.style.pointerEvents = 'none'
      dom.id = 'css3d-layer'
    }
    if (!this.cssRenderer.domElement.parentNode) {
      document.body.appendChild(this.cssRenderer.domElement)
    }
    this.cssRenderer.domElement.style.display = 'block'
    this._cssActive = true
  }

  hideCSS3D() {
    if (this.cssRenderer?.domElement) {
      this.cssRenderer.domElement.style.display = 'none'
    }
    this._cssActive = false
  }

  _setupPostProcessing() {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight)

    this.composer = new EffectComposer(this.renderer)

    // Render pass
    const renderPass = new RenderPass(this.game.scene, this.camera)
    this.composer.addPass(renderPass)

    // Bloom pass — subtle glow for emissive materials
    this.bloomPass = new UnrealBloomPass(size, 0.5, 0.5, 0.8)
    this.composer.addPass(this.bloomPass)
  }

  _render(dt) {
    if (!this.camera) return

    // Render WebGL scene (with bloom)
    if (this.composer) {
      this.composer.render()
    } else {
      this.renderer.render(this.game.scene, this.camera)
    }

    // Only render CSS3D when a screen is active
    if (this._cssActive && this.cssRenderer) {
      this.cssRenderer.render(this.cssScene, this.camera)
    }
  }

  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h)
    if (this.cssRenderer) {
      this.cssRenderer.setSize(w, h)
    }
    if (this.composer) {
      this.composer.setSize(w, h)
    }
    if (this.camera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
  }

  destroy() {
    this.renderer.dispose()
    if (this.cssRenderer?.domElement?.parentNode) {
      this.cssRenderer.domElement.parentNode.removeChild(this.cssRenderer.domElement)
    }
  }
}

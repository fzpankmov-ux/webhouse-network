import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js'

/**
 * HUD — User interface overlay
 * Speed, minimap, interaction prompts
 * Website screens are rendered IN the 3D world using CSS3DRenderer
 */
export default class HUD {
  constructor(game) {
    this.game = game
    this.elements = {
      speed: document.querySelector('#hud-speed .speed-val'),
      prompt: document.getElementById('hud-prompt'),
      promptText: document.querySelector('#hud-prompt .text'),
      minimapCanvas: document.getElementById('minimap-canvas'),
    }
    this.minimapCtx = this.elements.minimapCanvas?.getContext('2d')

    // CSS3D screen state
    this._currentScreen = null
    this._currentContainer = null

    game.ticker.on(() => this.update(), 10)
  }

  update() {
    const player = this.game.player
    if (!player) return

    if (this.elements.speed) {
      this.elements.speed.textContent = Math.abs(Math.round(player.speed * 3.6))
    }

    this._updateMinimap()
  }

  showPrompt(text) {
    if (this.elements.prompt) {
      this.elements.prompt.classList.add('visible')
      if (this.elements.promptText) this.elements.promptText.textContent = text
    }
  }

  hidePrompt() {
    if (this.elements.prompt) {
      this.elements.prompt.classList.remove('visible')
    }
  }

  /**
   * Open a website as a 3D screen on the house's front wall
   * Uses CSS3DObject to embed real HTML/iframe in the 3D scene
   */
  openWebsite(url, houseData, houseMesh) {
    // Close any existing screen first
    this.closeWebsite()

    const color = houseData.color1 || '#7c5cff'

    // Build the screen DOM element
    const container = document.createElement('div')
    container.className = 'house-screen'
    container.style.pointerEvents = 'auto'
    container.style.borderColor = color
    container.style.boxShadow = `0 0 60px ${color}50, 0 0 120px ${color}25, inset 0 0 30px ${color}15`

    container.innerHTML = `
      <div class="house-screen-header" style="border-bottom-color: ${color}40">
        <div class="house-screen-info">
          <span class="house-screen-dot" style="background: ${color}; box-shadow: 0 0 8px ${color}"></span>
          <span class="house-screen-name">${houseData.name}</span>
          <span class="house-screen-url">${houseData.url}</span>
        </div>
        <div class="house-screen-actions">
          <a class="house-screen-link" href="${url}" target="_blank" rel="noopener">↗ Nueva tab</a>
          <button class="house-screen-close">✕ ESC</button>
        </div>
      </div>
      <iframe class="house-screen-iframe" src="${url}" allowfullscreen></iframe>
    `

    // Close button handler
    container.querySelector('.house-screen-close').addEventListener('click', () => {
      this.game.world?.closePanel()
    })

    // Create CSS3DObject and position at house's front wall
    const cssObject = new CSS3DObject(container)

    // Position the screen at the house's front wall
    // House front face (door/windows) is at localZ = +3.52
    // Place screen slightly in front of that
    const hPos = houseMesh.position
    cssObject.position.set(hPos.x, 4.0, hPos.z + 4.0)

    // Scale: CSS pixels → Three.js units
    // Container is 700px wide at scale 0.01 = 7 Three.js units (matches house width)
    cssObject.scale.set(0.01, 0.01, 0.01)

    // Activate CSS3D layer and add object
    this.game.rendering.showCSS3D()
    this.game.rendering.cssScene.add(cssObject)
    this._currentScreen = cssObject
    this._currentContainer = container
  }

  closeWebsite() {
    if (this._currentScreen) {
      this.game.rendering.cssScene.remove(this._currentScreen)

      // Clear iframe to stop loading
      const iframe = this._currentContainer?.querySelector('iframe')
      if (iframe) iframe.src = 'about:blank'

      this._currentScreen = null
      this._currentContainer = null
    }

    // Hide CSS3D layer
    this.game.rendering.hideCSS3D()
  }

  // Aliases for World.js compatibility
  openPanel(houseData, houseMesh) {
    const url = houseData.url
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    this.openWebsite(fullUrl, houseData, houseMesh)
  }
  closePanel() {
    this.closeWebsite()
  }

  _updateMinimap() {
    const ctx = this.minimapCtx
    if (!ctx) return
    const w = 160, h = 160, cx = w/2, cy = h/2, scale = 0.45
    const toMap = (wx, wz) => [cx + wx * scale, cy + wz * scale]

    ctx.fillStyle = 'rgba(53,40,96,0.92)'
    ctx.fillRect(0, 0, w, h)

    const houses = this.game.world?.houses || []
    houses.forEach(house => {
      const [hx, hy] = toMap(house.mesh.position.x, house.mesh.position.z)
      ctx.fillStyle = house.data.color1
      ctx.shadowColor = house.data.color1
      ctx.shadowBlur = 6
      ctx.fillRect(hx - 4, hy - 4, 8, 8)
      ctx.shadowBlur = 0
    })

    const ghosts = this.game.ghostPlayers?.ghosts
    if (ghosts) {
      for (const [id, ghost] of ghosts) {
        const [gx, gy] = toMap(ghost.mesh.position.x, ghost.mesh.position.z)
        ctx.fillStyle = '#ff6b9d'
        ctx.beginPath()
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const player = this.game.player
    if (player?.mesh) {
      const [px, py] = toMap(player.mesh.position.x, player.mesh.position.z)
      ctx.fillStyle = '#00ffaa'
      ctx.shadowColor = '#00ffaa'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.strokeStyle = '#00ffaa'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px + Math.sin(player.angle) * 8, py + Math.cos(player.angle) * 8)
      ctx.stroke()
    }
  }
}

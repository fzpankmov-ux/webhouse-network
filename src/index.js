import Game from './Game/Game.js'

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
  const joinScreen = document.getElementById('join-screen')
  const joinBtn = document.getElementById('join-btn')
  const nameInput = document.getElementById('join-name')

  // Handle join button
  joinBtn.addEventListener('click', () => startGame())

  // Handle Enter key
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame()
  })

  // Focus the input
  nameInput.focus()

  const urlInput = document.getElementById('join-url')

  function startGame() {
    const name = nameInput.value.trim() || 'Anónimo'
    const url = urlInput.value.trim() || ''

    // Hide join screen
    joinScreen.classList.add('hidden')

    // Pick random colors for this player's house
    const colorPairs = [
      ['#ff6b2b', '#ff44aa'],
      ['#7c5cff', '#ff6b9d'],
      ['#00d4aa', '#0088ff'],
      ['#d8cf3b', '#ff4f2b'],
      ['#b678ff', '#ff86d9'],
      ['#ff9d9d', '#ffa882'],
      ['#91f0ff', '#128fff'],
    ]
    const pair = colorPairs[Math.floor(Math.random() * colorPairs.length)]

    // Initialize the game with player info
    const game = new Game({
      canvas: document.getElementById('webhouse-canvas'),
      playerInfo: {
        name,
        color: pair[0],
        color1: pair[0],
        color2: pair[1],
        tagline: `Vecino del metaverso`,
        url,
        rooms: ['Lobby'],
      },
    })

    // Expose for debugging
    window.game = game
  }
})

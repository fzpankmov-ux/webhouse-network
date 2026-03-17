import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import config from './config.js'
import WorldState from './WorldState.js'
import HouseManager from './HouseManager.js'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins in dev
    methods: ['GET', 'POST'],
  },
})

const state = new WorldState()
const houseManager = new HouseManager()

// ─── Pre-register the two founding houses ─────────────────

// Fabrizio's house — fzpank.com
const fabrizioPlot = houseManager.assignPlot('fabrizio')
state.addHouse('fabrizio', {
  owner: 'Fabrizio Hernandez',
  name: 'Casa de Fabrizio',
  position: [fabrizioPlot.x, 0, fabrizioPlot.z],
  initial: 'F',
  tagline: 'Filmmaker, creative developer y constructor de mundos digitales',
  url: 'fzpank.com',
  color1: '#7c5cff',
  color2: '#ff6b9d',
  theme: 'cyberpunk',
  rooms: ['Lobby', 'Galeria', 'Estudio', 'Jukebox'],
})

// Amigo's house — bydebourg.com
const amigoPlot = houseManager.assignPlot('bydebourg')
state.addHouse('bydebourg', {
  owner: 'Bydebourg',
  name: 'Casa de Bydebourg',
  position: [amigoPlot.x, 0, amigoPlot.z],
  initial: 'B',
  tagline: 'Developer, gamer y explorador del metaverso',
  url: 'bydebourg.com',
  color1: '#00d4aa',
  color2: '#0088ff',
  theme: 'matrix',
  rooms: ['Lobby', 'Arcade', 'Galeria'],
})

console.log(`[WebHouse Server] Founding houses registered:`)
console.log(`  → fzpank.com at [${fabrizioPlot.x}, ${fabrizioPlot.z}]`)
console.log(`  → bydebourg.com at [${amigoPlot.x}, ${amigoPlot.z}]`)

// ─── Connection handling ──────────────────────────────────

const disconnectTimers = new Map()

io.on('connection', (socket) => {
  console.log(`[+] Player connected: ${socket.id}`)

  // Handle join
  socket.on('join', (data) => {
    const { name, color, color1, color2, tagline, url, rooms } = data || {}

    // Register player
    const player = state.addPlayer(socket.id, { name, color })
    player.houseId = socket.id

    // Assign a house plot
    const plot = houseManager.assignPlot(socket.id)
    if (plot) {
      const house = state.addHouse(socket.id, {
        owner: name || 'Anónimo',
        name: `Casa de ${name || 'Anónimo'}`,
        position: [plot.x, 0, plot.z],
        initial: (name || 'A')[0].toUpperCase(),
        tagline: tagline || 'Nuevo vecino del metaverso',
        url: url || '',
        color1: color1 || color || state._randomColor(),
        color2: color2 || state._randomColor(),
        rooms: rooms || ['Lobby'],
      })

      console.log(`  → ${name || 'Anónimo'} got house at [${plot.x}, ${plot.z}]`)

      // Send full world state to the new player
      socket.emit('world-state', {
        yourId: socket.id,
        ...state.getSnapshot(),
      })

      // Notify everyone else
      socket.broadcast.emit('player-joined', {
        player: {
          id: socket.id,
          name: player.name,
          color: player.color,
          position: player.position,
          angle: player.angle,
        },
        house,
      })
    } else {
      // World is full
      socket.emit('world-full')
      console.log(`  ✗ No plots available for ${name}`)
    }
  })

  // Handle position updates from client
  socket.on('player-update', (data) => {
    state.updatePlayer(socket.id, data)
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    const player = state.getPlayer(socket.id)
    const name = player?.name || socket.id
    console.log(`[-] Player disconnected: ${name}`)

    // Start grace timer
    const timer = setTimeout(() => {
      state.removePlayer(socket.id)
      state.removeHouse(socket.id)
      houseManager.releasePlot(socket.id)
      disconnectTimers.delete(socket.id)

      io.emit('player-left', { id: socket.id })
      console.log(`  → ${name}'s house removed (grace expired)`)
    }, config.DISCONNECT_GRACE)

    disconnectTimers.set(socket.id, timer)

    // Immediately tell others to hide the car
    socket.broadcast.emit('player-left-temp', { id: socket.id })
  })
})

// ─── Broadcast loop (20Hz) ────────────────────────────────

const TICK_MS = 1000 / config.BROADCAST_RATE

setInterval(() => {
  const positions = state.getPositionsTick()
  if (Object.keys(positions).length > 0) {
    io.volatile.emit('world-tick', positions)
  }
}, TICK_MS)

// ─── Start server ─────────────────────────────────────────

httpServer.listen(config.PORT, () => {
  console.log(`\n🌐 WebHouse Server running on http://localhost:${config.PORT}`)
  console.log(`   Broadcast rate: ${config.BROADCAST_RATE}Hz`)
  console.log(`   Max players: ${config.MAX_PLAYERS}`)
  console.log(`   Waiting for connections...\n`)
})

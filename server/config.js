/**
 * Server configuration constants
 */
export default {
  PORT: 3001,
  BROADCAST_RATE: 20,        // Hz — server sends world state 20 times/sec
  WORLD_BOUNDS: 140,         // Max distance from origin
  HOUSE_GRID_SPACING: 30,    // Distance between house plots
  MAX_PLAYERS: 50,
  DISCONNECT_GRACE: 15000,   // ms before removing a disconnected player's house
}

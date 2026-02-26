const { v4: uuidv4 } = require('uuid');

/**
 * In-Memory Game State Engine
 * 
 * rooms: Map<roomId, Room>
 * 
 * This is the source of truth for all live game data.
 * No database calls during active gameplay.
 */

const CURSOR_COLORS = ['#39ff14', '#00f0ff', '#ff3131', '#ff9800', '#b051ff'];
const MAX_PLAYERS = 4;
const GAME_DURATION_MS = 300_000; // 5 minutes
const SABOTAGE_COOLDOWN_MS = 10_000; // 10 seconds

// Global rooms map
const rooms = new Map();

/**
 * Create a new room
 */
function createRoom(hostSocketId, hostUsername, customRoomId = null) {
    const roomId = customRoomId || uuidv4().substring(0, 6).toUpperCase();
    const room = {
        roomId,
        status: 'LOBBY', // LOBBY | PLAYING | FINISHED
        hostId: hostSocketId,
        challengeId: null,
        timeLimitMs: GAME_DURATION_MS,
        players: new Map(),
        state: {
            timeLeftMs: GAME_DURATION_MS,
            impostorId: null,
            sabotageCooldownEnd: 0,
            sabotageLog: [],
            executionResult: null,
            timerInterval: null,
        },
    };

    // Add host as first player
    room.players.set(hostSocketId, {
        id: hostSocketId,
        username: hostUsername,
        role: 'UNASSIGNED',
        cursorColor: CURSOR_COLORS[0],
        isReady: false,
    });

    rooms.set(roomId, room);
    return room;
}

/**
 * Add a player to an existing room
 */
function joinRoom(roomId, socketId, username) {
    const room = rooms.get(roomId);
    if (!room) return { error: 'Room not found' };
    if (room.status !== 'LOBBY') return { error: 'Game already in progress' };
    if (room.players.size >= MAX_PLAYERS) return { error: 'Room is full' };

    const colorIndex = room.players.size % CURSOR_COLORS.length;
    room.players.set(socketId, {
        id: socketId,
        username,
        role: 'UNASSIGNED',
        cursorColor: CURSOR_COLORS[colorIndex],
        isReady: false,
    });

    return { room };
}

/**
 * Remove a player from a room
 */
function leaveRoom(roomId, socketId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    room.players.delete(socketId);

    // If room is empty, destroy it
    if (room.players.size === 0) {
        if (room.state.timerInterval) clearInterval(room.state.timerInterval);
        rooms.delete(roomId);
        return null;
    }

    // If host left, assign new host
    if (room.hostId === socketId) {
        room.hostId = room.players.keys().next().value;
    }

    return room;
}

/**
 * Toggle player ready status
 */
function toggleReady(roomId, socketId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(socketId);
    if (!player) return null;

    player.isReady = !player.isReady;
    return room;
}

/**
 * Assign roles randomly (3 Civilians, 1 Impostor)
 */
function assignRoles(roomId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const playerIds = Array.from(room.players.keys());
    const impostorIndex = Math.floor(Math.random() * playerIds.length);

    playerIds.forEach((id, index) => {
        const player = room.players.get(id);
        player.role = index === impostorIndex ? 'IMPOSTOR' : 'CIVILIAN';
    });

    room.state.impostorId = playerIds[impostorIndex];
    room.status = 'PLAYING';

    return room;
}

/**
 * Validate and apply a sabotage action
 */
function trySabotage(roomId, socketId, sabotageType, lineNumber) {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'PLAYING') return { error: 'Game not active' };
    if (room.state.impostorId !== socketId) return { error: 'Not the impostor' };

    const now = Date.now();
    if (now < room.state.sabotageCooldownEnd) {
        return { error: 'Cooldown active', cooldownRemainingMs: room.state.sabotageCooldownEnd - now };
    }

    // Apply cooldown
    room.state.sabotageCooldownEnd = now + SABOTAGE_COOLDOWN_MS;

    // Log sabotage (don't reveal who did it to civilians)
    room.state.sabotageLog.push({
        timestamp: now,
        type: sabotageType,
        lineNumber,
    });

    return {
        success: true,
        cooldownEnd: room.state.sabotageCooldownEnd,
        sabotageType,
        lineNumber,
    };
}

/**
 * Get serializable room state for broadcasting (hides sensitive info)
 */
function getRoomPublicState(roomId) {
    const room = rooms.get(roomId);
    if (!room) return null;

    const players = [];
    for (const [, player] of room.players) {
        players.push({
            id: player.id,
            username: player.username,
            cursorColor: player.cursorColor,
            isReady: player.isReady,
            // Never expose role in public state
        });
    }

    return {
        roomId: room.roomId,
        status: room.status,
        hostId: room.hostId,
        players,
        challengeData: room.challengeData, // Expose challenge data for reconnections
        timeLeftMs: room.state.timeLeftMs,
        executionResult: room.state.executionResult,
    };
}

/**
 * Find which room a socket belongs to
 */
function findRoomBySocket(socketId) {
    for (const [roomId, room] of rooms) {
        if (room.players.has(socketId)) return roomId;
    }
    return null;
}

module.exports = {
    rooms,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    assignRoles,
    trySabotage,
    getRoomPublicState,
    findRoomBySocket,
    MAX_PLAYERS,
    GAME_DURATION_MS,
    SABOTAGE_COOLDOWN_MS,
};

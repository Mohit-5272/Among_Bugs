const gameState = require('./GameState');
const Challenge = require('../models/Challenge');
const TestCase = require('../models/TestCase');
const axios = require('axios');

const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

/**
 * Register all Socket.io event handlers
 */
function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // ─── LOBBY EVENTS ───────────────────────────────────

        /**
         * Create a new room
         */
        socket.on('create_room', ({ username, roomId }, callback) => {
            const room = gameState.createRoom(socket.id, username, roomId);
            socket.join(room.roomId);
            console.log(`[Room] ${username} created room ${room.roomId}`);
            callback({ roomId: room.roomId });
            io.to(room.roomId).emit('room_update', gameState.getRoomPublicState(room.roomId));
        });

        /**
         * Join an existing room
         */
        socket.on('join_room', ({ roomId, username }, callback) => {
            const result = gameState.joinRoom(roomId, socket.id, username);
            if (result.error) {
                if (callback) callback({ error: result.error });
                return;
            }

            socket.join(roomId);
            console.log(`[Room] ${username} joined room ${roomId}`);
            if (callback) callback({ roomId });
            io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
        });

        /**
         * Toggle player ready status
         */
        socket.on('player_ready', ({ roomId }) => {
            gameState.toggleReady(roomId, socket.id);
            io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
        });

        // ─── GAME START ─────────────────────────────────────

        /**
         * Start the game (host only)
         */
        socket.on('start_game', async ({ roomId }) => {
            console.log('[start_game] Received start_game event for room:', roomId);
            
            const room = gameState.rooms.get(roomId);
            if (!room) {
                console.log('[start_game] Room not found:', roomId);
                return;
            }
            if (room.hostId !== socket.id) {
                console.log('[start_game] Not the host. Host:', room.hostId, 'Requester:', socket.id);
                return;
            }
            // Allow single player for testing (remove this check if you want multiplayer-only)
            // if (room.players.size < 2) return;

            console.log(`[start_game] Starting game for room ${roomId} with ${room.players.size} player(s)`);

            try {
                // Generate a dynamic challenge via Groq (primary) or Gemini (fallback)
                const { generateDynamicChallenge } = require('../services/llmService');
                console.log('[start_game] Calling generateDynamicChallenge...');
                const challenge = await generateDynamicChallenge();
                
                if (!challenge) {
                    console.log('[start_game] Failed to generate challenge - challenge is null/undefined');
                    return;
                }

                console.log(`[start_game] Generated challenge: ${challenge.title}`);

                // In multiplayer we don't strictly need a challenge _id, but we can mock one
                room.challengeId = 'dynamic_' + Date.now();

                // Assign roles
                gameState.assignRoles(roomId);

                // Save challenge data to room state for reconnecting players
                room.challengeData = {
                    title: challenge.title,
                    description: challenge.description,
                    starterCode: challenge.starterCode,
                    testCases: challenge.testCases,
                };

                // Send each player their secret role
                for (const [socketId, player] of room.players) {
                    console.log(`[start_game] Sending game_started to ${player.username} (${socketId})`);
                    io.to(socketId).emit('game_started', {
                        role: player.role,
                        challenge: room.challengeData,
                        timerDuration: room.timeLimitMs,
                    });
                }

                // Start countdown timer
                room.state.timerInterval = setInterval(() => {
                    room.state.timeLeftMs -= 1000;

                    io.to(roomId).emit('timer_tick', { timeLeftMs: room.state.timeLeftMs });

                    // Time's up — Impostor wins
                    if (room.state.timeLeftMs <= 0) {
                        clearInterval(room.state.timerInterval);
                        room.status = 'FINISHED';
                        io.to(roomId).emit('game_over', {
                            winner: 'IMPOSTOR',
                            impostorId: room.state.impostorId,
                        });
                    }
                }, 1000);

                console.log(`[Game] Room ${roomId} started with challenge: ${room.challengeData.title}`);
            } catch (error) {
                console.error('[start_game] Error:', error);
            }
        });

        // ─── MOCK MODE TOGGLE ───────────────────────────────
        socket.on('toggle_mock_mode', ({ roomId, enabled }) => {
            const room = gameState.rooms.get(roomId);
            if (!room) return;
            if (room.hostId !== socket.id) return; // only host can toggle

            if (enabled) {
                // Kick all non-host players
                for (const [socketId, player] of room.players) {
                    if (socketId !== socket.id) {
                        io.to(socketId).emit('kicked_from_room', {
                            message: 'Host enabled Mock Player Mode. You have been removed from the lobby.'
                        });
                        const sock = io.sockets.sockets.get(socketId);
                        if (sock) sock.leave(roomId);
                    }
                }
                // Remove them from game state
                const toRemove = [];
                for (const [socketId] of room.players) {
                    if (socketId !== socket.id) toRemove.push(socketId);
                }
                toRemove.forEach(sid => room.players.delete(sid));

                console.log(`[MockMode] Host enabled mock mode in room ${roomId}, kicked ${toRemove.length} players`);
            }

            // Send updated room state to remaining players (just the host)
            io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
        });

        // ─── PLAYER EXIT (via Exit button) ──────────────────
        socket.on('player_exit', ({ roomId }) => {
            const room = gameState.rooms.get(roomId);
            if (!room) return;

            const player = room.players.get(socket.id);
            if (!player) return;

            console.log(`[Exit] ${player.username} exited room ${roomId} (role: ${player.role})`);

            // If the impostor exits, civilians win
            if (room.state.impostorId === socket.id && room.status === 'PLAYING') {
                clearInterval(room.state.timerInterval);
                room.status = 'FINISHED';
                io.to(roomId).emit('game_over', {
                    winner: 'CIVILIANS',
                    reason: 'Impostor left the game',
                    impostorId: socket.id,
                });
            }

            // Remove the player from the room
            gameState.leaveRoom(roomId, socket.id);
            socket.leave(roomId);
            io.to(roomId).emit('player_left', { socketId: socket.id, username: player.username });
            io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
        });

        // ─── GAMEPLAY EVENTS ────────────────────────────────

        /**
         * Impostor triggers a sabotage
         */
        socket.on('trigger_sabotage', ({ roomId, type, lineNumber }) => {
            const result = gameState.trySabotage(roomId, socket.id, type, lineNumber);

            if (result.error) {
                socket.emit('sabotage_rejected', { error: result.error, cooldownRemainingMs: result.cooldownRemainingMs });
                return;
            }

            // Notify impostor of success + cooldown
            socket.emit('sabotage_applied', {
                type: result.sabotageType,
                cooldownEnd: result.cooldownEnd,
            });

            // Broadcast diff update to all players (without revealing who)
            io.to(roomId).emit('diff_update', {
                timestamp: Date.now(),
                action: `Modified code near line ${lineNumber}`,
            });

            console.log(`[Sabotage] ${type} at line ${lineNumber} in room ${roomId}`);
        });

        /**
         * Player submits code for execution
         */
        socket.on('run_code', async ({ roomId, code }) => {
            const room = gameState.rooms.get(roomId);
            if (!room || room.status !== 'PLAYING') return;

            io.to(roomId).emit('execution_started');

            try {
                // Get test cases from MongoDB
                const testCases = await TestCase.find({ challengeId: room.challengeId });
                const results = [];
                let allPassed = true;

                for (const tc of testCases) {
                    const result = await executeCode(code, tc.input, tc.expectedOutput);
                    results.push(result);
                    if (!result.passed) allPassed = false;
                }

                room.state.executionResult = { passed: allPassed, results };

                io.to(roomId).emit('execution_result', { passed: allPassed, results });

                // If all tests pass — Civilians win!
                if (allPassed) {
                    clearInterval(room.state.timerInterval);
                    room.status = 'FINISHED';
                    io.to(roomId).emit('game_over', {
                        winner: 'CIVILIANS',
                        impostorId: room.state.impostorId,
                    });
                }
            } catch (err) {
                console.error('[Judge0] Execution error:', err.message);
                io.to(roomId).emit('execution_result', {
                    passed: false,
                    results: [{ passed: false, error: 'Execution service unavailable' }],
                });
            }
        });

        // ─── RECONNECTION HANDLING ──────────────────────────
        // Track pending disconnections: socketId -> { roomId, timeout, username }
        const pendingDisconnects = new Map();

        /**
         * Player reconnects within 30-second grace period
         */
        socket.on('reconnect_to_room', ({ roomId, username }, callback) => {
            const room = gameState.rooms.get(roomId);
            if (!room) {
                callback?.({ error: 'Room no longer exists' });
                return;
            }

            // Find if this username has a pending disconnect
            let oldSocketId = null;
            for (const [sid, info] of pendingDisconnects) {
                if (info.roomId === roomId && info.username === username) {
                    oldSocketId = sid;
                    break;
                }
            }

            if (oldSocketId) {
                // Cancel the removal timer
                clearTimeout(pendingDisconnects.get(oldSocketId).timeout);
                pendingDisconnects.delete(oldSocketId);

                // Transfer player data from old socket to new socket
                const oldPlayer = room.players.get(oldSocketId);
                if (oldPlayer) {
                    oldPlayer.status = 'connected';
                    room.players.set(socket.id, oldPlayer);
                    room.players.delete(oldSocketId);

                    // Update host if needed
                    if (room.hostId === oldSocketId) room.hostId = socket.id;
                    if (room.state.impostorId === oldSocketId) room.state.impostorId = socket.id;
                }

                socket.join(roomId);
                console.log(`[Reconnect] ${username} reconnected to room ${roomId} (${oldSocketId} -> ${socket.id})`);
                callback?.({ success: true, roomId });

                io.to(roomId).emit('player_reconnected', { username });
                io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
            } else {
                // No pending disconnect — treat as fresh join
                const result = gameState.joinRoom(roomId, socket.id, username);
                if (result.error) {
                    callback?.({ error: result.error });
                    return;
                }
                socket.join(roomId);
                callback?.({ success: true, roomId });
                io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
            }
        });

        // ─── DISCONNECTION WITH GRACE PERIOD ────────────────

        socket.on('disconnect', () => {
            const roomId = gameState.findRoomBySocket(socket.id);
            if (!roomId) {
                console.log(`[Socket] Disconnected (no room): ${socket.id}`);
                return;
            }

            const room = gameState.rooms.get(roomId);
            if (!room) return;

            const player = room.players.get(socket.id);
            const username = player?.username || 'Unknown';

            // If game is NOT active, remove immediately
            if (room.status !== 'PLAYING') {
                const updatedRoom = gameState.leaveRoom(roomId, socket.id);
                if (updatedRoom) {
                    io.to(roomId).emit('player_left', { socketId: socket.id, username });
                    io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));
                }
                console.log(`[Socket] Disconnected (lobby): ${socket.id} (${username})`);
                return;
            }

            // Game is active — start 30-second grace period
            if (player) player.status = 'disconnected';
            io.to(roomId).emit('player_disconnected', { username, gracePeriodMs: 30000 });

            console.log(`[Socket] ${username} disconnected from room ${roomId} — 30s grace period started`);

            const timeout = setTimeout(() => {
                pendingDisconnects.delete(socket.id);

                // Grace period expired — remove player
                const currentRoom = gameState.leaveRoom(roomId, socket.id);
                if (currentRoom) {
                    io.to(roomId).emit('player_left', { socketId: socket.id, username, reason: 'Grace period expired' });
                    io.to(roomId).emit('room_update', gameState.getRoomPublicState(roomId));

                    // If the impostor timed out — Civilians win
                    if (currentRoom.state.impostorId === socket.id) {
                        clearInterval(currentRoom.state.timerInterval);
                        currentRoom.status = 'FINISHED';
                        io.to(roomId).emit('game_over', {
                            winner: 'CIVILIANS',
                            reason: 'Impostor disconnected',
                            impostorId: socket.id,
                        });
                    }
                }

                console.log(`[Socket] ${username} grace period expired — removed from room ${roomId}`);
            }, 30000);

            pendingDisconnects.set(socket.id, { roomId, username, timeout });
        });
    });
}

/**
 * Execute C++ code against a single test case via Judge0
 */
async function executeCode(sourceCode, stdin, expectedOutput) {
    // C++ language_id in Judge0 = 54
    try {
        const submission = await axios.post(
            `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: sourceCode,
                language_id: 54,
                stdin: stdin,
                expected_output: expectedOutput,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                },
                timeout: 15000,
            }
        );

        const data = submission.data;
        const passed = data.status && data.status.id === 3; // Accepted

        return {
            passed,
            status: data.status ? data.status.description : 'Unknown',
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            compile_output: data.compile_output || '',
            expected: expectedOutput,
        };
    } catch (err) {
        return {
            passed: false,
            status: 'Error',
            error: err.message,
            expected: expectedOutput,
        };
    }
}

module.exports = { registerSocketHandlers };

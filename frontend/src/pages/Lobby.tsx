import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Copy, Check, Users, Send, Settings, Play, Loader2, Sparkles } from 'lucide-react';

interface LobbyPlayer {
    id: string;
    username: string;
    isHost: boolean;
    isReady: boolean;
}

interface ChatMsg {
    id: number;
    sender: string;
    text: string;
    timestamp: number;
}

const Lobby = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { player, setPlayerInfo } = useUser();
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();

    // Host settings
    const [matchTime, setMatchTime] = useState(5); // minutes
    const [cooldownTime, setCooldownTime] = useState(15); // seconds
    const [copied, setCopied] = useState(false);

    // Mock players including host
    const [players, setPlayers] = useState<LobbyPlayer[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [generatingChallenge, setGeneratingChallenge] = useState(false);

    const isHost = players.length > 0 && players[0].username === (user?.username || player?.username);
    const canStart = players.length >= 2 && players.length <= 4 && isConnected;

    // Initialize with current player as host + create room on backend
    useEffect(() => {
        const name = user?.username || player?.username || 'Player';
        if (!player) setPlayerInfo(name);

        // Create room on backend when socket connects
        if (socket && isConnected && roomId) {
            console.log('[Lobby] Creating room on backend with ID:', roomId);
            socket.emit('create_room', { username: name, roomId }, (response: any) => {
                if (response.error) {
                    console.error('[Lobby] Failed to create room:', response.error);
                } else {
                    console.log('[Lobby] Room created successfully:', response.roomId);
                }
            });
        }

        setPlayers([
            { id: '1', username: name, isHost: true, isReady: true },
            { id: '2', username: 'Alex', isHost: false, isReady: true },
            { id: '3', username: 'Sam', isHost: false, isReady: false },
        ]);

        setChatMessages([
            { id: 1, sender: 'Alex', text: 'Hey! Ready when you are 🎮', timestamp: Date.now() - 30000 },
            { id: 2, sender: 'Sam', text: 'This is going to be fun', timestamp: Date.now() - 15000 },
        ]);
    }, [socket, isConnected, roomId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/lobby/${roomId}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            sender: user?.username || player?.username || 'You',
            text: chatInput.trim(),
            timestamp: Date.now(),
        }]);
        setChatInput('');
    };

    // Listen for the backend telling us the game actually started (this handles Gemini loading time)
    useEffect(() => {
        if (!socket) return;

        const handleGameStarted = (data: any) => {
            console.log("[Lobby] Game started! Navigating...", data);
            setGeneratingChallenge(false);
            setIsStarting(false);
            
            // Store challenge in sessionStorage so GameRoom can access it
            sessionStorage.setItem(`challenge_${roomId}`, JSON.stringify(data));
            
            // Navigate to GameRoom
            navigate(`/room/${roomId}`);
        };

        socket.on('game_started', handleGameStarted);

        return () => {
            socket.off('game_started', handleGameStarted);
        };
    }, [socket, navigate, roomId]);

    const handleStartGame = () => {
        console.log('[Lobby] Start game clicked');
        console.log('[Lobby] Socket connected:', isConnected);
        console.log('[Lobby] Room ID:', roomId);
        
        if (socket && isConnected) {
            setIsStarting(true);
            setGeneratingChallenge(true);
            console.log('[Lobby] Emitting start_game event');
            socket.emit('start_game', { roomId });

            // Fallback: if Gemini fails or backend is slow, force navigate after 30s
            setTimeout(() => {
                if (generatingChallenge) {
                    console.warn("[Lobby] Gemini timeout, navigating anyway");
                    setGeneratingChallenge(false);
                    setIsStarting(false);
                    navigate(`/room/${roomId}`);
                }
            }, 30000);
        } else {
            console.warn("[Lobby] Socket disconnected, falling back to instant navigate");
            navigate(`/room/${roomId}`);
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            height: '100vh', width: '100vw', display: 'flex', background: '#0a0a0f', overflow: 'hidden',
        }}>
            {/* Left: Lobby Info */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '600px',
                margin: '0 auto',
            }}>
                {/* Room Header */}
                <div style={{
                    background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '24px',
                    border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: '4px' }}>
                                Room Code
                            </div>
                            <div style={{
                                fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: 900, color: '#00f0ff',
                                letterSpacing: '0.2em',
                            }}>
                                {roomId}
                            </div>
                        </div>
                        <button onClick={handleCopyLink} style={{
                            padding: '10px 20px', background: copied ? 'rgba(57,255,20,0.15)' : 'rgba(0,240,255,0.12)',
                            border: `1px solid ${copied ? '#39ff14' : 'rgba(0,240,255,0.3)'}`, borderRadius: '10px',
                            color: copied ? '#39ff14' : '#00f0ff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                            display: 'flex', alignItems: 'center', gap: '6px',
                        }}>
                            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Invite Link</>}
                        </button>
                    </div>
                </div>

                {/* Players */}
                <div style={{
                    background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '20px',
                    border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px',
                }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '14px' }}>
                        <Users size={16} /> Connected Players ({players.length}/4)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {players.map(p => (
                            <div key={p.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                borderRadius: '10px', background: p.isHost ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${p.isHost ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.04)'}`,
                            }}>
                                <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: p.isReady ? '#39ff14' : '#ff9800',
                                }} />
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white', flex: 1 }}>
                                    {p.username}
                                </span>
                                {p.isHost && (
                                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,240,255,0.15)', color: '#00f0ff', fontWeight: 700 }}>HOST</span>
                                )}
                                <span style={{ fontSize: '0.7rem', color: p.isReady ? '#39ff14' : '#ff9800', fontWeight: 600 }}>
                                    {p.isReady ? 'Ready' : 'Not Ready'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Host Settings */}
                {isHost && (
                    <div style={{
                        background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '20px',
                        border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px',
                    }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9800', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '14px' }}>
                            <Settings size={16} /> Host Settings
                        </h3>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Match Time</label>
                                <span style={{ fontSize: '0.78rem', color: '#00f0ff', fontWeight: 700, fontFamily: 'monospace' }}>{matchTime} min</span>
                            </div>
                            <input type="range" min={5} max={15} value={matchTime} onChange={e => setMatchTime(Number(e.target.value))}
                                style={{ width: '100%', accentColor: '#00f0ff' }} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Impostor Cooldown</label>
                                <span style={{ fontSize: '0.78rem', color: '#ff9800', fontWeight: 700, fontFamily: 'monospace' }}>{cooldownTime}s</span>
                            </div>
                            <input type="range" min={10} max={60} value={cooldownTime} onChange={e => setCooldownTime(Number(e.target.value))}
                                style={{ width: '100%', accentColor: '#ff9800' }} />
                        </div>
                    </div>
                )}

                {/* Gemini Loading Banner */}
                {generatingChallenge && (
                    <div style={{
                        padding: '16px', borderRadius: '12px', marginBottom: '16px',
                        background: 'rgba(0,240,255,0.08)', border: '2px solid rgba(0,240,255,0.3)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                        animation: 'pulse 2s ease-in-out infinite',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Loader2 size={24} color="#00f0ff" style={{ animation: 'spin 1s linear infinite' }} />
                            <Sparkles size={20} color="#00f0ff" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#00f0ff', fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' }}>
                                🤖 GEMINI AI IS GENERATING YOUR CHALLENGE
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                                Creating a unique DSA problem with intentional bugs...
                            </div>
                        </div>
                    </div>
                )}

                {/* Socket Connection Status */}
                {!isConnected && !generatingChallenge && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                        background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)',
                        display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#ff9800', animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                        <span style={{ color: '#ff9800', fontSize: '0.8rem', fontWeight: 600 }}>
                            Connecting to server...
                        </span>
                    </div>
                )}

                {/* Start Game */}
                <button onClick={handleStartGame} disabled={!canStart || isStarting}
                    style={{
                        padding: '14px', background: canStart && !isStarting ? '#00f0ff' : 'rgba(255,255,255,0.05)',
                        border: 'none', borderRadius: '12px', color: canStart && !isStarting ? '#000' : 'rgba(255,255,255,0.2)',
                        fontWeight: 800, fontSize: '1rem', cursor: (canStart && !isStarting) ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', gap: '8px',
                        opacity: isStarting ? 0.7 : 1,
                    }}>
                    {isStarting ? (
                        <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Starting Game...</>
                    ) : !isConnected ? (
                        <>Waiting for connection...</>
                    ) : (
                        <><Play size={18} fill="currentColor" />
                            {canStart ? 'Start Game' : `Need ${2 - players.length > 0 ? 2 - players.length : 0} more player(s)`}</>
                    )}
                </button>
                
                <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </div>

            {/* Right: Lobby Chat */}
            <div style={{
                width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                background: 'rgba(10,10,20,0.85)', borderLeft: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px', margin: '12px 12px 12px 0', overflow: 'hidden',
            }}>
                <div style={{
                    padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontWeight: 800, fontSize: '0.85rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>
                    💬 Lobby Chat
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chatMessages.map(msg => {
                        const isMe = msg.sender === (user?.username || player?.username);
                        return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isMe ? '#00f0ff' : '#ff9800' }}>{isMe ? 'You' : msg.sender}</span>
                                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>{formatTime(msg.timestamp)}</span>
                                </div>
                                <div style={{
                                    padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                    background: isMe ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isMe ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                                    maxWidth: '240px', wordBreak: 'break-word',
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{msg.text}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} style={{
                    padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px',
                }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..."
                        maxLength={200} style={{
                            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit',
                        }} />
                    <button type="submit" disabled={!chatInput.trim()} style={{
                        background: chatInput.trim() ? '#00f0ff' : 'rgba(255,255,255,0.05)', border: 'none',
                        borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                    }}>
                        <Send size={16} color={chatInput.trim() ? '#000' : '#555'} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Lobby;

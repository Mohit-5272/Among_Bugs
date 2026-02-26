import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import CodeEditor, { CodeEditorHandle, ChallengeData } from '../components/Editor/CodeEditor';
import PlayerList from '../components/Game/PlayerList';
import SabotagePanel from '../components/Game/SabotagePanel';
import HistoryPanel from '../components/Game/HistoryPanel';
import ChatPanel from '../components/Game/ChatPanel';
import VotingModal from '../components/Game/VotingModal';
import SpectatePanel from '../components/Game/SpectatePanel';
import PowerUpPanel from '../components/Game/PowerUpPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, AlertTriangle, X, Trophy, XCircle, CheckCircle, RotateCcw, Home } from 'lucide-react';
import {
    playSabotageSound, playCountdownBeep, playVictorySound,
    playDefeatSound, playFreezeSound, playUndoSound,
} from '../utils/sounds';

const API_URL = 'http://localhost:3000';

interface TestResult {
    testCase: number;
    passed: boolean;
    status: string;
    isHidden: boolean;
    input: string;
    expected: string;
    got: string;
}

interface RunResult {
    passed: boolean;
    totalTests: number;
    passedCount: number;
    results: TestResult[];
}

const GameRoom = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { player, mockAssignRole } = useUser();
    const { colors } = useTheme();
    const { socket, isConnected } = useSocket();

    // Read initial data from Lobby navigation if available, or from sessionStorage
    const initialGameData = location.state?.initialGameData ||
        (roomId ? JSON.parse(sessionStorage.getItem(`challenge_${roomId}`) || 'null') : null);

    const [timeLeft, setTimeLeft] = useState(initialGameData ? Math.floor(initialGameData.timerDuration / 1000) : 300);
    const [challengeData, setChallengeData] = useState<ChallengeData | null>(initialGameData ? initialGameData.challenge : null);
    const [loadingChallenge, setLoadingChallenge] = useState(!initialGameData);

    // Clear sessionStorage after reading
    useEffect(() => {
        if (roomId && initialGameData) {
            sessionStorage.removeItem(`challenge_${roomId}`);
        }
    }, [roomId, initialGameData]);

    const editorRef = useRef<CodeEditorHandle>(null);
    const [runResult, setRunResult] = useState<RunResult | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Voting system
    const [showVoting, setShowVoting] = useState(false);
    const [gameEnded, setGameEnded] = useState(false);

    // Power-up system
    const [lastSabotageCode, setLastSabotageCode] = useState<string | null>(null);
    const [impostorFrozen, setImpostorFrozen] = useState(false);

    // Timer with countdown beeps
    useEffect(() => {
        if (gameEnded) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setShowVoting(true);
                    return 0;
                }
                // Play countdown beeps in last 30 seconds
                if (prev <= 31) playCountdownBeep(prev - 1);
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameEnded]);

    // Connect socket and handle game state
    useEffect(() => {
        if (!socket || !isConnected || !player) return;

        console.log('[GameRoom] Socket connected, joining room:', roomId);
        console.log('[GameRoom] Initial challenge data:', challengeData);

        // Tell backend we joined
        socket.emit('join_room', { roomId, username: player.username });

        socket.on('room_update', (roomState: any) => {
            console.log('[GameRoom] Room update received:', roomState);
            setTimeLeft(Math.floor(roomState.timeLeftMs / 1000));
            // If joining late, sync the challenge from the room state
            if (roomState.challengeData && !challengeData) {
                console.log('[GameRoom] Setting challenge from room state');
                setChallengeData(roomState.challengeData);
                setLoadingChallenge(false);
            }
        });

        socket.on('game_started', (data: any) => {
            console.log('[GameRoom] Game started event received:', data);
            setChallengeData(data.challenge);
            setTimeLeft(Math.floor(data.timerDuration / 1000));
            setLoadingChallenge(false);
        });

        socket.on('game_over', (data: any) => {
            setGameEnded(true);
            setShowVoting(true); // Simplified for MVP
            data.winner === 'CIVILIAN_WIN' ? playVictorySound() : playDefeatSound();
        });

        socket.on('error', ({ message }: { message: string }) => {
            console.error('Socket error:', message);
            // navigate('/'); Uncomment when strict error handling is desired
        });

        return () => {
            socket.off('room_update');
            socket.off('game_started');
            socket.off('game_over');
            socket.off('error');
        };
    }, [socket, isConnected, roomId, player?.username, challengeData]);

    const getCode = useCallback(() => editorRef.current?.getCode() || '', []);

    // Sabotage wrapper — saves pre-sabotage code + plays sound
    const setCodeWithHistory = useCallback((code: string) => {
        const currentCode = editorRef.current?.getCode() || '';
        setLastSabotageCode(currentCode);
        editorRef.current?.setCode(code);
        playSabotageSound();
    }, []);

    const handleUndoSabotage = useCallback(() => {
        if (lastSabotageCode) {
            editorRef.current?.setCode(lastSabotageCode);
            setLastSabotageCode(null);
            playUndoSound();
        }
    }, [lastSabotageCode]);

    const handleFreezeImpostor = useCallback(() => {
        setImpostorFrozen(true);
        playFreezeSound();
        setTimeout(() => setImpostorFrozen(false), 20000);
    }, []);

    const handleVotingResult = (result: 'CIVILIAN_WIN' | 'IMPOSTOR_WIN') => {
        result === 'CIVILIAN_WIN' ? playVictorySound() : playDefeatSound();
        setShowVoting(false);
        setGameEnded(true);
        setTimeout(() => navigate('/'), 1500);
    };

    const handleRunTests = async () => {
        const challenge = editorRef.current?.getChallenge();
        const code = editorRef.current?.getCode();
        if (!challenge || !code) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/api/run-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: challenge._id,
                    code,
                    testCases: challenge.testCases // Pass dynamic test cases to backend
                }),
            });
            const data: RunResult = await res.json();
            setRunResult(data);
            setShowResult(true);
            if (data.passed) {
                playVictorySound();
                setGameEnded(true); // Stop the timer
            } else {
                playDefeatSound();
            }
        } catch (err) {
            console.error('Run code error:', err);
            setRunResult({
                passed: false, totalTests: 0, passedCount: 0,
                results: [{ testCase: 1, passed: false, status: 'Error', isHidden: false, input: '', expected: '', got: 'Could not connect to server' }],
            });
            setShowResult(true);
            playDefeatSound();
        } finally {
            setSubmitting(false);
        }
    };

    if (!player) return null;

    // Show loading screen if challenge is not yet loaded
    if (loadingChallenge || !challengeData) {
        return (
            <div style={{
                height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', gap: '20px',
            }}>
                <div style={{
                    width: '48px', height: '48px', border: '4px solid rgba(0,240,255,0.2)',
                    borderTop: '4px solid #00f0ff', borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <h2 style={{ color: '#00f0ff', fontWeight: 800, fontSize: '1.3rem', fontFamily: "'Nunito', sans-serif" }}>
                    LOADING CHALLENGE...
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                    {loadingChallenge ? 'Gemini AI is generating your challenge...' : 'Waiting for game to start...'}
                </p>
                <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    const isImpostor = player.role === 'IMPOSTOR';

    return (
        <div style={{
            display: 'flex', height: '100vh', width: '100vw',
            overflow: 'hidden', background: '#0a0a0f',
        }}>
            {/* Theme background gradient */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: colors.bgGradient,
                transition: 'background 0.8s ease',
            }} />

            {/* Left Sidebar */}
            <div style={{
                width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                background: colors.surface, backdropFilter: 'blur(12px)',
                borderRight: `1px solid ${colors.accentBorder}`,
                borderRadius: '12px', margin: '12px', overflow: 'hidden', zIndex: 1,
                transition: 'all 0.5s ease',
            }}>
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.accentBorder}` }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>ROOM:</span>
                        <span style={{ fontFamily: 'monospace', color: colors.accent, letterSpacing: '0.15em', transition: 'color 0.5s ease' }}>{roomId}</span>
                    </h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <PlayerList />
                    <div style={{ height: '1px', background: colors.accentBorder, margin: '4px 0' }} />
                    <HistoryPanel />
                </div>
            </div>

            {/* Main: Header + Editor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 0', minWidth: 0, overflow: 'hidden', zIndex: 1 }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px', background: colors.surface, backdropFilter: 'blur(12px)',
                    borderRadius: '12px', marginBottom: '12px', border: `1px solid ${colors.accentBorder}`,
                    flexShrink: 0, transition: 'all 0.5s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            color: timeLeft <= 30 ? '#ff3131' : colors.timerColor,
                            fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700,
                            background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px',
                            border: `1px solid ${timeLeft <= 30 ? 'rgba(255,49,49,0.5)' : 'rgba(255,152,0,0.3)'}`,
                            animation: timeLeft <= 10 ? 'pulse 0.5s infinite' : 'none',
                        }}>
                            <Timer size={18} />
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                        {isImpostor && (
                            <span style={{ color: '#ff3131', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={16} /> YOU ARE THE IMPOSTOR
                                {impostorFrozen && (
                                    <span style={{
                                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px',
                                        background: 'rgba(135,206,250,0.15)', color: '#87CEFA', fontWeight: 700,
                                        animation: 'pulse 1s infinite',
                                    }}>❄️ FROZEN</span>
                                )}
                            </span>
                        )}
                        {!isImpostor && player.role === 'CIVILIAN' && (
                            <span style={{ color: '#00f0ff', fontWeight: 700 }}>CIVILIAN (Fix the code!)</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', marginRight: '12px', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                            <button onClick={() => mockAssignRole('CIVILIAN')} style={{
                                padding: '4px 10px', fontSize: '0.7rem', background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600,
                            }}>Mock Civ</button>
                            <button onClick={() => mockAssignRole('IMPOSTOR')} style={{
                                padding: '4px 10px', fontSize: '0.7rem', background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600,
                            }}>Mock Imp</button>
                        </div>
                        <button onClick={handleRunTests} disabled={submitting} style={{
                            padding: '8px 18px', background: submitting ? '#555' : colors.accent,
                            border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700,
                            cursor: submitting ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                            transition: 'background 0.3s ease',
                        }}>
                            <Play size={16} fill="currentColor" /> {submitting ? 'Running...' : 'Run Tests'}
                        </button>
                    </div>
                </div>

                {/* Challenge Info Panel */}
                {challengeData && (
                    <div style={{
                        padding: '14px 20px', background: colors.surface, backdropFilter: 'blur(12px)',
                        borderRadius: '12px', marginBottom: '12px', border: `1px solid ${colors.accentBorder}`,
                        flexShrink: 0, transition: 'all 0.5s ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            <span style={{
                                fontWeight: 800, color: '#00f0ff', fontSize: '0.95rem',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                fontFamily: "'Nunito', sans-serif",
                            }}>
                                {challengeData.title}
                            </span>
                            <span style={{
                                fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                background: challengeData.difficulty === 'easy' ? 'rgba(57,255,20,0.15)' : challengeData.difficulty === 'hard' ? 'rgba(255,49,49,0.15)' : 'rgba(255,152,0,0.15)',
                                color: challengeData.difficulty === 'easy' ? '#39ff14' : challengeData.difficulty === 'hard' ? '#ff3131' : '#ff9800',
                            }}>
                                {challengeData.difficulty}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                                {challengeData.testCases.filter(tc => !tc.isHidden).length} visible / {challengeData.testCases.filter(tc => tc.isHidden).length} hidden tests
                            </span>
                        </div>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', lineHeight: 1.65,
                            margin: 0, whiteSpace: 'pre-line', fontFamily: "'Inter', sans-serif",
                        }}>
                            {challengeData.description}
                        </p>
                    </div>
                )}

                {/* Editor */}
                <div style={{
                    flex: 1, background: colors.surface, backdropFilter: 'blur(12px)',
                    borderRadius: '12px', border: `1px solid ${colors.accentBorder}`,
                    overflow: 'hidden', position: 'relative', minHeight: 0,
                    transition: 'all 0.5s ease',
                }}>
                    <CodeEditor ref={editorRef} roomId={roomId!} initialChallenge={challengeData} />
                </div>
            </div>

            {/* Right: Chat */}
            <ChatPanel />

            {/* Impostor panels */}
            {isImpostor && !impostorFrozen && (
                <SabotagePanel getCode={getCode} setCode={setCodeWithHistory} />
            )}
            {isImpostor && <SpectatePanel />}

            {/* Civilian power-ups */}
            {player.role === 'CIVILIAN' && (
                <PowerUpPanel
                    onUndoSabotage={handleUndoSabotage}
                    onFreezeImpostor={handleFreezeImpostor}
                    lastSabotageCode={lastSabotageCode}
                />
            )}

            {/* Voting Modal */}
            <VotingModal isOpen={showVoting} onClose={handleVotingResult} currentPlayer={player.username} />

            {/* Result Modal with framer-motion */}
            <AnimatePresence>
                {showResult && runResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', zIndex: 1000,
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                background: '#12121f', border: `2px solid ${runResult.passed ? '#39ff14' : '#ff3131'}`,
                                borderRadius: '20px', padding: '32px', width: '90%', maxWidth: '520px',
                                maxHeight: '80vh', overflow: 'auto', position: 'relative',
                            }}
                        >
                            <button onClick={() => setShowResult(false)} style={{
                                position: 'absolute', top: '12px', right: '12px', background: 'none',
                                border: 'none', color: 'white', cursor: 'pointer',
                            }}><X size={20} /></button>

                            {runResult.passed ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { delay: 0.1, type: 'spring' } }} style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <Trophy size={48} color="#39ff14" style={{ marginBottom: '12px' }} />
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#39ff14', fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase', textShadow: '0 0 30px rgba(57,255,20,0.5)' }}>YOU WON!</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>All {runResult.totalTests} test cases passed! 🎉</p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                                        <button onClick={() => {
                                            sessionStorage.removeItem(`among-bugs-challenge-${roomId}`);
                                            setShowResult(false);
                                            setGameEnded(false);
                                            setTimeLeft(300);
                                            setRunResult(null);
                                        }} style={{
                                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                                            background: '#39ff14', color: '#000', fontWeight: 800, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                                        }}>
                                            <RotateCcw size={16} /> Play Again
                                        </button>
                                        <button onClick={() => navigate('/')} style={{
                                            padding: '10px 20px', borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                                            color: 'white', fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                                        }}>
                                            <Home size={16} /> Back to Home
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1, transition: { delay: 0.1, type: 'spring' } }} style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    <XCircle size={48} color="#ff3131" style={{ marginBottom: '12px' }} />
                                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#ff3131', fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase' }}>WRONG SUBMISSION</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>Passed {runResult.passedCount} / {runResult.totalTests} test cases</p>
                                </motion.div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {runResult.results.map((r, i) => (
                                    <motion.div key={r.testCase} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.06 } }}
                                        style={{
                                            padding: '10px 14px', borderRadius: '10px',
                                            background: r.passed ? 'rgba(57,255,20,0.06)' : 'rgba(255,49,49,0.06)',
                                            border: `1px solid ${r.passed ? 'rgba(57,255,20,0.2)' : 'rgba(255,49,49,0.2)'}`,
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                        }}>
                                        {r.passed ? <CheckCircle size={18} color="#39ff14" /> : <XCircle size={18} color="#ff3131" />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'white' }}>
                                                Test Case {r.testCase} {r.isHidden && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>(Hidden)</span>}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: r.passed ? 'rgba(57,255,20,0.6)' : 'rgba(255,49,49,0.6)', marginTop: '2px' }}>
                                                {r.status}{!r.passed && !r.isHidden && r.got && <span style={{ color: 'rgba(255,255,255,0.3)' }}> — {r.got}</span>}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {!runResult.passed && (() => {
                                const ff = runResult.results.find(r => !r.passed && !r.isHidden);
                                if (!ff) return null;
                                return (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }} style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }}>FAILED ON TEST CASE {ff.testCase}:</div>
                                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
                                            <div><span style={{ color: '#00f0ff' }}>Input:</span> {ff.input}</div>
                                            <div><span style={{ color: '#39ff14' }}>Expected:</span> {ff.expected}</div>
                                            <div><span style={{ color: '#ff3131' }}>Got:</span> {ff.got}</div>
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default GameRoom;

import { useState } from 'react';
import { Vote, UserCircle, Trophy, Skull, X } from 'lucide-react';

interface VotingPlayer {
    id: string;
    username: string;
    color: string;
}

// Mock players for voting
const MOCK_PLAYERS: VotingPlayer[] = [
    { id: '1', username: 'You', color: '#00f0ff' },
    { id: '2', username: 'Alex', color: '#39ff14' },
    { id: '3', username: 'Sam', color: '#ff9800' },
    { id: '4', username: 'Jordan', color: '#b051ff' },
];

// The actual impostor (randomly chosen from non-You players)
const IMPOSTOR_ID = MOCK_PLAYERS[Math.floor(Math.random() * 3) + 1].id;

interface VotingModalProps {
    isOpen: boolean;
    onClose: (result: 'CIVILIAN_WIN' | 'IMPOSTOR_WIN') => void;
    currentPlayer: string;
}

const VotingModal = ({ isOpen, onClose, currentPlayer }: VotingModalProps) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [phase, setPhase] = useState<'VOTING' | 'RESULT'>('VOTING');
    const [votedCorrectly, setVotedCorrectly] = useState(false);
    const [countdown, setCountdown] = useState(30);

    // 30-second voting countdown
    useState(() => {
        if (!isOpen) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-submit with no vote = impostor wins
                    if (phase === 'VOTING') {
                        setPhase('RESULT');
                        setVotedCorrectly(false);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    });

    const handleVote = () => {
        if (!selectedId) return;
        const correct = selectedId === IMPOSTOR_ID;
        setVotedCorrectly(correct);
        setPhase('RESULT');
    };

    const impostorName = MOCK_PLAYERS.find(p => p.id === IMPOSTOR_ID)?.username || 'Unknown';
    const votablePlayers = MOCK_PLAYERS.filter(p => p.username !== currentPlayer);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
            <div style={{
                background: '#0d0d1a', border: '2px solid rgba(255,49,49,0.4)', borderRadius: '24px',
                padding: '36px', width: '90%', maxWidth: '500px', position: 'relative',
            }}>
                {phase === 'VOTING' ? (
                    <>
                        {/* Voting Header */}
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <Vote size={40} color="#ff3131" style={{ marginBottom: '12px' }} />
                            <h2 style={{
                                fontSize: '2rem', fontWeight: 900, color: '#ff3131',
                                fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}>EMERGENCY MEETING</h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '8px' }}>
                                Time's up! Vote for who you think is the Impostor.
                            </p>
                            <div style={{
                                marginTop: '12px', display: 'inline-block', padding: '4px 14px', borderRadius: '8px',
                                background: 'rgba(255,49,49,0.1)', border: '1px solid rgba(255,49,49,0.3)',
                                color: '#ff3131', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem',
                            }}>
                                {countdown}s remaining
                            </div>
                        </div>

                        {/* Player Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                            {votablePlayers.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedId(p.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                                        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s ease',
                                        background: selectedId === p.id ? 'rgba(255,49,49,0.15)' : 'rgba(255,255,255,0.03)',
                                        border: `2px solid ${selectedId === p.id ? '#ff3131' : 'rgba(255,255,255,0.06)'}`,
                                        transform: selectedId === p.id ? 'scale(1.02)' : 'scale(1)',
                                        color: 'white', fontWeight: 700, fontSize: '0.95rem',
                                    }}
                                >
                                    <UserCircle size={28} color={p.color} />
                                    <span style={{ flex: 1, textAlign: 'left' }}>{p.username}</span>
                                    {selectedId === p.id && (
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '6px', fontSize: '0.65rem',
                                            background: 'rgba(255,49,49,0.2)', color: '#ff3131', fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '0.1em',
                                        }}>SUS</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Vote Button */}
                        <button
                            onClick={handleVote}
                            disabled={!selectedId}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                                background: selectedId ? '#ff3131' : 'rgba(255,255,255,0.05)',
                                color: selectedId ? 'white' : 'rgba(255,255,255,0.2)',
                                fontWeight: 800, fontSize: '1rem', cursor: selectedId ? 'pointer' : 'not-allowed',
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                boxShadow: selectedId ? '0 4px 24px rgba(255,49,49,0.3)' : 'none',
                            }}
                        >
                            CAST VOTE
                        </button>

                        <button
                            onClick={() => { setPhase('RESULT'); setVotedCorrectly(false); }}
                            style={{
                                width: '100%', marginTop: '8px', padding: '10px', borderRadius: '10px',
                                background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                            }}
                        >
                            Skip Vote
                        </button>
                    </>
                ) : (
                    /* Result Phase */
                    <div style={{ textAlign: 'center' }}>
                        {votedCorrectly ? (
                            <>
                                <Trophy size={56} color="#39ff14" style={{ marginBottom: '16px' }} />
                                <h2 style={{
                                    fontSize: '2.5rem', fontWeight: 900, color: '#39ff14',
                                    fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase',
                                    textShadow: '0 0 40px rgba(57,255,20,0.5)',
                                }}>CIVILIANS WIN!</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '12px', fontSize: '0.9rem' }}>
                                    You correctly identified <strong style={{ color: '#ff3131' }}>{impostorName}</strong> as the Impostor!
                                </p>
                            </>
                        ) : (
                            <>
                                <Skull size={56} color="#ff3131" style={{ marginBottom: '16px' }} />
                                <h2 style={{
                                    fontSize: '2.5rem', fontWeight: 900, color: '#ff3131',
                                    fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase',
                                    textShadow: '0 0 40px rgba(255,49,49,0.5)',
                                }}>IMPOSTOR WINS!</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '12px', fontSize: '0.9rem' }}>
                                    The Impostor was <strong style={{ color: '#ff3131' }}>{impostorName}</strong>!
                                </p>
                            </>
                        )}
                        <button
                            onClick={() => onClose(votedCorrectly ? 'CIVILIAN_WIN' : 'IMPOSTOR_WIN')}
                            style={{
                                marginTop: '28px', padding: '12px 32px', borderRadius: '10px', border: 'none',
                                background: votedCorrectly ? '#39ff14' : '#ff3131',
                                color: '#000', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                                textTransform: 'uppercase',
                            }}
                        >
                            Return to Menu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VotingModal;

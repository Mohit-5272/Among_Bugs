import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Trophy, Shield, Skull, Medal } from 'lucide-react';

const API_URL = 'http://localhost:3000';

interface Stats {
    username: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    civilianWins: number;
    impostorWins: number;
    highestLevel: string;
}

interface StatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StatsModal = ({ isOpen, onClose }: StatsModalProps) => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !user) return;
        setLoading(true);
        fetch(`${API_URL}/api/auth/stats/${user._id}`)
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [isOpen, user]);

    if (!isOpen) return null;

    const levelColor = (l: string) =>
        l === 'easy' ? '#39ff14' : l === 'hard' ? '#ff3131' : '#ff9800';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: '#12121f',
                border: '2px solid rgba(0,240,255,0.3)',
                borderRadius: '20px',
                padding: '32px',
                width: '90%',
                maxWidth: '420px',
                position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                    }}
                >
                    <X size={20} />
                </button>

                <h2 style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 900,
                    fontSize: '1.5rem',
                    color: '#00f0ff',
                    textAlign: 'center',
                    marginBottom: '24px',
                    textTransform: 'uppercase',
                }}>
                    <Trophy size={22} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Your Stats
                </h2>

                {loading ? (
                    <div style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '24px',
                    }}>
                        Loading...
                    </div>
                ) : stats ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        <StatCard
                            icon={<Shield size={20} color="#00f0ff" />}
                            label="Civilian Wins"
                            value={stats.civilianWins}
                            color="#00f0ff"
                        />
                        <StatCard
                            icon={<Skull size={20} color="#ff3131" />}
                            label="Impostor Wins"
                            value={stats.impostorWins}
                            color="#ff3131"
                        />
                        <StatCard
                            icon={<Medal size={20} color={levelColor(stats.highestLevel)} />}
                            label="Highest Level Solved"
                            value={stats.highestLevel.toUpperCase()}
                            color={levelColor(stats.highestLevel)}
                        />

                        <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: '12px',
                            marginTop: '4px',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.4)',
                            }}>
                                <span>Games Played: {stats.gamesPlayed}</span>
                                <span>Total Wins: {stats.wins}</span>
                                <span>Losses: {stats.losses}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '24px',
                    }}>
                        No stats found
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Stat Card Sub-Component ────────────────────────── */

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        background: `${color}08`,
        border: `1px solid ${color}25`,
        borderRadius: '12px',
    }}>
        {icon}
        <div style={{ flex: 1 }}>
            <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '1.3rem',
                fontWeight: 900,
                color,
                fontFamily: 'monospace',
            }}>
                {value}
            </div>
        </div>
    </div>
);

export default StatsModal;

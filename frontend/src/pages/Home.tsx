import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { BarChart2, LogOut, User, Calendar, Code2, X } from 'lucide-react';
import StatsModal from '../components/Game/StatsModal';

/* ── Profile Card (appears when clicking username) ─── */

const ProfileCard = ({
    user,
    onClose,
}: {
    user: { username: string; dob?: string; codeforcesId?: string; leetcodeId?: string; codechefId?: string };
    onClose: () => void;
}) => {
    const cardRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const formatDob = (dob?: string) => {
        if (!dob) return 'NOT FILLED';
        const d = new Date(dob);
        if (isNaN(d.getTime())) return 'NOT FILLED';
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const profileFields = [
        { label: 'Date of Birth', value: formatDob(user.dob), icon: <Calendar size={14} color="#00f0ff" /> },
        { label: 'Codeforces', value: user.codeforcesId || null, icon: <Code2 size={14} color="#ff9800" /> },
        { label: 'LeetCode', value: user.leetcodeId || null, icon: <Code2 size={14} color="#39ff14" /> },
        { label: 'CodeChef', value: user.codechefId || null, icon: <Code2 size={14} color="#b051ff" /> },
    ];

    return (
        <div
            ref={cardRef}
            style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                width: '280px',
                background: 'rgba(10,10,20,0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(0,240,255,0.2)',
                borderRadius: '14px',
                padding: '20px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease',
            }}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                }}
            >
                <X size={16} />
            </button>

            {/* Username header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00f0ff, #0080ff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '1rem',
                    color: '#000',
                }}>
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style={{
                        fontWeight: 800,
                        color: 'white',
                        fontSize: '0.95rem',
                    }}>
                        {user.username}
                    </div>
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}>
                        Player Profile
                    </div>
                </div>
            </div>

            {/* Fields */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}>
                {profileFields.map((field) => (
                    <div
                        key={field.label}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.04)',
                        }}
                    >
                        {field.icon}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.6rem',
                                color: 'rgba(255,255,255,0.3)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                {field.label}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                color: field.value && field.value !== 'NOT FILLED'
                                    ? 'rgba(255,255,255,0.85)'
                                    : 'rgba(255,255,255,0.25)',
                                fontStyle: !field.value || field.value === 'NOT FILLED'
                                    ? 'italic'
                                    : 'normal',
                            }}>
                                {field.value || '(NOT FILLED)'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ── Home Page ──────────────────────────────────────── */

const Home = () => {
    const navigate = useNavigate();
    const { setPlayerInfo } = useUser();
    const { user, logout } = useAuth();
    const [roomCode, setRoomCode] = useState('');
    const [showJoin, setShowJoin] = useState(false);
    const [joinMode, setJoinMode] = useState<'LOCAL' | 'ONLINE' | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const handleLocal = () => {
        if (user) setPlayerInfo(user.username);
        const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
        navigate(`/lobby/${newRoom}`);
    };

    const handleOnline = () => {
        setJoinMode('ONLINE');
        setShowJoin(true);
        setRoomCode('');
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomCode.trim()) return;
        if (user) setPlayerInfo(user.username);
        navigate(`/room/${roomCode.toUpperCase()}`);
    };

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="home-container">
            <div className="home-bg" />
            <div className="home-overlay" />

            <div className="home-content">
                {/* Sign out + username */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    zIndex: 10,
                }}>
                    {/* Clickable username */}
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: showProfile
                                ? 'rgba(0,240,255,0.1)'
                                : 'none',
                            border: showProfile
                                ? '1px solid rgba(0,240,255,0.2)'
                                : '1px solid transparent',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}
                    >
                        <User size={14} />
                        {user?.username}
                    </button>

                    {/* Profile card dropdown */}
                    {showProfile && user && (
                        <ProfileCard
                            user={user}
                            onClose={() => setShowProfile(false)}
                        />
                    )}

                    <button
                        onClick={handleSignOut}
                        style={{
                            padding: '6px 14px',
                            background: 'rgba(255,49,49,0.1)',
                            border: '1px solid rgba(255,49,49,0.3)',
                            borderRadius: '8px',
                            color: '#ff3131',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>

                <h1 className="title-among-us">AMONG BUGS</h1>

                {!showJoin ? (
                    <>
                        <div className="main-menu-grid">
                            <button className="btn-among-us" onClick={handleLocal}>
                                LOCAL
                            </button>
                            <button className="btn-among-us" onClick={handleOnline}>
                                ONLINE
                            </button>
                            <button
                                className="btn-among-us btn-among-us-sm"
                                onClick={() => navigate('/how-to-play')}
                            >
                                HOW TO PLAY
                            </button>
                            <button
                                className="btn-among-us btn-among-us-sm"
                                onClick={() => navigate('/mock-play')}
                            >
                                MOCK PLAY
                            </button>
                        </div>

                        <div className="icon-bar">
                            <button
                                className="btn-icon-among-us"
                                onClick={() => setShowStats(true)}
                            >
                                <BarChart2 size={28} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="lobby-card animate-slide-in">
                        <h2 className="lobby-title">{joinMode} — JOIN ROOM</h2>
                        <form onSubmit={handleJoinRoom} className="lobby-form">
                            <input
                                type="text"
                                placeholder="ROOM CODE"
                                className="lobby-input"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                autoFocus
                                style={{ letterSpacing: '0.3em', fontSize: '1.8rem' }}
                            />
                            <div className="lobby-buttons">
                                <button
                                    type="button"
                                    className="btn-among-us btn-among-us-sm lobby-back-btn"
                                    onClick={() => setShowJoin(false)}
                                >
                                    BACK
                                </button>
                                <button
                                    type="submit"
                                    className="btn-among-us btn-among-us-sm lobby-enter-btn"
                                    disabled={!roomCode.trim()}
                                >
                                    JOIN
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />

            {/* Fade-in animation for profile card */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Home;

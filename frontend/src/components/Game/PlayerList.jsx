import { Users } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const PlayerList = () => {
    const { player } = useUser();

    // Mock players for now
    const players = player
        ? [
            player,
            { playerId: '2', username: 'Alex', role: 'CIVILIAN', cursorColor: '#00f0ff', isReady: true },
            { playerId: '3', username: 'Sam', role: 'CIVILIAN', cursorColor: '#ff9800', isReady: true },
            { playerId: '4', username: 'Jordan', role: 'CIVILIAN', cursorColor: '#b051ff', isReady: true },
        ]
        : [];

    return (
        <div style={{ padding: '16px' }}>
            <h3 style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
            }}>
                <Users size={16} />
                CONNECTED PLAYERS ({players.length}/4)
            </h3>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}>
                {players.map((p) => (
                    <div
                        key={p.playerId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: p.cursorColor,
                            boxShadow: `0 0 8px ${p.cursorColor}`,
                            animation: 'pulse 2s infinite',
                        }} />
                        <span style={{
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: '0.82rem',
                            flex: 1,
                        }}>
                            {p.username}
                            {p.playerId === player?.playerId && (
                                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>(You)</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerList;

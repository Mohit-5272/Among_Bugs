import { useState, useEffect } from 'react';
import { Eye, Wifi } from 'lucide-react';

interface CursorInfo {
    username: string;
    color: string;
    line: number;
    col: number;
    isTyping: boolean;
}

const MOCK_CURSORS: CursorInfo[] = [
    { username: 'Alex', color: '#00f0ff', line: 5, col: 12, isTyping: true },
    { username: 'Sam', color: '#ff9800', line: 12, col: 8, isTyping: false },
    { username: 'Jordan', color: '#b051ff', line: 8, col: 22, isTyping: true },
];

const SpectatePanel = () => {
    const [cursors, setCursors] = useState<CursorInfo[]>(MOCK_CURSORS);

    // Simulate cursor movement (in production → Yjs awareness)
    useEffect(() => {
        const interval = setInterval(() => {
            setCursors(prev =>
                prev.map(c => ({
                    ...c,
                    line: Math.max(1, c.line + Math.floor(Math.random() * 3) - 1),
                    col: Math.max(1, c.col + Math.floor(Math.random() * 5) - 2),
                    isTyping: Math.random() > 0.3,
                }))
            );
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            left: '24px',
            bottom: '24px',
            zIndex: 50,
            width: '240px',
        }}>
            <div style={{
                background: 'rgba(10,10,15,0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,49,49,0.2)',
                borderRadius: '14px',
                padding: '14px',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255,49,49,0.15)',
                }}>
                    <Eye size={16} color="#ff3131" />
                    <span style={{
                        color: '#ff3131',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}>
                        Spectate
                    </span>
                    <Wifi
                        size={12}
                        color="#39ff14"
                        style={{ marginLeft: 'auto' }}
                    />
                </div>

                {/* Cursor List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}>
                    {cursors.map(c => (
                        <div
                            key={c.username}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}
                        >
                            {/* Color dot */}
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: c.color,
                                boxShadow: c.isTyping
                                    ? `0 0 8px ${c.color}`
                                    : 'none',
                                transition: 'box-shadow 0.3s ease',
                            }} />

                            {/* Name */}
                            <span style={{
                                flex: 1,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.7)',
                            }}>
                                {c.username}
                            </span>

                            {/* Position */}
                            <span style={{
                                fontFamily: 'monospace',
                                fontSize: '0.65rem',
                                color: 'rgba(255,255,255,0.3)',
                            }}>
                                Ln {c.line}, Col {c.col}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SpectatePanel;

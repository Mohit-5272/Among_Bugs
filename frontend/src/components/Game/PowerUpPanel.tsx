import { useState } from 'react';
import { Undo2, Snowflake, Zap } from 'lucide-react';

interface PowerUpPanelProps {
    onUndoSabotage: () => void;
    onFreezeImpostor: () => void;
    lastSabotageCode: string | null;
}

const PowerUpPanel = ({
    onUndoSabotage,
    onFreezeImpostor,
    lastSabotageCode,
}: PowerUpPanelProps) => {
    const [undoUsed, setUndoUsed] = useState(false);
    const [freezeUsed, setFreezeUsed] = useState(false);
    const [freezeActive, setFreezeActive] = useState(false);

    const handleUndo = () => {
        if (undoUsed || !lastSabotageCode) return;
        onUndoSabotage();
        setUndoUsed(true);
    };

    const handleFreeze = () => {
        if (freezeUsed) return;
        onFreezeImpostor();
        setFreezeUsed(true);
        setFreezeActive(true);
        setTimeout(() => setFreezeActive(false), 20000);
    };

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
                border: '1px solid rgba(0,240,255,0.2)',
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
                    borderBottom: '1px solid rgba(0,240,255,0.15)',
                }}>
                    <Zap size={16} color="#00f0ff" />
                    <span style={{
                        color: '#00f0ff',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}>
                        Power-Ups
                    </span>
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.25)',
                    }}>
                        {2 - (undoUsed ? 1 : 0) - (freezeUsed ? 1 : 0)} remaining
                    </span>
                </div>

                {/* Power-up Buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}>
                    {/* Undo Sabotage */}
                    <button
                        onClick={handleUndo}
                        disabled={undoUsed || !lastSabotageCode}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: undoUsed || !lastSabotageCode ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            background: undoUsed
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(0,240,255,0.06)',
                            border: `1px solid ${undoUsed
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,240,255,0.2)'
                                }`,
                            color: undoUsed
                                ? 'rgba(255,255,255,0.2)'
                                : 'white',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textAlign: 'left',
                        }}
                    >
                        <Undo2
                            size={16}
                            color={undoUsed ? '#333' : '#00f0ff'}
                        />
                        <div>
                            <div>Undo Sabotage</div>
                            <div style={{
                                fontSize: '0.62rem',
                                color: 'rgba(255,255,255,0.3)',
                                marginTop: '2px',
                            }}>
                                {undoUsed
                                    ? 'Already used'
                                    : lastSabotageCode
                                        ? 'Revert last sabotage'
                                        : 'No sabotage to undo'}
                            </div>
                        </div>
                    </button>

                    {/* Freeze Impostor */}
                    <button
                        onClick={handleFreeze}
                        disabled={freezeUsed}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            cursor: freezeUsed ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            background: freezeActive
                                ? 'rgba(135,206,250,0.1)'
                                : freezeUsed
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(135,206,250,0.06)',
                            border: `1px solid ${freezeActive
                                    ? 'rgba(135,206,250,0.4)'
                                    : freezeUsed
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(135,206,250,0.2)'
                                }`,
                            color: freezeUsed
                                ? 'rgba(255,255,255,0.2)'
                                : 'white',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            animation: freezeActive ? 'pulse 1.5s infinite' : 'none',
                        }}
                    >
                        <Snowflake
                            size={16}
                            color={freezeUsed ? '#333' : '#87CEFA'}
                        />
                        <div>
                            <div>
                                Freeze Impostor
                                {freezeActive && (
                                    <span style={{
                                        marginLeft: '6px',
                                        fontSize: '0.6rem',
                                        color: '#87CEFA',
                                    }}>
                                        ❄️ ACTIVE
                                    </span>
                                )}
                            </div>
                            <div style={{
                                fontSize: '0.62rem',
                                color: 'rgba(255,255,255,0.3)',
                                marginTop: '2px',
                            }}>
                                {freezeUsed
                                    ? 'Already used'
                                    : 'Disable sabotage for 20s'}
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PowerUpPanel;

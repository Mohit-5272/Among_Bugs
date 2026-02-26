import { Activity, GitCommit } from 'lucide-react';

const mockHistory = [
    { id: 1, time: '2 mins ago', action: 'Changed 1 line near ln 14' },
    { id: 2, time: '1 min ago', action: 'Deleted 1 chars near ln 8' },
];

const HistoryPanel = () => {
    return (
        <div style={{
            padding: '16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column' as const,
        }}>
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
                <Activity size={16} />
                VERSION HISTORY
            </h3>

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                gap: '12px',
                overflowY: 'auto' as const,
            }}>
                {mockHistory.length === 0 ? (
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.3)',
                        fontStyle: 'italic',
                    }}>
                        No changes detected yet...
                    </p>
                ) : (
                    mockHistory.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                display: 'flex',
                                gap: '10px',
                                fontSize: '0.8rem',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column' as const,
                                alignItems: 'center',
                                marginTop: '4px',
                            }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#00f0ff',
                                }} />
                                <div style={{
                                    width: '1px',
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.06)',
                                    margin: '4px 0',
                                }} />
                            </div>

                            <div style={{
                                flex: 1,
                                paddingBottom: '12px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <div style={{
                                    color: '#00f0ff',
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <GitCommit size={12} />
                                    {item.time}
                                </div>
                                <div style={{
                                    color: 'rgba(255,255,255,0.85)',
                                }}>
                                    {item.action}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;

import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { Send, MessageCircle } from 'lucide-react';

// Mock messages to seed the chat
const MOCK_MESSAGES = [
    { id: 1, sender: 'Player_2', text: 'I think line 5 has a bug', timestamp: Date.now() - 60000, color: '#00f0ff' },
    { id: 2, sender: 'Player_3', text: 'Yeah the operator looks wrong', timestamp: Date.now() - 45000, color: '#39ff14' },
    { id: 3, sender: 'Player_4', text: 'Also check the semicolons', timestamp: Date.now() - 30000, color: '#ff9800' },
];

const ChatPanel = () => {
    const { player } = useUser();
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMsg = {
            id: Date.now(),
            sender: player?.username || 'You',
            text: input.trim(),
            timestamp: Date.now(),
            color: player?.cursorColor || '#ffffff',
        };

        setMessages((prev) => [...prev, newMsg]);
        setInput('');
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            width: '280px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10, 10, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            margin: '16px 16px 16px 0',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <MessageCircle size={16} color="#00f0ff" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Team Chat
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                    Civilians Only
                </span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}
            >
                {messages.map((msg) => {
                    const isMe = msg.sender === (player?.username || 'You');
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: msg.color }}>
                                    {isMe ? 'You' : msg.sender}
                                </span>
                                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                            <div style={{
                                padding: '8px 12px',
                                borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                background: isMe ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isMe ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                                maxWidth: '220px',
                                wordBreak: 'break-word',
                            }}>
                                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                    {msg.text}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{
                padding: '12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                gap: '8px',
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={200}
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'white',
                        fontSize: '0.82rem',
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    style={{
                        background: input.trim() ? '#00f0ff' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: input.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <Send size={16} color={input.trim() ? '#000' : '#555'} />
                </button>
            </form>
        </div>
    );
};

export default ChatPanel;

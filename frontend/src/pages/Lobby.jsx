import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Copy, Check, Users, Send, Settings, Play, Loader2, Sparkles } from 'lucide-react';import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";















const Lobby = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { player, setPlayerInfo } = useUser();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  // Host settings
  const [matchTime, setMatchTime] = useState(5); // minutes
  const [cooldownTime, setCooldownTime] = useState(15); // seconds
  const [copied, setCopied] = useState(false);

  // Mock players including host
  const [players, setPlayers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
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
      socket.emit('create_room', { username: name, roomId }, (response) => {
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
    { id: '3', username: 'Sam', isHost: false, isReady: false }]
    );

    setChatMessages([
    { id: 1, sender: 'Alex', text: 'Hey! Ready when you are 🎮', timestamp: Date.now() - 30000 },
    { id: 2, sender: 'Sam', text: 'This is going to be fun', timestamp: Date.now() - 15000 }]
    );
  }, [socket, isConnected, roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/lobby/${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, {
      id: Date.now(),
      sender: user?.username || player?.username || 'You',
      text: chatInput.trim(),
      timestamp: Date.now()
    }]);
    setChatInput('');
  };

  // Listen for the backend telling us the game actually started (this handles Gemini loading time)
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
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

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (/*#__PURE__*/
    _jsxs("div", { style: {
        height: '100vh', width: '100vw', display: 'flex', background: '#0a0a0f', overflow: 'hidden'
      }, children: [/*#__PURE__*/

      _jsxs("div", { style: {
          flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '600px',
          margin: '0 auto'
        }, children: [/*#__PURE__*/

        _jsx("div", { style: {
            background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '24px',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px'
          }, children: /*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }, children: [/*#__PURE__*/
            _jsxs("div", { children: [/*#__PURE__*/
              _jsx("div", { style: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: '4px' }, children: "Room Code" }

              ), /*#__PURE__*/
              _jsx("div", { style: {
                  fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: 900, color: '#00f0ff',
                  letterSpacing: '0.2em'
                }, children:
                roomId }
              )] }
            ), /*#__PURE__*/
            _jsx("button", { onClick: handleCopyLink, style: {
                padding: '10px 20px', background: copied ? 'rgba(57,255,20,0.15)' : 'rgba(0,240,255,0.12)',
                border: `1px solid ${copied ? '#39ff14' : 'rgba(0,240,255,0.3)'}`, borderRadius: '10px',
                color: copied ? '#39ff14' : '#00f0ff', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '6px'
              }, children:
              copied ? /*#__PURE__*/_jsxs(_Fragment, { children: [/*#__PURE__*/_jsx(Check, { size: 14 }), " Copied!"] }) : /*#__PURE__*/_jsxs(_Fragment, { children: [/*#__PURE__*/_jsx(Copy, { size: 14 }), " Copy Invite Link"] }) }
            )] }
          ) }
        ), /*#__PURE__*/


        _jsxs("div", { style: {
            background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '20px',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px'
          }, children: [/*#__PURE__*/
          _jsxs("h3", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '14px' }, children: [/*#__PURE__*/
            _jsx(Users, { size: 16 }), " Connected Players (", players.length, "/4)"] }
          ), /*#__PURE__*/
          _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children:
            players.map((p) => /*#__PURE__*/
            _jsxs("div", { style: {
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                borderRadius: '10px', background: p.isHost ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${p.isHost ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.04)'}`
              }, children: [/*#__PURE__*/
              _jsx("div", { style: {
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: p.isReady ? '#39ff14' : '#ff9800'
                } }), /*#__PURE__*/
              _jsx("span", { style: { fontWeight: 700, fontSize: '0.85rem', color: 'white', flex: 1 }, children:
                p.username }
              ),
              p.isHost && /*#__PURE__*/
              _jsx("span", { style: { fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,240,255,0.15)', color: '#00f0ff', fontWeight: 700 }, children: "HOST" }), /*#__PURE__*/

              _jsx("span", { style: { fontSize: '0.7rem', color: p.isReady ? '#39ff14' : '#ff9800', fontWeight: 600 }, children:
                p.isReady ? 'Ready' : 'Not Ready' }
              )] }, p.id
            )
            ) }
          )] }
        ),


        isHost && /*#__PURE__*/
        _jsxs("div", { style: {
            background: 'rgba(10,10,20,0.85)', borderRadius: '16px', padding: '20px',
            border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px'
          }, children: [/*#__PURE__*/
          _jsxs("h3", { style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9800', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '14px' }, children: [/*#__PURE__*/
            _jsx(Settings, { size: 16 }), " Host Settings"] }
          ), /*#__PURE__*/

          _jsxs("div", { style: { marginBottom: '16px' }, children: [/*#__PURE__*/
            _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }, children: [/*#__PURE__*/
              _jsx("label", { style: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }, children: "Match Time" }), /*#__PURE__*/
              _jsxs("span", { style: { fontSize: '0.78rem', color: '#00f0ff', fontWeight: 700, fontFamily: 'monospace' }, children: [matchTime, " min"] })] }
            ), /*#__PURE__*/
            _jsx("input", { type: "range", min: 5, max: 15, value: matchTime, onChange: (e) => setMatchTime(Number(e.target.value)),
              style: { width: '100%', accentColor: '#00f0ff' } })] }
          ), /*#__PURE__*/

          _jsxs("div", { children: [/*#__PURE__*/
            _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }, children: [/*#__PURE__*/
              _jsx("label", { style: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }, children: "Impostor Cooldown" }), /*#__PURE__*/
              _jsxs("span", { style: { fontSize: '0.78rem', color: '#ff9800', fontWeight: 700, fontFamily: 'monospace' }, children: [cooldownTime, "s"] })] }
            ), /*#__PURE__*/
            _jsx("input", { type: "range", min: 10, max: 60, value: cooldownTime, onChange: (e) => setCooldownTime(Number(e.target.value)),
              style: { width: '100%', accentColor: '#ff9800' } })] }
          )] }
        ),



        generatingChallenge && /*#__PURE__*/
        _jsxs("div", { style: {
            padding: '16px', borderRadius: '12px', marginBottom: '16px',
            background: 'rgba(0,240,255,0.08)', border: '2px solid rgba(0,240,255,0.3)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            animation: 'pulse 2s ease-in-out infinite'
          }, children: [/*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [/*#__PURE__*/
            _jsx(Loader2, { size: 24, color: "#00f0ff", style: { animation: 'spin 1s linear infinite' } }), /*#__PURE__*/
            _jsx(Sparkles, { size: 20, color: "#00f0ff", style: { animation: 'pulse 1.5s ease-in-out infinite' } })] }
          ), /*#__PURE__*/
          _jsxs("div", { style: { textAlign: 'center' }, children: [/*#__PURE__*/
            _jsx("div", { style: { color: '#00f0ff', fontWeight: 800, fontSize: '0.95rem', marginBottom: '4px' }, children: "\uD83E\uDD16 GEMINI AI IS GENERATING YOUR CHALLENGE" }

            ), /*#__PURE__*/
            _jsx("div", { style: { color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }, children: "Creating a unique DSA problem with intentional bugs..." }

            )] }
          )] }
        ),



        !isConnected && !generatingChallenge && /*#__PURE__*/
        _jsxs("div", { style: {
            padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
            background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }, children: [/*#__PURE__*/
          _jsx("div", { style: {
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#ff9800', animation: 'pulse 1.5s ease-in-out infinite'
            } }), /*#__PURE__*/
          _jsx("span", { style: { color: '#ff9800', fontSize: '0.8rem', fontWeight: 600 }, children: "Connecting to server..." }

          )] }
        ), /*#__PURE__*/



        _jsx("button", { onClick: handleStartGame, disabled: !canStart || isStarting,
          style: {
            padding: '14px', background: canStart && !isStarting ? '#00f0ff' : 'rgba(255,255,255,0.05)',
            border: 'none', borderRadius: '12px', color: canStart && !isStarting ? '#000' : 'rgba(255,255,255,0.2)',
            fontWeight: 800, fontSize: '1rem', cursor: canStart && !isStarting ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: isStarting ? 0.7 : 1
          }, children:
          isStarting ? /*#__PURE__*/
          _jsxs(_Fragment, { children: [/*#__PURE__*/_jsx(Loader2, { size: 18, style: { animation: 'spin 1s linear infinite' } }), " Starting Game..."] }) :
          !isConnected ? /*#__PURE__*/
          _jsx(_Fragment, { children: "Waiting for connection..." }) : /*#__PURE__*/

          _jsxs(_Fragment, { children: [/*#__PURE__*/_jsx(Play, { size: 18, fill: "currentColor" }),
            canStart ? 'Start Game' : `Need ${2 - players.length > 0 ? 2 - players.length : 0} more player(s)`] }) }

        ), /*#__PURE__*/

        _jsx("style", { children: `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                ` })] }
      ), /*#__PURE__*/


      _jsxs("div", { style: {
          width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'rgba(10,10,20,0.85)', borderLeft: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', margin: '12px 12px 12px 0', overflow: 'hidden'
        }, children: [/*#__PURE__*/
        _jsx("div", { style: {
            padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontWeight: 800, fontSize: '0.85rem', color: '#00f0ff', textTransform: 'uppercase', letterSpacing: '0.1em'
          }, children: "\uD83D\uDCAC Lobby Chat" }

        ), /*#__PURE__*/

        _jsxs("div", { style: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }, children: [
          chatMessages.map((msg) => {
            const isMe = msg.sender === (user?.username || player?.username);
            return (/*#__PURE__*/
              _jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }, children: [/*#__PURE__*/
                _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }, children: [/*#__PURE__*/
                  _jsx("span", { style: { fontSize: '0.7rem', fontWeight: 700, color: isMe ? '#00f0ff' : '#ff9800' }, children: isMe ? 'You' : msg.sender }), /*#__PURE__*/
                  _jsx("span", { style: { fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }, children: formatTime(msg.timestamp) })] }
                ), /*#__PURE__*/
                _jsx("div", { style: {
                    padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: isMe ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isMe ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                    maxWidth: '240px', wordBreak: 'break-word'
                  }, children: /*#__PURE__*/
                  _jsx("span", { style: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }, children: msg.text }) }
                )] }, msg.id
              ));

          }), /*#__PURE__*/
          _jsx("div", { ref: chatEndRef })] }
        ), /*#__PURE__*/

        _jsxs("form", { onSubmit: handleSendChat, style: {
            padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px'
          }, children: [/*#__PURE__*/
          _jsx("input", { value: chatInput, onChange: (e) => setChatInput(e.target.value), placeholder: "Type a message...",
            maxLength: 200, style: {
              flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit'
            } }), /*#__PURE__*/
          _jsx("button", { type: "submit", disabled: !chatInput.trim(), style: {
              background: chatInput.trim() ? '#00f0ff' : 'rgba(255,255,255,0.05)', border: 'none',
              borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: chatInput.trim() ? 'pointer' : 'not-allowed'
            }, children: /*#__PURE__*/
            _jsx(Send, { size: 16, color: chatInput.trim() ? '#000' : '#555' }) }
          )] }
        )] }
      )] }
    ));

};

export default Lobby;
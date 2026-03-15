import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import CodeEditor from '../components/Editor/CodeEditor';
import PlayerList from '../components/Game/PlayerList';
import SabotagePanel from '../components/Game/SabotagePanel';
import HistoryPanel from '../components/Game/HistoryPanel';
import ChatPanel from '../components/Game/ChatPanel';
import VotingModal from '../components/Game/VotingModal';
import SpectatePanel from '../components/Game/SpectatePanel';
import PowerUpPanel from '../components/Game/PowerUpPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, AlertTriangle, X, Trophy, XCircle, CheckCircle, RotateCcw, Home, LogOut } from 'lucide-react';
import {
  playSabotageSound, playCountdownBeep, playVictorySound,
  playDefeatSound, playFreezeSound, playUndoSound } from
'../utils/sounds';import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const API_URL = 'http://localhost:3000';


















const GameRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { player, mockAssignRole } = useUser();
  const { colors } = useTheme();
  const { socket, isConnected } = useSocket();

  // Read initial data from Lobby navigation if available, or from sessionStorage
  const initialGameData = location.state?.initialGameData || (
  roomId ? JSON.parse(sessionStorage.getItem(`challenge_${roomId}`) || 'null') : null);

  const isMockMode = roomId ? JSON.parse(sessionStorage.getItem(`mockMode_${roomId}`) || 'false') : false;

  const [timeLeft, setTimeLeft] = useState(initialGameData ? Math.floor(initialGameData.timerDuration / 1000) : 300);
  const [challengeData, setChallengeData] = useState(initialGameData ? initialGameData.challenge : null);
  const [loadingChallenge, setLoadingChallenge] = useState(!initialGameData);

  // Clear sessionStorage after reading
  useEffect(() => {
    if (roomId && initialGameData) {
      sessionStorage.removeItem(`challenge_${roomId}`);
    }
  }, [roomId, initialGameData]);

  const editorRef = useRef(null);
  const [runResult, setRunResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Voting system
  const [showVoting, setShowVoting] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  // Power-up system
  const [lastSabotageCode, setLastSabotageCode] = useState(null);
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

    socket.on('room_update', (roomState) => {
      console.log('[GameRoom] Room update received:', roomState);
      setTimeLeft(Math.floor(roomState.timeLeftMs / 1000));
      // If joining late, sync the challenge from the room state
      if (roomState.challengeData && !challengeData) {
        console.log('[GameRoom] Setting challenge from room state');
        setChallengeData(roomState.challengeData);
        setLoadingChallenge(false);
      }
    });

    socket.on('game_started', (data) => {
      console.log('[GameRoom] Game started event received:', data);
      setChallengeData(data.challenge);
      setTimeLeft(Math.floor(data.timerDuration / 1000));
      setLoadingChallenge(false);
    });

    socket.on('game_over', (data) => {
      setGameEnded(true);
      setShowVoting(true); // Simplified for MVP
      data.winner === 'CIVILIAN_WIN' ? playVictorySound() : playDefeatSound();
    });

    socket.on('error', ({ message }) => {
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
  const setCodeWithHistory = useCallback((code) => {
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

  const handleVotingResult = (result) => {
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
        })
      });
      const data = await res.json();
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
        results: [{ testCase: 1, passed: false, status: 'Error', isHidden: false, input: '', expected: '', got: 'Could not connect to server' }]
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
    return (/*#__PURE__*/
      _jsxs("div", { style: {
          height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', gap: '20px'
        }, children: [/*#__PURE__*/
        _jsx("div", { style: {
            width: '48px', height: '48px', border: '4px solid rgba(0,240,255,0.2)',
            borderTop: '4px solid #00f0ff', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          } }), /*#__PURE__*/
        _jsx("h2", { style: { color: '#00f0ff', fontWeight: 800, fontSize: '1.3rem', fontFamily: "'Nunito', sans-serif" }, children: "LOADING CHALLENGE..." }

        ), /*#__PURE__*/
        _jsx("p", { style: { color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }, children:
          loadingChallenge ? 'Question is loading...' : 'Waiting for game to start...' }
        ), /*#__PURE__*/
        _jsx("style", { children: `
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ` })] }
      ));

  }

  const isImpostor = player.role === 'IMPOSTOR';

  return (/*#__PURE__*/
    _jsxs("div", { style: {
        display: 'flex', height: '100vh', width: '100vw',
        overflow: 'hidden', background: '#0a0a0f'
      }, children: [/*#__PURE__*/

      _jsx("div", { style: {
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: colors.bgGradient,
          transition: 'background 0.8s ease'
        } }), /*#__PURE__*/


      _jsxs("div", { style: {
          width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: colors.surface, backdropFilter: 'blur(12px)',
          borderRight: `1px solid ${colors.accentBorder}`,
          borderRadius: '12px', margin: '12px', overflow: 'hidden', zIndex: 1,
          transition: 'all 0.5s ease'
        }, children: [/*#__PURE__*/
        _jsx("div", { style: { padding: '14px 16px', borderBottom: `1px solid ${colors.accentBorder}` }, children: /*#__PURE__*/
          _jsxs("h2", { style: { fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }, children: [/*#__PURE__*/
            _jsx("span", { style: { color: 'rgba(255,255,255,0.4)' }, children: "ROOM:" }), /*#__PURE__*/
            _jsx("span", { style: { fontFamily: 'monospace', color: colors.accent, letterSpacing: '0.15em', transition: 'color 0.5s ease' }, children: roomId })] }
          ) }
        ), /*#__PURE__*/
        _jsxs("div", { style: { flex: 1, overflowY: 'auto' }, children: [/*#__PURE__*/
          _jsx(PlayerList, {}), /*#__PURE__*/
          _jsx("div", { style: { height: '1px', background: colors.accentBorder, margin: '4px 0' } }), /*#__PURE__*/
          _jsx(HistoryPanel, {})] }
        )] }
      ), /*#__PURE__*/


      _jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 0', minWidth: 0, overflow: 'hidden', zIndex: 1 }, children: [/*#__PURE__*/

        _jsxs("div", { style: {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px', background: colors.surface, backdropFilter: 'blur(12px)',
            borderRadius: '12px', marginBottom: '12px', border: `1px solid ${colors.accentBorder}`,
            flexShrink: 0, transition: 'all 0.5s ease'
          }, children: [/*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '16px' }, children: [/*#__PURE__*/
            _jsxs("div", { style: {
                display: 'flex', alignItems: 'center', gap: '8px',
                color: timeLeft <= 30 ? '#ff3131' : colors.timerColor,
                fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700,
                background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px',
                border: `1px solid ${timeLeft <= 30 ? 'rgba(255,49,49,0.5)' : 'rgba(255,152,0,0.3)'}`,
                animation: timeLeft <= 10 ? 'pulse 0.5s infinite' : 'none'
              }, children: [/*#__PURE__*/
              _jsx(Timer, { size: 18 }),
              Math.floor(timeLeft / 60), ":", (timeLeft % 60).toString().padStart(2, '0')] }
            ),
            isImpostor && /*#__PURE__*/
            _jsxs("span", { style: { color: '#ff3131', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }, children: [/*#__PURE__*/
              _jsx(AlertTriangle, { size: 16 }), " YOU ARE THE IMPOSTOR",
              impostorFrozen && /*#__PURE__*/
              _jsx("span", { style: {
                  fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(135,206,250,0.15)', color: '#87CEFA', fontWeight: 700,
                  animation: 'pulse 1s infinite'
                }, children: "\u2744\uFE0F FROZEN" })] }

            ),

            !isImpostor && player.role === 'CIVILIAN' && /*#__PURE__*/
            _jsx("span", { style: { color: '#00f0ff', fontWeight: 700 }, children: "CIVILIAN (Fix the code!)" })] }

          ), /*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: [

            isMockMode && /*#__PURE__*/
            _jsxs("div", { style: { display: 'flex', gap: '6px', marginRight: '12px', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.1)' }, children: [/*#__PURE__*/
              _jsx("button", { onClick: () => mockAssignRole('CIVILIAN'), style: {
                  padding: '4px 10px', fontSize: '0.7rem', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600
                }, children: "Mock Civ" }), /*#__PURE__*/
              _jsx("button", { onClick: () => mockAssignRole('IMPOSTOR'), style: {
                  padding: '4px 10px', fontSize: '0.7rem', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                  color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 600
                }, children: "Mock Imp" })] }
            ), /*#__PURE__*/
            _jsxs("button", { onClick: () => {
                if (isImpostor && socket) {
                  socket.emit('player_exit', { roomId });
                }
                navigate('/');
              }, style: {
                padding: '8px 14px', background: 'rgba(255,49,49,0.1)',
                border: '1px solid rgba(255,49,49,0.3)', borderRadius: '8px',
                color: '#ff3131', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem'
              }, children: [/*#__PURE__*/
              _jsx(LogOut, { size: 14 }), " Exit"] }
            ), /*#__PURE__*/
            _jsxs("button", { onClick: handleRunTests, disabled: submitting, style: {
                padding: '8px 18px', background: submitting ? '#555' : colors.accent,
                border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700,
                cursor: submitting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                transition: 'background 0.3s ease'
              }, children: [/*#__PURE__*/
              _jsx(Play, { size: 16, fill: "currentColor" }), " ", submitting ? 'Running...' : 'Run Tests'] }
            )] }
          )] }
        ),


        challengeData && /*#__PURE__*/
        _jsxs("div", { style: {
            padding: '14px 20px', background: colors.surface, backdropFilter: 'blur(12px)',
            borderRadius: '12px', marginBottom: '12px', border: `1px solid ${colors.accentBorder}`,
            flexShrink: 0, transition: 'all 0.5s ease'
          }, children: [/*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }, children: [/*#__PURE__*/
            _jsx("span", { style: {
                fontWeight: 800, color: '#00f0ff', fontSize: '0.95rem',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                fontFamily: "'Nunito', sans-serif"
              }, children:
              challengeData.title }
            ), /*#__PURE__*/
            _jsx("span", { style: {
                fontSize: '0.65rem', padding: '3px 10px', borderRadius: '6px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                background: challengeData.difficulty === 'easy' ? 'rgba(57,255,20,0.15)' : challengeData.difficulty === 'hard' ? 'rgba(255,49,49,0.15)' : 'rgba(255,152,0,0.15)',
                color: challengeData.difficulty === 'easy' ? '#39ff14' : challengeData.difficulty === 'hard' ? '#ff3131' : '#ff9800'
              }, children:
              challengeData.difficulty }
            ), /*#__PURE__*/
            _jsxs("span", { style: { color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginLeft: 'auto' }, children: [
              challengeData.testCases.filter((tc) => !tc.isHidden).length, " visible / ", challengeData.testCases.filter((tc) => tc.isHidden).length, " hidden tests"] }
            )] }
          ), /*#__PURE__*/
          _jsx("p", { style: {
              color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', lineHeight: 1.65,
              margin: 0, whiteSpace: 'pre-line', fontFamily: "'Inter', sans-serif"
            }, children:
            challengeData.description }
          )] }
        ), /*#__PURE__*/



        _jsx("div", { style: {
            flex: 1, background: colors.surface, backdropFilter: 'blur(12px)',
            borderRadius: '12px', border: `1px solid ${colors.accentBorder}`,
            overflow: 'hidden', position: 'relative', minHeight: 0,
            transition: 'all 0.5s ease'
          }, children: /*#__PURE__*/
          _jsx(CodeEditor, { ref: editorRef, roomId: roomId, initialChallenge: challengeData }) }
        )] }
      ), /*#__PURE__*/


      _jsx(ChatPanel, {}),


      isImpostor && !impostorFrozen && /*#__PURE__*/
      _jsx(SabotagePanel, { getCode: getCode, setCode: setCodeWithHistory }),

      isImpostor && /*#__PURE__*/_jsx(SpectatePanel, {}),


      player.role === 'CIVILIAN' && /*#__PURE__*/
      _jsx(PowerUpPanel, {
        onUndoSabotage: handleUndoSabotage,
        onFreezeImpostor: handleFreezeImpostor,
        lastSabotageCode: lastSabotageCode }
      ), /*#__PURE__*/



      _jsx(VotingModal, { isOpen: showVoting, onClose: handleVotingResult, currentPlayer: player.username }), /*#__PURE__*/


      _jsx(AnimatePresence, { children:
        showResult && runResult && /*#__PURE__*/
        _jsx(motion.div, {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          style: {
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000
          }, children: /*#__PURE__*/

          _jsxs(motion.div, {
            initial: { scale: 0.85, opacity: 0, y: 30 },
            animate: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } },
            exit: { scale: 0.9, opacity: 0, y: 20 },
            style: {
              background: '#12121f', border: `2px solid ${runResult.passed ? '#39ff14' : '#ff3131'}`,
              borderRadius: '20px', padding: '32px', width: '90%', maxWidth: '520px',
              maxHeight: '80vh', overflow: 'auto', position: 'relative'
            }, children: [/*#__PURE__*/

            _jsx("button", { onClick: () => setShowResult(false), style: {
                position: 'absolute', top: '12px', right: '12px', background: 'none',
                border: 'none', color: 'white', cursor: 'pointer'
              }, children: /*#__PURE__*/_jsx(X, { size: 20 }) }),

            runResult.passed ? /*#__PURE__*/
            _jsxs(motion.div, { initial: { scale: 0 }, animate: { scale: 1, transition: { delay: 0.1, type: 'spring' } }, style: { textAlign: 'center', marginBottom: '24px' }, children: [/*#__PURE__*/
              _jsx(Trophy, { size: 48, color: "#39ff14", style: { marginBottom: '12px' } }), /*#__PURE__*/
              _jsx("h2", { style: { fontSize: '2.5rem', fontWeight: 900, color: '#39ff14', fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase', textShadow: '0 0 30px rgba(57,255,20,0.5)' }, children: "YOU WON!" }), /*#__PURE__*/
              _jsxs("p", { style: { color: 'rgba(255,255,255,0.6)', marginTop: '8px' }, children: ["All ", runResult.totalTests, " test cases passed! \uD83C\uDF89"] }), /*#__PURE__*/
              _jsxs("div", { style: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }, children: [/*#__PURE__*/
                _jsxs("button", { onClick: () => {
                    sessionStorage.removeItem(`among-bugs-challenge-${roomId}`);
                    setShowResult(false);
                    setGameEnded(false);
                    setTimeLeft(300);
                    setRunResult(null);
                  }, style: {
                    padding: '10px 20px', borderRadius: '10px', border: 'none',
                    background: '#39ff14', color: '#000', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                  }, children: [/*#__PURE__*/
                  _jsx(RotateCcw, { size: 16 }), " Play Again"] }
                ), /*#__PURE__*/
                _jsxs("button", { onClick: () => navigate('/'), style: {
                    padding: '10px 20px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                    color: 'white', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                  }, children: [/*#__PURE__*/
                  _jsx(Home, { size: 16 }), " Back to Home"] }
                )] }
              )] }
            ) : /*#__PURE__*/

            _jsxs(motion.div, { initial: { scale: 0 }, animate: { scale: 1, transition: { delay: 0.1, type: 'spring' } }, style: { textAlign: 'center', marginBottom: '24px' }, children: [/*#__PURE__*/
              _jsx(XCircle, { size: 48, color: "#ff3131", style: { marginBottom: '12px' } }), /*#__PURE__*/
              _jsx("h2", { style: { fontSize: '2rem', fontWeight: 900, color: '#ff3131', fontFamily: "'Nunito', sans-serif", textTransform: 'uppercase' }, children: "WRONG SUBMISSION" }), /*#__PURE__*/
              _jsxs("p", { style: { color: 'rgba(255,255,255,0.6)', marginTop: '8px' }, children: ["Passed ", runResult.passedCount, " / ", runResult.totalTests, " test cases"] })] }
            ), /*#__PURE__*/


            _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '8px' }, children:
              runResult.results.map((r, i) => /*#__PURE__*/
              _jsxs(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.06 } },
                style: {
                  padding: '10px 14px', borderRadius: '10px',
                  background: r.passed ? 'rgba(57,255,20,0.06)' : 'rgba(255,49,49,0.06)',
                  border: `1px solid ${r.passed ? 'rgba(57,255,20,0.2)' : 'rgba(255,49,49,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: '10px'
                }, children: [
                r.passed ? /*#__PURE__*/_jsx(CheckCircle, { size: 18, color: "#39ff14" }) : /*#__PURE__*/_jsx(XCircle, { size: 18, color: "#ff3131" }), /*#__PURE__*/
                _jsxs("div", { style: { flex: 1 }, children: [/*#__PURE__*/
                  _jsxs("div", { style: { fontWeight: 700, fontSize: '0.85rem', color: 'white' }, children: ["Test Case ",
                    r.testCase, " ", r.isHidden && /*#__PURE__*/_jsx("span", { style: { color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }, children: "(Hidden)" })] }
                  ), /*#__PURE__*/
                  _jsxs("div", { style: { fontSize: '0.72rem', color: r.passed ? 'rgba(57,255,20,0.6)' : 'rgba(255,49,49,0.6)', marginTop: '2px' }, children: [
                    r.status, !r.passed && !r.isHidden && r.got && /*#__PURE__*/_jsxs("span", { style: { color: 'rgba(255,255,255,0.3)' }, children: [" \u2014 ", r.got] })] }
                  )] }
                )] }, r.testCase
              )
              ) }
            ),

            !runResult.passed && (() => {
              const ff = runResult.results.find((r) => !r.passed && !r.isHidden);
              if (!ff) return null;
              return (/*#__PURE__*/
                _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1, transition: { delay: 0.5 } }, style: { marginTop: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }, children: [/*#__PURE__*/
                  _jsxs("div", { style: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 700 }, children: ["FAILED ON TEST CASE ", ff.testCase, ":"] }), /*#__PURE__*/
                  _jsxs("div", { style: { fontSize: '0.75rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }, children: [/*#__PURE__*/
                    _jsxs("div", { children: [/*#__PURE__*/_jsx("span", { style: { color: '#00f0ff' }, children: "Input:" }), " ", ff.input] }), /*#__PURE__*/
                    _jsxs("div", { children: [/*#__PURE__*/_jsx("span", { style: { color: '#39ff14' }, children: "Expected:" }), " ", ff.expected] }), /*#__PURE__*/
                    _jsxs("div", { children: [/*#__PURE__*/_jsx("span", { style: { color: '#ff3131' }, children: "Got:" }), " ", ff.got] })] }
                  )] }
                ));

            })()] }
          ) }
        ) }

      ), /*#__PURE__*/

      _jsx("style", { children: `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            ` })] }
    ));

};

export default GameRoom;
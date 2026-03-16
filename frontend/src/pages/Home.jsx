import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { BarChart2, LogOut, User, Calendar, Code2, X } from 'lucide-react';
import StatsModal from '../components/Game/StatsModal';

/* ── Profile Card (appears when clicking username) ─── */import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";

const ProfileCard = ({
  user,
  onClose



}) => {
  const cardRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const formatDob = (dob) => {
    if (!dob) return 'NOT FILLED';
    const d = new Date(dob);
    if (isNaN(d.getTime())) return 'NOT FILLED';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const profileFields = [
  { label: 'Date of Birth', value: formatDob(user.dob), icon: /*#__PURE__*/_jsx(Calendar, { size: 14, color: "#00f0ff" }) },
  { label: 'Codeforces', value: user.codeforcesId || null, icon: /*#__PURE__*/_jsx(Code2, { size: 14, color: "#ff9800" }) },
  { label: 'LeetCode', value: user.leetcodeId || null, icon: /*#__PURE__*/_jsx(Code2, { size: 14, color: "#39ff14" }) },
  { label: 'CodeChef', value: user.codechefId || null, icon: /*#__PURE__*/_jsx(Code2, { size: 14, color: "#b051ff" }) }];


  return (/*#__PURE__*/
    _jsxs("div", {
      ref: cardRef,
      style: {
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
        animation: 'fadeIn 0.15s ease'
      }, children: [/*#__PURE__*/


      _jsx("button", {
        onClick: onClose,
        style: {
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer'
        }, children: /*#__PURE__*/

        _jsx(X, { size: 16 }) }
      ), /*#__PURE__*/


      _jsxs("div", { style: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }, children: [/*#__PURE__*/
        _jsx("div", { style: {
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f0ff, #0080ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            fontSize: '1rem',
            color: '#000'
          }, children:
          user.username.charAt(0).toUpperCase() }
        ), /*#__PURE__*/
        _jsxs("div", { children: [/*#__PURE__*/
          _jsx("div", { style: {
              fontWeight: 800,
              color: 'white',
              fontSize: '0.95rem'
            }, children:
            user.username }
          ), /*#__PURE__*/
          _jsx("div", { style: {
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }, children: "Player Profile" }

          )] }
        )] }
      ), /*#__PURE__*/


      _jsx("div", { style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }, children:
        profileFields.map((field) => /*#__PURE__*/
        _jsxs("div", {

          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.04)'
          }, children: [

          field.icon, /*#__PURE__*/
          _jsxs("div", { style: { flex: 1 }, children: [/*#__PURE__*/
            _jsx("div", { style: {
                fontSize: '0.6rem',
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em'
              }, children:
              field.label }
            ), /*#__PURE__*/
            _jsx("div", { style: {
                fontSize: '0.8rem',
                fontWeight: 600,
                color: field.value && field.value !== 'NOT FILLED' ?
                'rgba(255,255,255,0.85)' :
                'rgba(255,255,255,0.25)',
                fontStyle: !field.value || field.value === 'NOT FILLED' ?
                'italic' :
                'normal'
              }, children:
              field.value || '(NOT FILLED)' }
            )] }
          )] }, field.label
        )
        ) }
      )] }
    ));

};

/* ── Home Page ──────────────────────────────────────── */

const Home = () => {
  const navigate = useNavigate();
  const { setPlayerInfo } = useUser();
  const { user, logout } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [showPlayMenu, setShowPlayMenu] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [validating, setValidating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleCreateRoom = () => {
    if (user) setPlayerInfo(user.username);
    const newRoom = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/lobby/${newRoom}`);
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;

    setJoinError('');
    setValidating(true);

    try {
      const res = await fetch(`http://localhost:3000/api/rooms/${code}/validate`);
      const data = await res.json();

      if (data.valid) {
        if (user) setPlayerInfo(user.username);
        navigate(`/lobby/${code}`);
      } else {
        setJoinError(data.error || 'Could not join room');
      }
    } catch (err) {
      setJoinError('Could not connect to server');
    } finally {
      setValidating(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleBackFromPlay = () => {
    setShowPlayMenu(false);
    setShowJoinInput(false);
    setJoinError('');
    setRoomCode('');
  };

  return (/*#__PURE__*/
    _jsxs("div", { className: "home-container", children: [/*#__PURE__*/
      _jsxs("div", { className: "home-bg", children: [
        _jsx("div", { className: "lamp-glow-left" }),
        _jsx("div", { className: "lamp-glow-right" }),
      ] }), /*#__PURE__*/
      _jsx("div", { className: "home-overlay" }), /*#__PURE__*/

      _jsxs("div", { className: "home-content", children: [/*#__PURE__*/

        _jsxs("div", { style: {
            position: 'absolute',
            top: '20px',
            right: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10
          }, children: [/*#__PURE__*/

          _jsxs("button", {
            onClick: () => setShowProfile(!showProfile),
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showProfile ?
              'rgba(0,240,255,0.1)' :
              'none',
              border: showProfile ?
              '1px solid rgba(0,240,255,0.2)' :
              '1px solid transparent',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.82rem',
              fontWeight: 600
            }, children: [/*#__PURE__*/

            _jsx(User, { size: 14 }),
            user?.username] }
          ),


          showProfile && user && /*#__PURE__*/
          _jsx(ProfileCard, {
            user: user,
            onClose: () => setShowProfile(false) }
          ), /*#__PURE__*/


          _jsxs("button", {
            onClick: handleSignOut,
            style: {
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
              gap: '4px'
            }, children: [/*#__PURE__*/

            _jsx(LogOut, { size: 14 }), " Sign Out"] }
          )] }
        ), /*#__PURE__*/

        _jsx("h1", { className: "title-among-us", children: "AMONG BUGS" }),

        !showPlayMenu ? /*#__PURE__*/
        _jsxs(_Fragment, { children: [/*#__PURE__*/
          _jsxs("div", { className: "main-menu-grid", style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }, children: [/*#__PURE__*/
            _jsx("button", { className: "btn-among-us", onClick: () => setShowPlayMenu(true), style: { width: '100%', maxWidth: '500px', padding: '18px 32px', fontSize: '1.5rem' }, children: "PLAY" }
            ), /*#__PURE__*/
            _jsxs("div", { style: { display: 'flex', gap: '14px', width: '100%', maxWidth: '500px' }, children: [/*#__PURE__*/
              _jsx("button", {
                className: "btn-among-us btn-among-us-sm",
                style: { flex: 1 },
                onClick: () => navigate('/how-to-play'), children:
                "HOW TO PLAY" }
              ), /*#__PURE__*/
              _jsx("button", {
                className: "btn-among-us btn-among-us-sm",
                style: { flex: 1 },
                onClick: () => navigate('/mock-play'), children:
                "MOCK PLAY" }
              )] }
            )] }
          ), /*#__PURE__*/

          _jsx("div", { className: "icon-bar", children: /*#__PURE__*/
            _jsx("button", {
              className: "btn-icon-among-us",
              onClick: () => setShowStats(true), children: /*#__PURE__*/
              _jsx(BarChart2, { size: 28 }) }
            ) }
          )] }

        ) : !showJoinInput ? /*#__PURE__*/

        _jsxs("div", { className: "lobby-card animate-slide-in", style: { textAlign: 'center' }, children: [/*#__PURE__*/
          _jsx("h2", { className: "lobby-title", children: "MULTIPLAYER" }), /*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }, children: [/*#__PURE__*/
            _jsx("button", {
              className: "btn-among-us",
              onClick: handleCreateRoom,
              style: { width: '100%', padding: '16px', fontSize: '1.1rem' }, children:
              "CREATE ROOM" }
            ), /*#__PURE__*/
            _jsx("button", {
              className: "btn-among-us",
              onClick: () => { setShowJoinInput(true); setJoinError(''); setRoomCode(''); },
              style: { width: '100%', padding: '16px', fontSize: '1.1rem' }, children:
              "JOIN ROOM" }
            ), /*#__PURE__*/
            _jsx("button", {
              className: "btn-among-us btn-among-us-sm",
              onClick: handleBackFromPlay,
              style: { width: '100%', marginTop: '4px' }, children:
              "BACK" }
            )] }
          )] }
        ) : /*#__PURE__*/

        _jsxs("div", { className: "lobby-card animate-slide-in", children: [/*#__PURE__*/
          _jsx("h2", { className: "lobby-title", children: "JOIN ROOM" }), /*#__PURE__*/
          _jsxs("form", { onSubmit: handleJoinRoom, className: "lobby-form", children: [/*#__PURE__*/
            _jsx("input", {
              type: "text",
              placeholder: "ROOM CODE",
              className: "lobby-input",
              value: roomCode,
              onChange: (e) => setRoomCode(e.target.value.toUpperCase()),
              maxLength: 6,
              autoFocus: true,
              style: { letterSpacing: '0.3em', fontSize: '1.8rem' } }
            ),

            joinError && /*#__PURE__*/
            _jsx("div", { style: {
                padding: '10px 14px', borderRadius: '8px', marginTop: '8px',
                background: 'rgba(255,49,49,0.1)', border: '1px solid rgba(255,49,49,0.3)',
                color: '#ff3131', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center'
              }, children: joinError }
            ), /*#__PURE__*/

            _jsxs("div", { className: "lobby-buttons", children: [/*#__PURE__*/
              _jsx("button", {
                type: "button",
                className: "btn-among-us btn-among-us-sm lobby-back-btn",
                onClick: () => { setShowJoinInput(false); setJoinError(''); }, children:
                "BACK" }
              ), /*#__PURE__*/
              _jsx("button", {
                type: "submit",
                className: "btn-among-us btn-among-us-sm lobby-enter-btn",
                disabled: !roomCode.trim() || validating, children:
                validating ? 'CHECKING...' : 'JOIN' }
              )] }
            )] }
          )] }
        )] }

      ), /*#__PURE__*/

      _jsx(StatsModal, { isOpen: showStats, onClose: () => setShowStats(false) }), /*#__PURE__*/

      _jsx("style", { children: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            ` })] }
    ));

};

export default Home;
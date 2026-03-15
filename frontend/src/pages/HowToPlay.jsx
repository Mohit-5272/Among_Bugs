import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Skull, ArrowLeft } from 'lucide-react';
import CivilianTutorial from '../components/Tutorial/CivilianTutorial';
import ImpostorTutorial from '../components/Tutorial/ImpostorTutorial';import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";



const HowToPlay = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('SELECT');

  if (mode === 'CIVILIAN') {
    return (/*#__PURE__*/
      _jsxs("div", { style: { height: '100vh', width: '100vw', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }, children: [/*#__PURE__*/
        _jsxs("button", {
          onClick: () => setMode('SELECT'),
          style: {
            position: 'absolute', top: '12px', right: '16px', zIndex: 500,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
          }, children: [/*#__PURE__*/

          _jsx(ArrowLeft, { size: 14 }), " Back"] }
        ), /*#__PURE__*/
        _jsx("div", { style: { flex: 1 }, children: /*#__PURE__*/
          _jsx(CivilianTutorial, {}) }
        )] }
      ));

  }

  if (mode === 'IMPOSTOR') {
    return (/*#__PURE__*/
      _jsxs("div", { style: { height: '100vh', width: '100vw', background: '#0a0a0f', display: 'flex', flexDirection: 'column' }, children: [/*#__PURE__*/
        _jsxs("button", {
          onClick: () => setMode('SELECT'),
          style: {
            position: 'absolute', top: '12px', right: '16px', zIndex: 500,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
          }, children: [/*#__PURE__*/

          _jsx(ArrowLeft, { size: 14 }), " Back"] }
        ), /*#__PURE__*/
        _jsx("div", { style: { flex: 1 }, children: /*#__PURE__*/
          _jsx(ImpostorTutorial, {}) }
        )] }
      ));

  }

  // Mode Selection Screen
  return (/*#__PURE__*/
    _jsxs("div", { style: {
        height: '100vh',
        width: '100vw',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem'
      }, children: [/*#__PURE__*/
      _jsxs("button", {
        onClick: () => navigate('/'),
        style: {
          position: 'absolute', top: '24px', left: '24px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
          color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
        }, children: [/*#__PURE__*/

        _jsx(ArrowLeft, { size: 16 }), " Home"] }
      ), /*#__PURE__*/

      _jsx("h1", { style: {
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 900,
          fontSize: '3rem',
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em'
        }, children: "How to Play" }

      ), /*#__PURE__*/

      _jsx("p", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem', maxWidth: '500px', textAlign: 'center', lineHeight: 1.6 }, children: "Choose a role to learn how the game works with an interactive tutorial." }

      ), /*#__PURE__*/

      _jsxs("div", { style: { display: 'flex', gap: '24px', marginTop: '1rem' }, children: [/*#__PURE__*/

        _jsxs("button", {
          onClick: () => setMode('CIVILIAN'),
          style: {
            width: '260px',
            padding: '32px 24px',
            background: 'rgba(0,240,255,0.05)',
            border: '2px solid rgba(0,240,255,0.3)',
            borderRadius: '16px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = '#00f0ff';
            e.currentTarget.style.background = 'rgba(0,240,255,0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = 'rgba(0,240,255,0.3)';
            e.currentTarget.style.background = 'rgba(0,240,255,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }, children: [/*#__PURE__*/

          _jsx("div", { style: {
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(0,240,255,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }, children: /*#__PURE__*/
            _jsx(Shield, { size: 32, color: "#00f0ff" }) }
          ), /*#__PURE__*/
          _jsx("h2", { style: { fontWeight: 800, fontSize: '1.3rem', color: '#00f0ff' }, children: "CIVILIAN" }), /*#__PURE__*/
          _jsx("p", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.5 }, children: "Learn to find and fix bugs in C++ code. Get hints when you're stuck!" }

          )] }
        ), /*#__PURE__*/


        _jsxs("button", {
          onClick: () => setMode('IMPOSTOR'),
          style: {
            width: '260px',
            padding: '32px 24px',
            background: 'rgba(255,49,49,0.05)',
            border: '2px solid rgba(255,49,49,0.3)',
            borderRadius: '16px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = '#ff3131';
            e.currentTarget.style.background = 'rgba(255,49,49,0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = 'rgba(255,49,49,0.3)';
            e.currentTarget.style.background = 'rgba(255,49,49,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }, children: [/*#__PURE__*/

          _jsx("div", { style: {
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(255,49,49,0.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }, children: /*#__PURE__*/
            _jsx(Skull, { size: 32, color: "#ff3131" }) }
          ), /*#__PURE__*/
          _jsx("h2", { style: { fontWeight: 800, fontSize: '1.3rem', color: '#ff3131' }, children: "IMPOSTOR" }), /*#__PURE__*/
          _jsx("p", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.5 }, children: "Master the art of sabotage. Learn each ability and the cooldown system." }

          )] }
        )] }
      )] }
    ));

};

export default HowToPlay;
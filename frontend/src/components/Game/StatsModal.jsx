import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Trophy, Shield, Skull, Medal } from 'lucide-react';import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const API_URL = 'http://localhost:3000';
















const StatsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    fetch(`${API_URL}/api/auth/stats/${user._id}`).
    then((res) => res.json()).
    then((data) => {
      setStats(data);
      setLoading(false);
    }).
    catch(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const levelColor = (l) =>
  l === 'easy' ? '#39ff14' : l === 'hard' ? '#ff3131' : '#ff9800';

  return (/*#__PURE__*/
    _jsx("div", { style: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }, children: /*#__PURE__*/
      _jsxs("div", { style: {
          background: '#12121f',
          border: '2px solid rgba(0,240,255,0.3)',
          borderRadius: '20px',
          padding: '32px',
          width: '90%',
          maxWidth: '420px',
          position: 'relative'
        }, children: [/*#__PURE__*/
        _jsx("button", {
          onClick: onClose,
          style: {
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer'
          }, children: /*#__PURE__*/

          _jsx(X, { size: 20 }) }
        ), /*#__PURE__*/

        _jsxs("h2", { style: {
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 900,
            fontSize: '1.5rem',
            color: '#00f0ff',
            textAlign: 'center',
            marginBottom: '24px',
            textTransform: 'uppercase'
          }, children: [/*#__PURE__*/
          _jsx(Trophy, { size: 22, style: { verticalAlign: 'middle', marginRight: '8px' } }), "Your Stats"] }

        ),

        loading ? /*#__PURE__*/
        _jsx("div", { style: {
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            padding: '24px'
          }, children: "Loading..." }

        ) :
        stats ? /*#__PURE__*/
        _jsxs("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }, children: [/*#__PURE__*/
          _jsx(StatCard, {
            icon: /*#__PURE__*/_jsx(Shield, { size: 20, color: "#00f0ff" }),
            label: "Civilian Wins",
            value: stats.civilianWins,
            color: "#00f0ff" }
          ), /*#__PURE__*/
          _jsx(StatCard, {
            icon: /*#__PURE__*/_jsx(Skull, { size: 20, color: "#ff3131" }),
            label: "Impostor Wins",
            value: stats.impostorWins,
            color: "#ff3131" }
          ), /*#__PURE__*/
          _jsx(StatCard, {
            icon: /*#__PURE__*/_jsx(Medal, { size: 20, color: levelColor(stats.highestLevel) }),
            label: "Highest Level Solved",
            value: stats.highestLevel.toUpperCase(),
            color: levelColor(stats.highestLevel) }
          ), /*#__PURE__*/

          _jsx("div", { style: {
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '12px',
              marginTop: '4px'
            }, children: /*#__PURE__*/
            _jsxs("div", { style: {
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: 'rgba(255,255,255,0.4)'
              }, children: [/*#__PURE__*/
              _jsxs("span", { children: ["Games Played: ", stats.gamesPlayed] }), /*#__PURE__*/
              _jsxs("span", { children: ["Total Wins: ", stats.wins] }), /*#__PURE__*/
              _jsxs("span", { children: ["Losses: ", stats.losses] })] }
            ) }
          )] }
        ) : /*#__PURE__*/

        _jsx("div", { style: {
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            padding: '24px'
          }, children: "No stats found" }

        )] }

      ) }
    ));

};

/* ── Stat Card Sub-Component ────────────────────────── */








const StatCard = ({ icon, label, value, color }) => /*#__PURE__*/
_jsxs("div", { style: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    background: `${color}08`,
    border: `1px solid ${color}25`,
    borderRadius: '12px'
  }, children: [
  icon, /*#__PURE__*/
  _jsxs("div", { style: { flex: 1 }, children: [/*#__PURE__*/
    _jsx("div", { style: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }, children:
      label }
    ), /*#__PURE__*/
    _jsx("div", { style: {
        fontSize: '1.3rem',
        fontWeight: 900,
        color,
        fontFamily: 'monospace'
      }, children:
      value }
    )] }
  )] }
);


export default StatsModal;
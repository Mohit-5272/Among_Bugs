import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Bug } from 'lucide-react';import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";

const Login = () => {
  const { signup, login } = useAuth();
  const [isSignup, setIsSignup] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [codeforcesId, setCodeforcesId] = useState('');
  const [leetcodeId, setLeetcodeId] = useState('');
  const [codechefId, setCodechefId] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }

    if (isSignup) {
      if (!dob) {
        setError('Date of birth is required');
        return;
      }
      if (!acceptTerms) {
        setError('You must accept the Terms and Policy');
        return;
      }
      setLoading(true);
      const result = await signup({
        username,
        password,
        dob,
        codeforcesId,
        leetcodeId,
        codechefId
      });
      if (result.error) setError(result.error);
    } else {
      setLoading(true);
      const result = await login(username, password);
      if (result.error) setError(result.error);
    }
    setLoading(false);
  };

  return (/*#__PURE__*/
    _jsxs("div", { style: {
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        position: 'relative',
        overflow: 'hidden'
      }, children: [/*#__PURE__*/

      _jsx("div", { style: {
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 50%, rgba(0,240,255,0.03) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(255,49,49,0.03) 0%, transparent 50%)'
        } }), /*#__PURE__*/

      _jsxs("div", { style: {
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          padding: '0 20px'
        }, children: [/*#__PURE__*/

        _jsxs("div", { style: { textAlign: 'center', marginBottom: '32px' }, children: [/*#__PURE__*/
          _jsx(Bug, { size: 48, color: "#00f0ff", style: { marginBottom: '12px' } }), /*#__PURE__*/
          _jsx("h1", { style: {
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 900,
              fontSize: '2.5rem',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em'
            }, children: "AMONG BUGS" }

          ), /*#__PURE__*/
          _jsx("p", { style: {
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.85rem',
              marginTop: '4px'
            }, children:
            isSignup ? 'Create your account to start playing' : 'Welcome back, debugger' }
          )] }
        ), /*#__PURE__*/


        _jsxs("form", { onSubmit: handleSubmit, style: {
            background: 'rgba(10,10,20,0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }, children: [/*#__PURE__*/

          _jsxs("div", { style: {
              display: 'flex',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)'
            }, children: [/*#__PURE__*/
            _jsx("button", {
              type: "button",
              onClick: () => {setIsSignup(true);setError('');},
              style: {
                flex: 1,
                padding: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: isSignup ? 'rgba(0,240,255,0.12)' : 'transparent',
                color: isSignup ? '#00f0ff' : 'rgba(255,255,255,0.3)',
                border: 'none'
              }, children:
              "SIGN UP" }

            ), /*#__PURE__*/
            _jsx("button", {
              type: "button",
              onClick: () => {setIsSignup(false);setError('');},
              style: {
                flex: 1,
                padding: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: !isSignup ? 'rgba(0,240,255,0.12)' : 'transparent',
                color: !isSignup ? '#00f0ff' : 'rgba(255,255,255,0.3)',
                border: 'none'
              }, children:
              "LOG IN" }

            )] }
          ), /*#__PURE__*/


          _jsx("input", {
            value: username,
            onChange: (e) => setUsername(e.target.value),
            placeholder: "Username",
            style: inputStyle,
            maxLength: 20,
            autoFocus: true }
          ), /*#__PURE__*/


          _jsxs("div", { style: { position: 'relative' }, children: [/*#__PURE__*/
            _jsx("input", {
              value: password,
              onChange: (e) => setPassword(e.target.value),
              placeholder: "Password",
              type: showPassword ? 'text' : 'password',
              style: inputStyle }
            ), /*#__PURE__*/
            _jsx("button", {
              type: "button",
              onClick: () => setShowPassword(!showPassword),
              style: {
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)'
              }, children:

              showPassword ? /*#__PURE__*/_jsx(EyeOff, { size: 16 }) : /*#__PURE__*/_jsx(Eye, { size: 16 }) }
            )] }
          ),


          isSignup && /*#__PURE__*/
          _jsxs(_Fragment, { children: [/*#__PURE__*/
            _jsxs("div", { children: [/*#__PURE__*/
              _jsx("label", { style: labelStyle, children: "Date of Birth *" }), /*#__PURE__*/
              _jsx("input", {
                type: "date",
                value: dob,
                onChange: (e) => setDob(e.target.value),
                required: true,
                max: new Date().toISOString().split('T')[0],
                style: {
                  ...inputStyle,
                  colorScheme: 'dark',
                  cursor: 'pointer'
                } }
              )] }
            ), /*#__PURE__*/

            _jsxs("div", { style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px'
              }, children: [/*#__PURE__*/
              _jsxs("div", { children: [/*#__PURE__*/
                _jsx("label", { style: labelStyle, children: "Codeforces" }), /*#__PURE__*/
                _jsx("input", {
                  value: codeforcesId,
                  onChange: (e) => setCodeforcesId(e.target.value),
                  placeholder: "ID",
                  style: { ...inputStyle, fontSize: '0.75rem' } }
                )] }
              ), /*#__PURE__*/
              _jsxs("div", { children: [/*#__PURE__*/
                _jsx("label", { style: labelStyle, children: "LeetCode" }), /*#__PURE__*/
                _jsx("input", {
                  value: leetcodeId,
                  onChange: (e) => setLeetcodeId(e.target.value),
                  placeholder: "ID",
                  style: { ...inputStyle, fontSize: '0.75rem' } }
                )] }
              ), /*#__PURE__*/
              _jsxs("div", { children: [/*#__PURE__*/
                _jsx("label", { style: labelStyle, children: "CodeChef" }), /*#__PURE__*/
                _jsx("input", {
                  value: codechefId,
                  onChange: (e) => setCodechefId(e.target.value),
                  placeholder: "ID",
                  style: { ...inputStyle, fontSize: '0.75rem' } }
                )] }
              )] }
            ), /*#__PURE__*/

            _jsxs("label", { style: {
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.5)'
              }, children: [/*#__PURE__*/
              _jsx("input", {
                type: "checkbox",
                checked: acceptTerms,
                onChange: (e) => setAcceptTerms(e.target.checked),
                style: {
                  width: '16px',
                  height: '16px',
                  accentColor: '#00f0ff'
                } }
              ), "I accept the Terms and Policy *"] }

            )] }
          ),



          error && /*#__PURE__*/
          _jsx("div", { style: {
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255,49,49,0.1)',
              border: '1px solid rgba(255,49,49,0.3)',
              color: '#ff3131',
              fontSize: '0.8rem',
              fontWeight: 600
            }, children:
            error }
          ), /*#__PURE__*/



          _jsx("button", {
            type: "submit",
            disabled: loading,
            style: {
              padding: '12px',
              background: '#00f0ff',
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: loading ? 'wait' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }, children:

            loading ? 'Please wait...' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN' }
          )] }
        )] }
      )] }
    ));

};

/* ── Shared Styles ──────────────────────────────────── */

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.85rem',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.3)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em'
};

export default Login;
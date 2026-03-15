import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Lightbulb, X } from 'lucide-react';import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const BROKEN_CODE = `#include <iostream>
using namespace std;

int sum(int a, int b) {
    return a - b; // BUG: Should be a + b
}

int main() {
    int x, y;
    cin >> x >> y  // BUG: Missing semicolon
    cout << "Sum: " << sum(x, y) << endl;
    return 0;
}`;

const HINTS = [
'Look at line 5 — is the sum function actually adding?',
'Check line 15 — every C++ statement needs a semicolon!',
'Try changing the operator on line 5 from "-" to "+"'];


const CivilianTutorial = () => {
  const editorRef = useRef(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [showHintModal, setShowHintModal] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = monaco.editor.create(editorRef.current, {
      value: BROKEN_CODE,
      language: 'cpp',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 15,
      padding: { top: 16 },
      scrollbar: { verticalScrollbarSize: 8 }
    });

    return () => editor.dispose();
  }, []);

  const handleNextHint = () => {
    if (hintIndex < HINTS.length - 1) {
      setHintIndex((prev) => prev + 1);
    }
  };

  return (/*#__PURE__*/
    _jsxs("div", { style: { position: 'relative', height: '100%', width: '100%' }, children: [/*#__PURE__*/

      _jsxs("div", { style: {
          padding: '12px 20px',
          background: 'rgba(0,240,255,0.08)',
          borderBottom: '1px solid rgba(0,240,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }, children: [/*#__PURE__*/
        _jsx("span", { style: { color: '#00f0ff', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }, children: "\uD83D\uDEE0 Civilian Tutorial" }

        ), /*#__PURE__*/
        _jsx("span", { style: { color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }, children: "Fix the bugs in this C++ code. Click the hint button if you're stuck!" }

        )] }
      ), /*#__PURE__*/


      _jsx("div", { ref: editorRef, style: { height: 'calc(100% - 48px)', width: '100%' } }),


      !showHintModal && /*#__PURE__*/
      _jsxs("button", {
        onClick: () => setShowHintModal(true),
        style: {
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #ff9800, #ff5722)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 20px rgba(255,152,0,0.5)',
          animation: 'pulse-glow 2s infinite',
          zIndex: 100
        }, children: [/*#__PURE__*/

        _jsx(Lightbulb, { size: 20 }), " Need a Hint?"] }
      ),



      showHintModal && /*#__PURE__*/
      _jsx("div", { style: {
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }, children: /*#__PURE__*/
        _jsxs("div", { style: {
            background: '#1a1a2e',
            border: '2px solid rgba(255,152,0,0.5)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            position: 'relative'
          }, children: [/*#__PURE__*/
          _jsx("button", {
            onClick: () => setShowHintModal(false),
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

          _jsxs("h3", { style: { color: '#ff9800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }, children: [/*#__PURE__*/
            _jsx(Lightbulb, { size: 22 }), " Hint ", hintIndex + 1, " of ", HINTS.length] }
          ), /*#__PURE__*/
          _jsx("p", { style: { color: 'rgba(255,255,255,0.85)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }, children:
            HINTS[hintIndex] }
          ), /*#__PURE__*/
          _jsxs("div", { style: { display: 'flex', gap: '12px', justifyContent: 'flex-end' }, children: [
            hintIndex < HINTS.length - 1 && /*#__PURE__*/
            _jsx("button", {
              onClick: handleNextHint,
              style: {
                padding: '8px 20px',
                background: 'transparent',
                border: '2px solid #ff9800',
                color: '#ff9800',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700
              }, children:
              "Next Hint \u2192" }

            ), /*#__PURE__*/

            _jsx("button", {
              onClick: () => setShowHintModal(false),
              style: {
                padding: '8px 20px',
                background: '#ff9800',
                border: 'none',
                color: 'black',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700
              }, children:
              "Got it!" }

            )] }
          )] }
        ) }
      )] }

    ));

};

export default CivilianTutorial;
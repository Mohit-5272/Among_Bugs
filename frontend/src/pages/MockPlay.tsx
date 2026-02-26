import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as monaco from 'monaco-editor';
import { ArrowLeft, Timer, Play, Trophy, XCircle, CheckCircle, X, Skull, Bot, AlertTriangle, Loader2 } from 'lucide-react';
import { playSabotageSound, playCountdownBeep, playVictorySound, playDefeatSound } from '../utils/sounds';

// ─── CHALLENGE TYPE ─────────────────────────────────
interface Challenge {
    title: string;
    difficulty: string;
    description: string;
    starterCode: string;
    testCases: { input: string; expected: string; hidden: boolean }[];
}

// ─── AI IMPOSTOR SABOTAGE DEFINITIONS ───────────────
const AI_SABOTAGES = [
    {
        name: 'Swap + to −',
        message: '⚠️ The Impostor swapped a + to − in your code!',
        isApplicable: (c: string) => c.split('\n').some(l => !l.includes('#include') && !l.includes('cout') && / \+= /.test(l)),
        apply: (c: string) => c.replace(' += ', ' -= '),
    },
    {
        name: 'Delete Semicolon',
        message: '⚠️ The Impostor removed a semicolon!',
        isApplicable: (c: string) => c.split('\n').some(l => l.trim().endsWith(';') && !l.includes('#include') && !l.includes('using ') && l.trim().length > 5),
        apply: (c: string) => {
            const lines = c.split('\n');
            const candidates = lines.map((l, i) => ({ l, i })).filter(({ l }) =>
                l.trim().endsWith(';') && !l.includes('#include') && !l.includes('using ') && l.trim().length > 5
            );
            if (!candidates.length) return c;
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            lines[target.i] = lines[target.i].replace(/;(\s*)$/, '$1');
            return lines.join('\n');
        },
    },
    {
        name: 'Off-By-One',
        message: '⚠️ The Impostor changed a loop bound!',
        isApplicable: (c: string) => /for\s*\(.*< /.test(c),
        apply: (c: string) => {
            const lines = c.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('for') && lines[i].includes('< ') && !lines[i].includes('<<')) {
                    lines[i] = lines[i].replace('< ', '<= ');
                    return lines.join('\n');
                }
            }
            return c;
        },
    },
    {
        name: 'Change Initial Value',
        message: '⚠️ The Impostor changed sum = 0 to sum = 1!',
        isApplicable: (c: string) => c.includes('sum = 0'),
        apply: (c: string) => c.replace('sum = 0', 'sum = 1'),
    },
    {
        name: 'Wrong Return',
        message: '⚠️ The Impostor changed return 0 to return 1!',
        isApplicable: (c: string) => c.includes('return 0;'),
        apply: (c: string) => c.replace('return 0;', 'return 1;'),
    },
];

const MockPlay = () => {
    const navigate = useNavigate();
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [timeLeft, setTimeLeft] = useState(300);
    const [aiLog, setAiLog] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const challengeRef = useRef<Challenge | null>(null);
    const [resultData, setResultData] = useState<{
        passed: boolean;
        passedCount: number;
        totalTests: number;
        results: {
            testCase: number;
            passed: boolean;
            status: string;
            isHidden: boolean;
            input?: string;
            expected?: string;
            got?: string;
        }[];
    } | null>(null);
    const aiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Snapshot of code at the moment of submission
    const submittedCodeRef = useRef<string | null>(null);
    const gameOverRef = useRef(false);

    const hasFetchedRef = useRef(false);

    // Fetch challenge from Gemini API on mount
    useEffect(() => {
        if (hasFetchedRef.current) return;
        hasFetchedRef.current = true;

        const fetchChallenge = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/challenges/generate');
                const data = await res.json();
                setChallenge(data);
                challengeRef.current = data;
            } catch (err) {
                console.error('Failed to fetch challenge:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchChallenge();
    }, []);

    // Toast notification for AI sabotage
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const showSabotageToast = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3500);
    };

    // Init Monaco once challenge is loaded
    useEffect(() => {
        if (!editorRef.current || !challenge) return;
        if (editorInstance.current) editorInstance.current.dispose();

        const editor = monaco.editor.create(editorRef.current, {
            value: challenge.starterCode,
            language: 'cpp',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 15,
            padding: { top: 16 },
            scrollbar: { verticalScrollbarSize: 8 },
        });

        editorInstance.current = editor;
        return () => { editor.dispose(); };
    }, [challenge]);

    // Timer with countdown beeps + auto-evaluate on expiry
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(p => {
                if (p <= 31 && p > 1) playCountdownBeep(p - 1);
                if (p <= 1 && !gameOverRef.current) {
                    gameOverRef.current = true;
                    setGameOver(true);
                    // Auto-evaluate: use last submitted snapshot, or current editor code
                    const codeToRun = submittedCodeRef.current
                        || editorInstance.current?.getModel()?.getValue()
                        || '';
                    runTestsWithCode(codeToRun);
                }
                return p > 0 ? p - 1 : 0;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // AI Impostor — runs every 15-25 seconds
    useEffect(() => {
        const runAI = () => {
            if (!editorInstance.current) return;
            const model = editorInstance.current.getModel();
            if (!model) return;
            const code = model.getValue();

            const applicable = AI_SABOTAGES.filter(s => s.isApplicable(code));
            if (applicable.length === 0) return;

            const chosen = applicable[Math.floor(Math.random() * applicable.length)];
            const newCode = chosen.apply(code);
            if (newCode !== code) {
                model.setValue(newCode);
                setAiLog(prev => [`🤖 ${chosen.name}`, ...prev].slice(0, 8));
                showSabotageToast(chosen.message);
                playSabotageSound();
            }
        };

        const firstDelay = 10000 + Math.random() * 5000;
        const firstTimeout = setTimeout(() => {
            runAI();
            aiIntervalRef.current = setInterval(runAI, 15000 + Math.random() * 10000);
        }, firstDelay);

        return () => {
            clearTimeout(firstTimeout);
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        };
    }, []);

    // Core execution function — runs a frozen code snapshot against all test cases
    const runTestsWithCode = useCallback(async (codeSnapshot: string) => {
        setSubmitting(true);

        const results: {
            testCase: number;
            passed: boolean;
            status: string;
            isHidden: boolean;
            input?: string;
            expected?: string;
            got?: string;
        }[] = [];
        let allPassed = true;

        const ch = challengeRef.current;
        if (!ch) { setSubmitting(false); return; }

        for (let i = 0; i < ch.testCases.length; i++) {
            const tc = ch.testCases[i];
            try {
                const response = await fetch('https://wandbox.org/api/compile.json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: codeSnapshot,
                        compiler: 'gcc-head',
                        options: '',
                        stdin: tc.input,
                    }),
                    signal: AbortSignal.timeout(15000),
                });

                const data = await response.json();
                const compileError = data.compiler_error || '';
                const stdout = (data.program_output || '').trim();
                const exitStatus = data.status;

                let status: string;
                let passed = false;

                if (compileError) {
                    status = 'Compile Error';
                } else if (exitStatus !== '0' && exitStatus !== 0) {
                    status = 'Runtime Error';
                } else if (stdout === tc.expected.trim()) {
                    status = 'Accepted';
                    passed = true;
                } else {
                    status = 'Wrong Answer';
                }

                if (!passed) allPassed = false;
                results.push({
                    testCase: i + 1,
                    passed,
                    status,
                    isHidden: tc.hidden,
                    input: tc.hidden ? undefined : tc.input,
                    expected: tc.hidden ? undefined : tc.expected,
                    got: tc.hidden ? undefined : (stdout || compileError || 'No output'),
                });
            } catch {
                allPassed = false;
                results.push({
                    testCase: i + 1,
                    passed: false,
                    status: 'Execution Error',
                    isHidden: tc.hidden,
                    got: 'Service unavailable — try again',
                });
            }
        }

        const passedCount = results.filter(r => r.passed).length;
        setResultData({ passed: allPassed, passedCount, totalTests: results.length, results });
        setShowResult(true);
        setGameOver(true);
        gameOverRef.current = true;
        allPassed ? playVictorySound() : playDefeatSound();
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        setSubmitting(false);
    }, []);

    // Submit handler — snapshots the code, then runs tests on the snapshot
    const handleRunTests = useCallback(() => {
        if (!editorInstance.current || submitting) return;
        const code = editorInstance.current.getModel()?.getValue() || '';
        // Freeze the code — AI can still change the editor, but THIS snapshot is what gets evaluated
        submittedCodeRef.current = code;
        runTestsWithCode(code);
    }, [runTestsWithCode, submitting]);

    // Loading screen while Gemini generates the challenge
    if (loading || !challenge) {
        return (
            <div style={{
                height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', gap: '20px',
            }}>
                <Loader2 size={48} color="#00f0ff" style={{ animation: 'spin 1s linear infinite' }} />
                <h2 style={{ color: '#00f0ff', fontWeight: 800, fontSize: '1.3rem', fontFamily: "'Nunito', sans-serif" }}>
                    GENERATING CHALLENGE...
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', animation: 'pulse 1.5s ease-in-out infinite' }}>
                    Gemini AI is crafting a random DSA problem for you
                </p>
                <style>{`
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#0a0a0f', overflow: 'hidden' }}>
            {/* Sabotage Toast Notification */}
            {showToast && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 2000, padding: '14px 28px', borderRadius: '12px',
                    background: 'rgba(255,49,49,0.15)', border: '2px solid rgba(255,49,49,0.5)',
                    backdropFilter: 'blur(12px)', color: 'white', fontWeight: 700, fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    animation: 'slideDown 0.3s ease-out, fadeOut 0.5s ease-in 3s forwards',
                    boxShadow: '0 8px 32px rgba(255,49,49,0.3)',
                }}>
                    <AlertTriangle size={20} color="#ff3131" />
                    {toastMessage}
                </div>
            )}

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', minWidth: 0 }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px',
                    background: 'rgba(10,10,20,0.85)', borderRadius: '12px', marginBottom: '12px',
                    border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => navigate('/')} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', color: 'white', padding: '6px 12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600,
                        }}><ArrowLeft size={14} /> Menu</button>

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9800',
                            fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700,
                            background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: '8px',
                            border: '1px solid rgba(255,152,0,0.3)',
                        }}>
                            <Timer size={16} />
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>

                        <span style={{ color: '#00f0ff', fontWeight: 700, fontSize: '0.85rem' }}>
                            <Bot size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            MOCK PLAY — PvE
                        </span>
                    </div>

                    <button onClick={handleRunTests} disabled={submitting || gameOver} style={{
                        padding: '8px 18px', background: (submitting || gameOver) ? '#555' : '#00f0ff', border: 'none',
                        borderRadius: '8px', color: '#000', fontWeight: 700, cursor: (submitting || gameOver) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                    }}>
                        <Play size={16} fill="currentColor" /> {submitting ? 'Evaluating...' : gameOver ? 'Game Over' : 'Submit'}
                    </button>
                </div>

                {/* Challenge info */}
                {challenge && (
                    <div style={{
                        padding: '10px 16px', background: 'rgba(10,10,20,0.85)', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px', flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 800, color: '#00f0ff', fontSize: '0.85rem', textTransform: 'uppercase' }}>{challenge.title}</span>
                            <span style={{
                                fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
                                background: challenge.difficulty === 'medium' ? 'rgba(255,152,0,0.15)' : 'rgba(57,255,20,0.15)',
                                color: challenge.difficulty === 'medium' ? '#ff9800' : '#39ff14',
                            }}>{challenge.difficulty.toUpperCase()}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginLeft: 'auto' }}>
                                {challenge.testCases.filter(t => !t.hidden).length} visible / {challenge.testCases.filter(t => t.hidden).length} hidden tests
                            </span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>
                            {challenge.description}
                        </p>
                    </div>
                )}

                {/* Evaluating banner */}
                {submitting && (
                    <div style={{
                        padding: '10px 16px', borderRadius: '10px', marginBottom: '12px', flexShrink: 0,
                        background: 'rgba(0,240,255,0.08)', border: '1px solid rgba(0,240,255,0.3)',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}>
                        <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: '#00f0ff', boxShadow: '0 0 8px #00f0ff',
                        }} />
                        <span style={{ color: '#00f0ff', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Code Submitted — Evaluating against test cases...
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginLeft: 'auto' }}>
                            AI changes won't affect your submission
                        </span>
                    </div>
                )}

                {/* Editor */}
                <div style={{
                    flex: 1, background: 'rgba(10,10,20,0.85)', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minHeight: 0,
                }}>
                    <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
                </div>
            </div>

            {/* AI Impostor Log (right side) */}
            <div style={{
                width: '260px', flexShrink: 0, background: 'rgba(10,10,20,0.85)',
                borderLeft: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                margin: '12px 12px 12px 0', padding: '16px', display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <h3 style={{ color: '#ff3131', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>
                    <Skull size={16} /> AI IMPOSTOR LOG
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {aiLog.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', textAlign: 'center', marginTop: '24px' }}>
                            The AI Impostor is watching... 👀
                        </p>
                    ) : (
                        aiLog.map((log, i) => (
                            <div key={i} style={{
                                padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,49,49,0.06)',
                                border: '1px solid rgba(255,49,49,0.15)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)',
                            }}>{log}</div>
                        ))
                    )}
                </div>
            </div>

            {/* Result Modal */}
            {showResult && resultData && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div style={{
                        background: '#12121f', border: `2px solid ${resultData.passed ? '#39ff14' : '#ff3131'}`,
                        borderRadius: '20px', padding: '32px', width: '90%', maxWidth: '480px', position: 'relative',
                    }}>
                        <button onClick={() => setShowResult(false)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                        {resultData.passed ? (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <Trophy size={48} color="#39ff14" style={{ marginBottom: '8px' }} />
                                <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#39ff14', fontFamily: "'Nunito', sans-serif", textShadow: '0 0 30px rgba(57,255,20,0.5)' }}>YOU WON!</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>All {resultData.totalTests} test cases passed! 🎉</p>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <XCircle size={48} color="#ff3131" style={{ marginBottom: '8px' }} />
                                <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#ff3131', fontFamily: "'Nunito', sans-serif" }}>WRONG SUBMISSION</h2>
                                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>Passed {resultData.passedCount} / {resultData.totalTests} test cases</p>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {resultData.results.map(r => (
                                <div key={r.testCase} style={{
                                    padding: '8px 12px', borderRadius: '8px',
                                    background: r.passed ? 'rgba(57,255,20,0.06)' : 'rgba(255,49,49,0.06)',
                                    border: `1px solid ${r.passed ? 'rgba(57,255,20,0.2)' : 'rgba(255,49,49,0.2)'}`,
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                }}>
                                    {r.passed ? <CheckCircle size={16} color="#39ff14" /> : <XCircle size={16} color="#ff3131" />}
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'white' }}>
                                        Test {r.testCase} {r.isHidden && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>(Hidden)</span>}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: r.passed ? '#39ff14' : '#ff3131', marginLeft: 'auto' }}>{r.status}</span>
                                </div>
                            ))}
                        </div>

                        {/* Show details of first failed visible test */}
                        {!resultData.passed && (() => {
                            const firstFail = resultData.results.find(r => !r.passed && !r.isHidden && r.input);
                            if (!firstFail) return null;
                            return (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6,
                                }}>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                        FAILED ON TEST CASE {firstFail.testCase}:
                                    </div>
                                    <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Input: </span><span style={{ color: 'white' }}>{firstFail.input}</span></div>
                                    <div><span style={{ color: '#ff3131' }}>Expected: </span><span style={{ color: 'white' }}>{firstFail.expected}</span></div>
                                    <div><span style={{ color: '#ff9800' }}>Got: </span><span style={{ color: 'white' }}>{firstFail.got}</span></div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Toast animation CSS */}
            <style>{`
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default MockPlay;

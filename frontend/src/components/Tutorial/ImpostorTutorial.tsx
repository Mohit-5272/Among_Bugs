import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Skull, AlertCircle, Delete, Type, ChevronRight, Bug, Code2, Braces, Hash, Parentheses, Variable } from 'lucide-react';

const SAMPLE_CODE = `#include <iostream>
using namespace std;

int main() {
    int arr[] = {5, 3, 8, 1, 9};
    int n = 5;
    int maxVal = arr[0];

    for (int i = 1; i < n; i++) {
        if (arr[i] > maxVal) {
            maxVal = arr[i];
        }
    }

    cout << "Max: " << maxVal << endl;
    return 0;
}`;

interface SabotageOption {
    id: string;
    label: string;
    icon: typeof AlertCircle;
    color: string;
    description: string;
    apply: (code: string) => string;
}

// Full pool of sabotage options — each can only be used once
const ALL_SABOTAGES: SabotageOption[] = [
    {
        id: 'INVERT_BOOLEAN',
        label: 'Invert Boolean',
        icon: AlertCircle,
        color: '#ff9800',
        description: 'Changes > to < on a comparison',
        apply: (code) => code.replace('arr[i] > maxVal', 'arr[i] < maxVal'),
    },
    {
        id: 'DELETE_SEMICOLON',
        label: 'Delete Semicolon',
        icon: Delete,
        color: '#00f0ff',
        description: 'Removes a semicolon from a critical line',
        apply: (code) => code.replace('cout << "Max: " << maxVal << endl;', 'cout << "Max: " << maxVal << endl'),
    },
    {
        id: 'RENAME_VAR',
        label: 'Subtle Mistypo',
        icon: Type,
        color: '#39ff14',
        description: 'Renames maxVal to maxVa1 (1 instead of l)',
        apply: (code) => code.replace(/maxVal/g, 'maxVa1'),
    },
    {
        id: 'OFF_BY_ONE',
        label: 'Off-By-One',
        icon: Hash,
        color: '#b051ff',
        description: 'Changes i = 1 to i = 0 in the loop',
        apply: (code) => code.replace('int i = 1; i < n', 'int i = 0; i < n'),
    },
    {
        id: 'WRONG_ARRAY_SIZE',
        label: 'Array Overflow',
        icon: Bug,
        color: '#ff3131',
        description: 'Changes n = 5 to n = 6 causing overflow',
        apply: (code) => code.replace('int n = 5;', 'int n = 6;'),
    },
    {
        id: 'SWAP_ASSIGNMENT',
        label: 'Swap Assignment',
        icon: Code2,
        color: '#e91e63',
        description: 'Changes = to == in the assignment',
        apply: (code) => code.replace('maxVal = arr[i];', 'maxVal == arr[i];'),
    },
    {
        id: 'REMOVE_INCLUDE',
        label: 'Remove Include',
        icon: Braces,
        color: '#ffeb3b',
        description: 'Deletes the #include <iostream> line',
        apply: (code) => code.replace('#include <iostream>\n', ''),
    },
    {
        id: 'BREAK_BRACES',
        label: 'Break Braces',
        icon: Parentheses,
        color: '#4caf50',
        description: 'Removes a closing brace from the if block',
        apply: (code) => {
            const lines = code.split('\n');
            // Remove the closing brace of the if block (line index 15 -> "        }")
            const idx = lines.findIndex((l, i) => i > 13 && l.trim() === '}');
            if (idx !== -1) lines.splice(idx, 1);
            return lines.join('\n');
        },
    },
    {
        id: 'CHANGE_RETURN',
        label: 'Wrong Return',
        icon: Variable,
        color: '#ff6f00',
        description: 'Changes return 0 to return 1',
        apply: (code) => code.replace('return 0;', 'return 1;'),
    },
];

const VISIBLE_COUNT = 3; // Show 3 options at a time

const GUIDE_STEPS = [
    { title: 'Welcome, Impostor!', text: 'Your job is to secretly sabotage the code without getting caught. Let\'s learn how.' },
    { title: 'The Sabotage Panel', text: 'On the right you\'ll see your toolkit. Each button performs a specific, subtle code change.' },
    { title: 'Try It!', text: 'Click any sabotage button to see how it modifies the code. Each sabotage can only be used once — new options will appear!' },
    { title: 'Cooldown System', text: 'After each sabotage, your abilities go on a 10-second cooldown. Use them wisely!' },
];

const ImpostorTutorial = () => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [guideStep, setGuideStep] = useState(0);
    const [cooldown, setCooldown] = useState(0);
    const [usedIds, setUsedIds] = useState<Set<string>>(new Set());

    // Get the remaining (unused) options, show only VISIBLE_COUNT at a time
    const availableOptions = ALL_SABOTAGES.filter((s) => !usedIds.has(s.id));
    const visibleOptions = availableOptions.slice(0, VISIBLE_COUNT);

    useEffect(() => {
        if (!editorRef.current) return;

        const editor = monaco.editor.create(editorRef.current, {
            value: SAMPLE_CODE,
            language: 'cpp',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 15,
            padding: { top: 16 },
            readOnly: true,
            scrollbar: { verticalScrollbarSize: 8 },
        });

        editorInstance.current = editor;
        return () => editor.dispose();
    }, []);

    const handleSabotage = (sab: SabotageOption) => {
        if (cooldown > 0 || !editorInstance.current) return;

        const model = editorInstance.current.getModel();
        if (!model) return;

        // Apply sabotage
        editorInstance.current.updateOptions({ readOnly: false });
        const currentCode = model.getValue();
        const newCode = sab.apply(currentCode);
        model.setValue(newCode);
        editorInstance.current.updateOptions({ readOnly: true });

        // Mark as used — this causes the list to refresh with new options
        setUsedIds((prev) => new Set(prev).add(sab.id));

        // Start cooldown
        setCooldown(10);
        if (guideStep === 2) setGuideStep(3);

        const interval = setInterval(() => {
            setCooldown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
            {/* Guide Overlay */}
            {guideStep < GUIDE_STEPS.length && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: guideStep < 2 ? 'rgba(0,0,0,0.75)' : 'transparent',
                    zIndex: guideStep < 2 ? 300 : -1,
                    display: guideStep < 2 ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: guideStep < 2 ? 'auto' : 'none',
                }}>
                    <div style={{
                        background: '#1a1a2e',
                        border: '2px solid rgba(255,49,49,0.5)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '450px',
                        width: '90%',
                    }}>
                        <h3 style={{ color: '#ff3131', marginBottom: '12px', fontSize: '1.25rem' }}>
                            {GUIDE_STEPS[guideStep].title}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '24px' }}>
                            {GUIDE_STEPS[guideStep].text}
                        </p>
                        <button
                            onClick={() => setGuideStep((s) => s + 1)}
                            style={{
                                padding: '10px 24px',
                                background: '#ff3131',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            {guideStep < GUIDE_STEPS.length - 1 ? 'Next' : 'Got it!'} <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Guide step indicator for steps 2+ */}
            {guideStep >= 2 && guideStep < GUIDE_STEPS.length && (
                <div style={{
                    position: 'absolute',
                    top: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255,49,49,0.15)',
                    border: '1px solid rgba(255,49,49,0.4)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    zIndex: 200,
                    color: 'white',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    maxWidth: '400px',
                }}>
                    <strong style={{ color: '#ff3131' }}>{GUIDE_STEPS[guideStep].title}:</strong>{' '}
                    {GUIDE_STEPS[guideStep].text}
                    {guideStep === 3 && (
                        <button
                            onClick={() => setGuideStep(GUIDE_STEPS.length)}
                            style={{ marginLeft: '12px', padding: '4px 12px', background: '#ff3131', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                        >
                            Done
                        </button>
                    )}
                </div>
            )}

            {/* Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <div style={{
                    padding: '12px 20px',
                    background: 'rgba(255,49,49,0.08)',
                    borderBottom: '1px solid rgba(255,49,49,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    <span style={{ color: '#ff3131', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        🕵️ Impostor Tutorial
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                        Learn to sabotage without getting caught!
                    </span>
                </div>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1 }}>
                <div ref={editorRef} style={{ height: '100%', width: '100%', paddingTop: '48px' }} />
            </div>

            {/* Sabotage Panel */}
            <div style={{
                width: '280px',
                background: 'rgba(10,10,15,0.95)',
                borderLeft: '1px solid rgba(255,49,49,0.2)',
                padding: '16px',
                paddingTop: '60px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
            }}>
                <h3 style={{ color: '#ff3131', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Skull size={18} /> SABOTAGE TOOLKIT
                </h3>

                {visibleOptions.length === 0 ? (
                    <div style={{
                        padding: '24px 16px',
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                    }}>
                        All sabotages used! 🎉
                    </div>
                ) : (
                    visibleOptions.map((sab) => {
                        const Icon = sab.icon;
                        return (
                            <button
                                key={sab.id}
                                onClick={() => handleSabotage(sab)}
                                disabled={cooldown > 0}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '12px 14px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${cooldown > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,49,49,0.3)'}`,
                                    borderRadius: '10px',
                                    color: cooldown > 0 ? 'rgba(255,255,255,0.3)' : 'white',
                                    cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    textAlign: 'left',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <Icon size={18} color={cooldown > 0 ? '#555' : sab.color} />
                                <div>
                                    <div>{sab.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{sab.description}</div>
                                </div>
                            </button>
                        );
                    })
                )}

                {/* Used counter */}
                <div style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.3)',
                    textAlign: 'center',
                }}>
                    {usedIds.size} / {ALL_SABOTAGES.length} sabotages used
                </div>

                {/* Cooldown Indicator */}
                {cooldown > 0 && (
                    <div style={{
                        marginTop: 'auto',
                        textAlign: 'center',
                        padding: '16px',
                        background: 'rgba(255,49,49,0.1)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,49,49,0.3)',
                    }}>
                        <div style={{ color: '#ff3131', fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace' }}>{cooldown}s</div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Cooldown</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImpostorTutorial;

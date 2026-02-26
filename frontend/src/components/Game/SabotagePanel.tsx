import { useState, useMemo } from 'react';
import { Skull, AlertCircle, Delete, Type, Bug, Hash, Code2, Braces } from 'lucide-react';

interface SabotageDef {
    id: string;
    label: string;
    icon: typeof AlertCircle;
    color: string;
    description: string;
    /** Check if this sabotage is applicable to the given code */
    isApplicable: (code: string) => boolean;
    /** Apply the sabotage — returns modified code */
    apply: (code: string) => string;
}

const ALL_SABOTAGES: SabotageDef[] = [
    {
        id: 'INVERT_COMPARISON',
        label: 'Invert Comparison',
        icon: AlertCircle,
        color: '#ff9800',
        description: 'Flips a > to < or < to >',
        isApplicable: (code) => /[^<>!]=?\s*(>|<)\s*[^<>=]/.test(code) && (code.includes(' > ') || code.includes(' < ')),
        apply: (code) => {
            // Find the first standalone > or < in a comparison (not << or >> or <=)
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('cout') || lines[i].includes('cin') || lines[i].includes('#include')) continue;
                if (lines[i].includes(' > ')) {
                    lines[i] = lines[i].replace(' > ', ' < ');
                    return lines.join('\n');
                }
                if (lines[i].includes(' < ') && !lines[i].includes('<<')) {
                    lines[i] = lines[i].replace(' < ', ' > ');
                    return lines.join('\n');
                }
            }
            return code;
        },
    },
    {
        id: 'DELETE_SEMICOLON',
        label: 'Delete Semicolon',
        icon: Delete,
        color: '#00f0ff',
        description: 'Removes a semicolon from a statement',
        isApplicable: (code) => {
            const lines = code.split('\n');
            return lines.some(l => l.trim().endsWith(';') && !l.includes('#include') && l.trim().length > 3);
        },
        apply: (code) => {
            const lines = code.split('\n');
            // Find a non-trivial line ending with ; (skip includes, empty)
            const candidates = lines
                .map((l, i) => ({ line: l, idx: i }))
                .filter(({ line }) => line.trim().endsWith(';') && !line.includes('#include') && !line.includes('using ') && line.trim().length > 5);
            if (candidates.length === 0) return code;
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            lines[target.idx] = lines[target.idx].replace(/;(\s*)$/, '$1');
            return lines.join('\n');
        },
    },
    {
        id: 'OFF_BY_ONE',
        label: 'Off-By-One',
        icon: Hash,
        color: '#b051ff',
        description: 'Changes a loop bound (< to <=, or i=0 to i=1)',
        isApplicable: (code) => /for\s*\(/.test(code),
        apply: (code) => {
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('for') && lines[i].includes('< ')) {
                    lines[i] = lines[i].replace('< ', '<= ');
                    return lines.join('\n');
                }
            }
            // Try changing i = 0 to i = 1
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('for') && lines[i].includes('= 0')) {
                    lines[i] = lines[i].replace('= 0', '= 1');
                    return lines.join('\n');
                }
            }
            return code;
        },
    },
    {
        id: 'SWAP_OPERATOR',
        label: 'Swap Operator',
        icon: Code2,
        color: '#e91e63',
        description: 'Changes + to - or - to + in an expression',
        isApplicable: (code) => {
            const lines = code.split('\n');
            return lines.some(l => !l.includes('#include') && !l.includes('cout') && !l.includes('cin') && (/ \+ /.test(l) || / - /.test(l)));
        },
        apply: (code) => {
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('#include') || lines[i].includes('cout') || lines[i].includes('cin')) continue;
                if (lines[i].includes(' + ')) {
                    lines[i] = lines[i].replace(' + ', ' - ');
                    return lines.join('\n');
                }
                if (lines[i].includes(' - ') && !lines[i].startsWith('//')) {
                    lines[i] = lines[i].replace(' - ', ' + ');
                    return lines.join('\n');
                }
            }
            return code;
        },
    },
    {
        id: 'RENAME_VAR',
        label: 'Subtle Mistypo',
        icon: Type,
        color: '#39ff14',
        description: 'Renames a variable with a near-identical name',
        isApplicable: (code) => {
            // Look for variable names with 'l' that can be swapped to '1', or 'o' to '0'
            const varPattern = /\b\w*[liLoO]\w*\b/;
            const lines = code.split('\n').filter(l => !l.includes('#include') && !l.includes('cout') && !l.includes('cin'));
            return lines.some(l => varPattern.test(l));
        },
        apply: (code) => {
            // Find a variable name and swap l→1, or I→l
            const varMatches = code.match(/\b(\w{3,})\b/g);
            if (!varMatches) return code;
            // Find variables used more than once (so change is subtle)
            const counts: Record<string, number> = {};
            for (const v of varMatches) {
                if (['int', 'for', 'return', 'void', 'include', 'iostream', 'using', 'namespace', 'std', 'cout', 'cin', 'endl', 'main', 'string', 'nullptr', 'while', 'true', 'false', 'nullptr', 'char', 'bool', 'double', 'float', 'long', 'size', 'push_back', 'vector', 'queue', 'unordered_map'].includes(v)) continue;
                counts[v] = (counts[v] || 0) + 1;
            }
            const candidates = Object.entries(counts).filter(([, c]) => c >= 2).map(([v]) => v);
            if (candidates.length === 0) return code;
            const target = candidates[0];
            let typo = target;
            if (target.includes('l')) typo = target.replace('l', '1');
            else if (target.includes('a')) typo = target.replace('a', 'o');
            else typo = target.substring(0, target.length - 1); // drop last char
            if (typo === target) return code;
            // Only replace SOME occurrences (first half)
            let count = 0;
            const total = (code.match(new RegExp(`\\b${target}\\b`, 'g')) || []).length;
            const replaceCount = Math.max(1, Math.floor(total / 2));
            return code.replace(new RegExp(`\\b${target}\\b`, 'g'), (match) => {
                count++;
                return count <= replaceCount ? typo : match;
            });
        },
    },
    {
        id: 'REMOVE_BRACES',
        label: 'Remove a Brace',
        icon: Braces,
        color: '#4caf50',
        description: 'Removes a closing } from an if/for block',
        isApplicable: (code) => {
            const braceCount = (code.match(/}/g) || []).length;
            return braceCount >= 3; // at least main + one block
        },
        apply: (code) => {
            const lines = code.split('\n');
            // Find closing braces that belong to if/for blocks (not main)
            const candidates: number[] = [];
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim() === '}' && i > 2 && i < lines.length - 2) {
                    candidates.push(i);
                }
            }
            if (candidates.length > 1) {
                // Remove the first non-main closing brace
                lines.splice(candidates[0], 1);
            }
            return lines.join('\n');
        },
    },
    {
        id: 'WRONG_RETURN',
        label: 'Wrong Return',
        icon: Bug,
        color: '#ff6f00',
        description: 'Changes return 0 to return 1 or vice versa',
        isApplicable: (code) => code.includes('return 0;') || code.includes('return 1;'),
        apply: (code) => {
            if (code.includes('return 0;')) return code.replace('return 0;', 'return 1;');
            return code.replace('return 1;', 'return 0;');
        },
    },
];

const VISIBLE_COUNT = 3;

interface SabotagePanelProps {
    getCode: () => string;
    setCode: (code: string) => void;
}

const SabotagePanel = ({ getCode, setCode }: SabotagePanelProps) => {
    const [cooldown, setCooldown] = useState(0);
    const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
    const [code, setLocalCode] = useState('');

    // Refresh code snapshot on each render when not on cooldown
    const currentCode = cooldown === 0 ? getCode() : code;

    // Filter to only sabotages applicable to the current code AND not yet used
    const applicableOptions = useMemo(() => {
        const c = currentCode || getCode();
        return ALL_SABOTAGES.filter(s => !usedIds.has(s.id) && s.isApplicable(c));
    }, [currentCode, usedIds, getCode]);

    const visibleOptions = applicableOptions.slice(0, VISIBLE_COUNT);

    const handleSabotage = (sab: SabotageDef) => {
        if (cooldown > 0) return;
        const current = getCode();
        const modified = sab.apply(current);
        setCode(modified);
        setLocalCode(modified);
        setUsedIds(prev => new Set(prev).add(sab.id));

        setCooldown(10);
        const interval = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <div style={{
            position: 'fixed', right: '24px', bottom: '24px', zIndex: 50,
            width: '280px',
        }}>
            <div style={{
                background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,49,49,0.3)', borderRadius: '16px',
                padding: '16px', position: 'relative', overflow: 'hidden',
            }}>
                <h3 style={{ color: '#ff3131', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,49,49,0.2)' }}>
                    <Skull size={18} /> SABOTAGE TOOLKIT
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visibleOptions.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                            {usedIds.size === ALL_SABOTAGES.length ? 'All sabotages used! 🎉' : 'No applicable sabotages for this code'}
                        </div>
                    ) : (
                        visibleOptions.map(sab => {
                            const Icon = sab.icon;
                            return (
                                <button
                                    key={sab.id}
                                    onClick={() => handleSabotage(sab)}
                                    disabled={cooldown > 0}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${cooldown > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,49,49,0.3)'}`,
                                        borderRadius: '10px', color: cooldown > 0 ? 'rgba(255,255,255,0.3)' : 'white',
                                        cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Icon size={16} color={cooldown > 0 ? '#555' : sab.color} />
                                    <div>
                                        <div>{sab.label}</div>
                                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{sab.description}</div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                    {usedIds.size} / {ALL_SABOTAGES.length} used
                </div>

                {/* Cooldown Overlay */}
                {cooldown > 0 && (
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', zIndex: 20, borderRadius: '16px',
                    }}>
                        <span style={{ color: '#ff3131', fontFamily: 'monospace', fontSize: '2.5rem', fontWeight: 900 }}>{cooldown}s</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>COOLDOWN</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SabotagePanel;

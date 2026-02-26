/**
 * Web Audio API sound effects for Among Bugs.
 * No external audio files needed — all sounds are synthesized.
 */

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

/** Short alarm buzz — used when AI sabotages code */
export function playSabotageSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
    } catch { /* silently fail if audio not supported */ }
}

/** Countdown beep — single tick for each second in the last 30s */
export function playCountdownBeep(secondsLeft: number) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        // Higher pitch and louder for last 10 seconds
        const freq = secondsLeft <= 10 ? 880 : 660;
        const vol = secondsLeft <= 10 ? 0.12 : 0.06;
        const dur = secondsLeft <= 10 ? 0.15 : 0.08;

        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
    } catch { /* silently fail */ }
}

/** Victory jingle — ascending arpeggio */
export function playVictorySound() {
    try {
        const ctx = getAudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            const startTime = ctx.currentTime + i * 0.12;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    } catch { /* silently fail */ }
}

/** Defeat/loss sound — descending notes */
export function playDefeatSound() {
    try {
        const ctx = getAudioCtx();
        const notes = [523.25, 392, 329.63, 261.63]; // C5, G4, E4, C4
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            const startTime = ctx.currentTime + i * 0.15;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.12, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    } catch { /* silently fail */ }
}

/** Freeze power-up sound — icy shimmer */
export function playFreezeSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch { /* silently fail */ }
}

/** Undo power-up sound — whoosh rewind */
export function playUndoSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch { /* silently fail */ }
}

/** Vote cast sound — click confirmation */
export function playVoteSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    } catch { /* silently fail */ }
}

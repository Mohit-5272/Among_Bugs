import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook that tracks keyboard + mouse activity over a target element.
 * Returns `isIdle: true` after `idleTimeoutMs` milliseconds of no activity.
 * Resets on any keydown, mousemove, or click inside the container.
 */
export function useIdleTimer(idleTimeoutMs: number = 40000) {
    const [isIdle, setIsIdle] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const resetTimer = useCallback(() => {
        setIsIdle(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setIsIdle(true);
        }, idleTimeoutMs);
    }, [idleTimeoutMs]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const events = ['keydown', 'mousemove', 'click', 'mousedown', 'touchstart'];
        events.forEach((event) => container.addEventListener(event, resetTimer));

        // Start the timer immediately
        resetTimer();

        return () => {
            events.forEach((event) => container.removeEventListener(event, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);

    const dismissIdle = useCallback(() => {
        setIsIdle(false);
        resetTimer();
    }, [resetTimer]);

    return { isIdle, containerRef, dismissIdle };
}

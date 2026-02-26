import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from './UserContext';

type ThemeMode = 'cyan' | 'red';

interface ThemeContextState {
    theme: ThemeMode;
    colors: typeof THEMES['cyan'];
}

const THEMES = {
    cyan: {
        accent: '#00f0ff',
        accentGlow: 'rgba(0,240,255,0.3)',
        accentBg: 'rgba(0,240,255,0.08)',
        accentBorder: 'rgba(0,240,255,0.2)',
        roleLabel: 'CIVILIAN',
        timerColor: '#ff9800',
        surface: 'rgba(10,10,20,0.85)',
        bgGradient: 'radial-gradient(circle at 30% 20%, rgba(0,240,255,0.04) 0%, transparent 50%)',
    },
    red: {
        accent: '#ff3131',
        accentGlow: 'rgba(255,49,49,0.3)',
        accentBg: 'rgba(255,49,49,0.08)',
        accentBorder: 'rgba(255,49,49,0.2)',
        roleLabel: 'IMPOSTOR',
        timerColor: '#ff3131',
        surface: 'rgba(15,5,5,0.9)',
        bgGradient: 'radial-gradient(circle at 70% 80%, rgba(255,49,49,0.06) 0%, transparent 50%)',
    },
};

const ThemeContext = createContext<ThemeContextState>({
    theme: 'cyan',
    colors: THEMES.cyan,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { player } = useUser();
    const [theme, setTheme] = useState<ThemeMode>('cyan');

    useEffect(() => {
        if (!player) { setTheme('cyan'); return; }
        setTheme(player.role === 'IMPOSTOR' ? 'red' : 'cyan');
    }, [player?.role]);

    // Apply CSS variables to document root
    useEffect(() => {
        const c = THEMES[theme];
        const root = document.documentElement;
        root.style.setProperty('--accent', c.accent);
        root.style.setProperty('--accent-glow', c.accentGlow);
        root.style.setProperty('--accent-bg', c.accentBg);
        root.style.setProperty('--accent-border', c.accentBorder);
        root.style.setProperty('--surface', c.surface);
        root.style.setProperty('--bg-gradient', c.bgGradient);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, colors: THEMES[theme] }}>
            {children}
        </ThemeContext.Provider>
    );
};

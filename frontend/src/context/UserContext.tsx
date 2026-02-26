import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'CIVILIAN' | 'IMPOSTOR' | 'UNASSIGNED';

export interface Player {
    playerId: string;
    username: string;
    role: Role;
    cursorColor: string;
    isReady: boolean;
}

interface UserContextState {
    player: Player | null;
    setPlayerInfo: (username: string) => void;
    mockAssignRole: (role: Role) => void; // For frontend testing
}

const UserContext = createContext<UserContextState>({
    player: null,
    setPlayerInfo: () => { },
    mockAssignRole: () => { },
});

export const useUser = () => useContext(UserContext);

const CURSOR_COLORS = ['#39ff14', '#00f0ff', '#ff3131', '#ff9800', '#b051ff'];

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [player, setPlayer] = useState<Player | null>(null);

    // Load from session storage if available to persist across reloads
    useEffect(() => {
        const saved = sessionStorage.getItem('among-bugs-player');
        if (saved) {
            setPlayer(JSON.parse(saved));
        }
    }, []);

    const setPlayerInfo = (username: string) => {
        const newPlayer: Player = {
            playerId: uuidv4(),
            username,
            role: 'UNASSIGNED',
            cursorColor: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
            isReady: false,
        };
        setPlayer(newPlayer);
        sessionStorage.setItem('among-bugs-player', JSON.stringify(newPlayer));
    };

    const mockAssignRole = (role: Role) => {
        if (!player) return;
        const updated = { ...player, role };
        setPlayer(updated);
        sessionStorage.setItem('among-bugs-player', JSON.stringify(updated));
    };

    return (
        <UserContext.Provider value={{ player, setPlayerInfo, mockAssignRole }}>
            {children}
        </UserContext.Provider>
    );
};

import { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const UserContext = createContext({
    player: null,
    setPlayerInfo: () => { },
    mockAssignRole: () => { },
});

export const useUser = () => useContext(UserContext);

const CURSOR_COLORS = ['#39ff14', '#00f0ff', '#ff3131', '#ff9800', '#b051ff'];

export const UserProvider = ({ children }) => {
    const [player, setPlayer] = useState(null);

    // Load from session storage if available to persist across reloads
    useEffect(() => {
        const saved = sessionStorage.getItem('among-bugs-player');
        if (saved) {
            setPlayer(JSON.parse(saved));
        }
    }, []);

    const setPlayerInfo = (username) => {
        const newPlayer = {
            playerId: uuidv4(),
            username,
            role: 'UNASSIGNED',
            cursorColor: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
            isReady: false,
        };
        setPlayer(newPlayer);
        sessionStorage.setItem('among-bugs-player', JSON.stringify(newPlayer));
    };

    const mockAssignRole = (role) => {
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

import { createContext, useContext, useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000';

const AuthContext = createContext({
    user: null,
    token: null,
    isLoading: true,
    signup: async () => ({}),
    login: async () => ({}),
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Auto-login from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('among-bugs-token');
        const savedUser = localStorage.getItem('among-bugs-user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
        setIsLoading(false);
    }, []);

    const persist = (t, u) => {
        setToken(t);
        setUser(u);
        localStorage.setItem('among-bugs-token', t);
        localStorage.setItem('among-bugs-user', JSON.stringify(u));
    };

    const signup = async (data) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const body = await res.json();
            if (!res.ok) return { error: body.error };
            persist(body.token, body.user);
            return {};
        } catch {
            return { error: 'Network error' };
        }
    };

    const login = async (username, password) => {
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const body = await res.json();
            if (!res.ok) return { error: body.error };
            persist(body.token, body.user);
            return {};
        } catch {
            return { error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('among-bugs-token');
        localStorage.removeItem('among-bugs-user');
        sessionStorage.removeItem('among-bugs-player');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, signup, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

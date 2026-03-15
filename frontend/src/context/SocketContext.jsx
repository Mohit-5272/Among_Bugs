import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// We mock the backend URL for now until it's built
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize standard WebSocket connection
    const socketInstance = io(SOCKET_URL, {
      autoConnect: true, // Auto-connect on initialization
      reconnection: true,
      transports: ['websocket', 'polling'], // Allow fallback to polling
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(socketInstance);

    // Don't disconnect on unmount - keep socket alive for navigation
    return () => {
      // socketInstance.disconnect(); // Commented out to keep socket alive
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

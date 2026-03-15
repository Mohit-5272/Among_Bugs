import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { UserProvider } from './context/UserContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import Login from './pages/Login';
import GameRoom from './pages/GameRoom';
import HowToPlay from './pages/HowToPlay';
import MockPlay from './pages/MockPlay';
import Lobby from './pages/Lobby';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] } },
};

const PageWrapper = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ height: '100%', width: '100%' }}>
    {children}
  </motion.div>
);

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PublicRoute><PageWrapper><Login /></PageWrapper></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><PageWrapper><Home /></PageWrapper></ProtectedRoute>} />
        <Route path="/how-to-play" element={<ProtectedRoute><PageWrapper><HowToPlay /></PageWrapper></ProtectedRoute>} />
        <Route path="/mock-play" element={<ProtectedRoute><PageWrapper><MockPlay /></PageWrapper></ProtectedRoute>} />
        <Route path="/lobby/:roomId" element={<ProtectedRoute><PageWrapper><Lobby /></PageWrapper></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute><PageWrapper><GameRoom /></PageWrapper></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <UserProvider>
        <ThemeProvider>
          <SocketProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </SocketProvider>
        </ThemeProvider>
      </UserProvider>
    </AuthProvider>
  );
};

export default App;

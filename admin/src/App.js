import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import ApiLogsPage from './pages/ApiLogsPage';
import MetricsPage from './pages/MetricsPage';
import BandwidthPage from './pages/BandwidthPage';
import CrashLogsPage from './pages/CrashLogsPage';
import BiosPage from './pages/BiosPage';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import { useActivityTracker } from './hooks/useActivityTracker';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      // Check if user has admin access
      const adminRoles = ['admin', 'super_admin', 'superadmin', 'manager', 'SUPER_ADMIN', 'ADMIN'];
      if (adminRoles.includes(parsedUser.role?.toLowerCase())) {
        setIsAuthenticated(true);
        setUser(parsedUser);
      }
    }
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Router>
      <AppContent user={user} onLogout={handleLogout} />
    </Router>
  );
}

// Separate component to use hooks inside Router context
function AppContent({ user, onLogout }) {
  // Enable activity tracking
  useActivityTracker();

  return (
    <Layout user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/activity" element={<ActivityLogsPage />} />
        <Route path="/api-logs" element={<ApiLogsPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/bandwidth" element={<BandwidthPage />} />
        <Route path="/crashes" element={<CrashLogsPage />} />
        <Route path="/bios" element={<BiosPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;

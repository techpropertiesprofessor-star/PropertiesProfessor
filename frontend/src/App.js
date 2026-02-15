import NotesPage from './pages/NotesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';
import React, { useEffect } from 'react';
import { unlockAudio } from './utils/sound';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './context/ProtectedRoute';
import { useActivityTracker } from './hooks/useActivityTracker';
import { NotificationToastProvider, useNotificationToast } from './context/NotificationToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import NotificationToastContainer from './components/NotificationToast';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './styles/NotificationToast.css';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import TasksPage from './pages/TasksPage';
import TaskDetailsPage from './pages/TaskDetailsPage';
import ChatPage from './pages/ChatPage';
import CallersPage from './pages/CallersPage';
import ProfilePage from './pages/ProfilePage';
import EmployeesPage from './pages/EmployeesPage';
import LeadsPage from './pages/LeadsPage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import LeaveRequestFormPage from './pages/LeaveRequestFormPage';
import InventoryPage from './pages/InventoryPage';
import ContentCalendarPage from './pages/ContentCalendarPage';
import PermissionsPage from './pages/PermissionsPage';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock, { once: true });
    return () => window.removeEventListener('click', unlock);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <NotificationToastProvider>
              <Router>
                <AppContent />
              </Router>
            </NotificationToastProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// AppContent component - enables activity tracking inside Router context
function AppContent() {
  useActivityTracker(); // Track all dashboard activities
  useRealtimeNotifications(); // Connect real-time notification toasts
  const { toasts, removeToast } = useNotificationToast();
  
  return (
    <>
      <PWAInstallPrompt />
      <NotificationToastContainer toasts={toasts} onRemove={removeToast} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><TaskDetailsPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/callers" element={<ProtectedRoute><CallersPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
        <Route path="/manager-dashboard" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute><LeaveRequestsPage /></ProtectedRoute>} />
        <Route path="/leaves/new" element={<ProtectedRoute><LeaveRequestFormPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><ContentCalendarPage /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><PermissionsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="/manager/analytics" element={<ProtectedRoute><ManagerAnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}

export default App;

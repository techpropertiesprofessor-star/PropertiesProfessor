import NotesPage from './pages/NotesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';
import React, { useEffect } from 'react';
import { unlockAudio } from './utils/sound';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './context/ProtectedRoute';
import { useActivityTracker } from './hooks/useActivityTracker';
import { NotificationToastProvider, useNotificationToast } from './context/NotificationToastContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import NotificationToastContainer from './components/NotificationToast';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ReminderPopup, { ReminderBadge } from './components/ReminderPopup';
import useReminderPopups from './hooks/useReminderPopups';
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
import { PermissionRoute } from './context/PermissionRoute';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  // Lock screen orientation to portrait on mobile
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const s = window.screen;
        if (s.orientation && s.orientation.lock) {
          await s.orientation.lock('portrait-primary');
        }
      } catch (e) {
        // Screen orientation lock not supported or not in fullscreen - handled by manifest + CSS overlay
      }
    };
    lockOrientation();
  }, []);

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
  const { user } = React.useContext(AuthContext);
  const { reminders, showPopup, reminderCount, dismissReminder, dismissAll, closePopup, openPopup } = useReminderPopups();
  
  return (
    <>
      <PWAInstallPrompt />
      <NotificationToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Reminder Warning Popups - only show when user is logged in */}
      {user && showPopup && (
        <ReminderPopup
          reminders={reminders}
          onDismiss={dismissReminder}
          onDismissAll={dismissAll}
          onClose={closePopup}
        />
      )}
      {user && !showPopup && <ReminderBadge count={reminderCount} onClick={openPopup} />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><PermissionRoute permission="Dashboard"><DashboardPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><PermissionRoute permission="Attendance"><AttendancePage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><PermissionRoute permission="Tasks"><TasksPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute><PermissionRoute permission="Tasks"><TaskDetailsPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><PermissionRoute permission="Team Chat"><ChatPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/callers" element={<ProtectedRoute><PermissionRoute permission="Caller"><CallersPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PermissionRoute permission="Profile"><ProfilePage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><PermissionRoute permission="Employees"><EmployeesPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/manager-dashboard" element={<ProtectedRoute><PermissionRoute permission="Dashboard"><ManagerDashboard /></PermissionRoute></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><PermissionRoute permission="Leads"><LeadsPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/leaves" element={<ProtectedRoute><PermissionRoute permission="Leave Request"><LeaveRequestsPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/leaves/new" element={<ProtectedRoute><PermissionRoute permission="Leave Request"><LeaveRequestFormPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute><PermissionRoute permission="Inventory"><InventoryPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><PermissionRoute permission="Calendar"><ContentCalendarPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute><PermissionRoute permission="Employees"><PermissionsPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><PermissionRoute permission="Notes"><NotesPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><PermissionRoute permission="Announcements"><AnnouncementsPage /></PermissionRoute></ProtectedRoute>} />
        <Route path="/manager/analytics" element={<ProtectedRoute><PermissionRoute permission="Dashboard"><ManagerAnalyticsDashboard /></PermissionRoute></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}

export default App;

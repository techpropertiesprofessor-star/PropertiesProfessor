
import React, { useContext, useState, useEffect, useCallback } from 'react';
import { playNotificationSound } from '../utils/sound';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CalendarWidget from '../components/CalendarWidget';
import { attendanceAPI, notificationAPI, taskAPI, userAPI, leadAPI, employeeAPI } from '../api/client';
import { format } from 'date-fns';
import UpcomingHolidaysCard from '../components/dashboard/UpcomingHolidaysCard';
import EventsCalendarWidget from '../components/EventsCalendarWidget';
import { usePermissions } from '../hooks/usePermissions';
import api from '../api/client';

function getLocalAnnouncements() {
  try {
    return JSON.parse(localStorage.getItem('announcements') || '[]');
  } catch {
    return [];
  }
}

// Simple toast/snackbar for feedback
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <div className="bg-gray-900 text-white px-4 py-2 rounded shadow-lg flex items-center">
        <span>{message}</span>
        <button className="ml-3 text-xs underline" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [remarkInputs, setRemarkInputs] = useState({});
  // Employees for assignment dropdown
  const [employees, setEmployees] = useState([]);
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeAPI.getAll();
        console.log('📋 Employees API Response:', res);
        if (Array.isArray(res.data)) {
          setEmployees(res.data);
          console.log('✅ Employees loaded:', res.data.length, res.data);
        } else if (res.data?.data && Array.isArray(res.data.data)) {
          setEmployees(res.data.data);
          console.log('✅ Employees loaded:', res.data.data.length, res.data.data);
        } else {
          setEmployees([]);
          console.log('⚠️ No employees data found');
        }
      } catch (err) {
        console.error('❌ Failed to load employees:', err);
        setEmployees([]);
      }
    };
    fetchEmployees();
  }, []);

  // Assign lead (same as LeadsPage)
  const assignLead = async (lead, employeeId) => {
  // If this is a normalized contact/website lead, auto-convert to Lead collection and assign
  if (lead.createdBy === 'website' && !lead.assignedTo) {
    try {
      const allowedSources = ['contact_form','schedule_visit','whatsapp','chatbot','manual','Friend'];
      let validSource = allowedSources.includes(lead.source) ? lead.source : 'contact_form';
      const newLeadRes = await leadAPI.create({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: validSource,
        remarks: lead.remarks,
        assignedTo: employeeId,
        status: 'assigned',
        createdBy: 'dashboard'
      });
      await leadAPI.assign(newLeadRes.data._id, employeeId);
      if (typeof fetchAssignedLeads === 'function') await fetchAssignedLeads();
    } catch (err) {
      alert('Failed to convert and assign lead');
    }
    return;
  }
  try {
    await leadAPI.assign(lead._id, employeeId);
    if (typeof fetchAssignedLeads === 'function') await fetchAssignedLeads();
  } catch (err) {
    alert('Failed to assign lead');
  }
};
  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  // Notifications panel state
  const [showNotifications, setShowNotifications] = useState(false);
  // Holidays and markedDates for holidays panel
  const [holidays, setHolidays] = useState([]);
  const [markedDates, setMarkedDates] = useState([]);

  // Load announcements from backend on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        setAnnouncements(res.data || []);
        localStorage.setItem('announcements', JSON.stringify(res.data || []));
      } catch {
        // fallback to localStorage if backend fails
        setAnnouncements(getLocalAnnouncements());
      }
    };
    fetchAnnouncements();
    // Optionally, poll every 30s for updates
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load holidays from backend
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await api.get('/holidays');
        setHolidays(res.data || []);
      } catch {
        setHolidays([]);
      }
    };
    fetchHolidays();
  }, []);

  // Load markedDates (all scheduled content)
  useEffect(() => {
    const fetchMarkedDates = async () => {
      try {
        const res = await api.get('/content-calendar/all');
        setMarkedDates(res.data || []);
      } catch {
        setMarkedDates([]);
      }
    };
    fetchMarkedDates();
  }, []);
    // Team members state (Employee collection)
    // const [employees, setEmployees] = useState([]); // Unused
    // User collection state
    const [userCount, setUserCount] = useState(0);
    // Fetch employees (removed, not used)
    // Fetch users from User collection
    const loadUsers = useCallback(async () => {
      try {
        console.log('🔄 Fetching users count...');
        const response = await userAPI.getAll();
        console.log('✅ User API response:', response);
        console.log('📊 Response data:', response.data);
        
        if (Array.isArray(response.data)) {
          console.log('✅ Setting user count:', response.data.length);
          setUserCount(response.data.length);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          console.log('✅ Setting user count from nested data:', response.data.data.length);
          setUserCount(response.data.data.length);
        } else {
          console.log('⚠️ Invalid response format, setting to 0');
          setUserCount(0);
        }
      } catch (err) {
        console.error('❌ Failed to load users in DashboardPage:', err, err?.response);
        setUserCount(0);
      }
    }, []);

  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canViewDashboard, loading } = usePermissions();

  // Load user count on mount (only for MANAGER)
  useEffect(() => {
    console.log('🎯 useEffect for loadUsers triggered');
    console.log('👤 Current user:', user);
    console.log('🔑 User role:', user?.role);
    
    if (user && user.role === 'MANAGER') {
      console.log('✅ User is MANAGER, calling loadUsers...');
      loadUsers();
    } else {
      console.log('⚠️ User is not MANAGER or user is null');
    }
  }, [user, loadUsers]);

  // const [checkedIn, setCheckedIn] = useState(false); // Unused
  // const [attendance, setAttendance] = useState(null); // Unused
  const [notifications, setNotifications] = useState([]);
  // Store all notification types (task, lead, important)
  const [allNotifications, setAllNotifications] = useState([]);
  // For real-time notification updates
  // const [socketInstance, setSocketInstance] = useState(null); // Unused
  const [tasks, setTasks] = useState([]);
  const [newTaskAlert, setNewTaskAlert] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveActionLoading, setLeaveActionLoading] = useState(''); // id of leave being processed
  const [toastMsg, setToastMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null, action: '', name: '' });
  const [assignedLeads, setAssignedLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]); // For manager to see all leads
  // Attendance counts for employee dashboard
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  // Fetch assigned leads from backend and filter for employee
  // Helper: filter leads for employee
  const filterLeadsForEmployee = (leadsArr, user) => {
    if (user && user.role === 'EMPLOYEE' && user.employeeId) {
      const empId = String(user.employeeId);
      return leadsArr.filter(l => {
        if (!l.assignedTo) return false;
        if (typeof l.assignedTo === 'object' && l.assignedTo._id) {
          return String(l.assignedTo._id) === empId;
        }
        return String(l.assignedTo) === empId;
      });
    }
    return leadsArr;
  };

// Fetch assigned leads + include website contacts for manager/employee views
const fetchAssignedLeads = useCallback(async () => {
  try {
    const response = await leadAPI.getAll({ page: 1, limit: 50 });

    // Normalize possible response shapes
    let leadsArr = [];
    if (Array.isArray(response.data)) leadsArr = response.data;
    else if (Array.isArray(response.data.leads)) leadsArr = response.data.leads;
    else if (Array.isArray(response.data.data)) leadsArr = response.data.data;

    // Normalize createdAt and sort newest first
    leadsArr = leadsArr.map(l => ({ ...l, createdAt: l.createdAt || l.created_at || null }));
    leadsArr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    setAllLeads(leadsArr);
    setAssignedLeads(filterLeadsForEmployee(leadsArr, user));
  } catch (err) {
    console.error('Failed to fetch leads for dashboard:', err);
    setAssignedLeads([]);
    setAllLeads([]);
  }
}, [user]);

useEffect(() => {
  fetchAssignedLeads();
}, [fetchAssignedLeads]);

  // Fetch attendance data for employee dashboard
  const loadAttendanceData = useCallback(async () => {
    if (!user || user.role !== 'EMPLOYEE') return;
    try {
      const response = await attendanceAPI.getHistory();
      const attendanceRecords = response.data || [];
      
      console.log('📊 Attendance records:', attendanceRecords);
      
      // Count present days (where checkIn exists)
      const present = attendanceRecords.filter(record => record.checkIn).length;
      setPresentCount(present);
      
      console.log('✅ Present count:', present);
      
      // Count absent days - you might need to calculate based on working days
      // For now, let's count days where no checkIn or explicitly marked absent
      const absent = attendanceRecords.filter(record => !record.checkIn || record.status === 'ABSENT').length;
      setAbsentCount(absent);
      
      console.log('❌ Absent count:', absent);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
      setPresentCount(0);
      setAbsentCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role === 'EMPLOYEE') {
      loadAttendanceData();
      // Refresh attendance data every 30 seconds for real-time updates
      const interval = setInterval(loadAttendanceData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadAttendanceData]);

  // Socket listener for real-time attendance updates
  useEffect(() => {
    if (!user || user.role !== 'EMPLOYEE') return;
    
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    
    // Identify user to join their room
    socket.emit('identify', user.id);
    
    // Listen for attendance updates
    socket.on('attendance-updated', (data) => {
      console.log('✅ Attendance updated via socket:', data);
      // Immediately refresh attendance data
      loadAttendanceData();
    });
    
    // Listen for real-time lead remarks updates
    socket.on('lead-remarks-updated', (data) => {
      console.log('📝 Lead remarks updated via socket:', data);
      // Update both assignedLeads and allLeads
      setAssignedLeads(prevLeads => 
        prevLeads.map(lead => 
          lead._id === data.leadId 
            ? { ...lead, remarks: data.remarks, updatedAt: data.updatedAt }
            : lead
        )
      );
      setAllLeads(prevLeads => 
        prevLeads.map(lead => 
          lead._id === data.leadId 
            ? { ...lead, remarks: data.remarks, updatedAt: data.updatedAt }
            : lead
        )
      );
    });
    
    return () => {
      socket.off('attendance-updated');
      socket.off('lead-remarks-updated');
      socket.disconnect();
    };
  }, [user, loadAttendanceData]);
  // Notification badge state
  // notificationCount persists until user visits relevant page
  const [notificationCount, setNotificationCount] = useState(0);
  // New message count for real-time badge
  const [newMessageCount, setNewMessageCount] = useState(0);
  // Individual counts by notification type
  const [leadsCount, setLeadsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [teamChatCount, setTeamChatCount] = useState(0);
  const [callersCount, setCallersCount] = useState(0);
  const [calendarCount, setCalendarCount] = useState(0);

  useEffect(() => {
    if (!loading && !canViewDashboard) {
      navigate('/');
    }
  }, [canViewDashboard, loading, navigate]);

  // Helper functions (removed loadAttendance, not used)

  // Load all notifications (task, lead, important)
  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationAPI.getAll();
      // Sort by createdAt descending, show latest 10
      const sorted = (response.data || []).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      setNotifications(sorted.slice(0, 5));
      setAllNotifications(sorted.slice(0, 10));
      // Load unread count
      const unreadCountRes = await notificationAPI.getUnreadCount();
      setNotificationCount(unreadCountRes.data?.count || 0);
      
      // Load counts by type for sidebar badges
      const countsByType = await notificationAPI.getCountsByType();
      if (countsByType.data) {
        setLeadsCount(countsByType.data.leads || 0);
        setTasksCount(countsByType.data.tasks || 0);
        setTeamChatCount(countsByType.data.teamChat || 0);
        setCallersCount(countsByType.data.callers || 0);
        setCalendarCount(countsByType.data.calendar || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const response = await taskAPI.getAll();
      let allTasks = response.data || [];
      
      // Filter tasks for employees - only show tasks assigned to them
      if (user && user.role === 'EMPLOYEE' && user.employeeId) {
        allTasks = allTasks.filter(task => {
          const assignedToId = typeof task.assignedTo === 'object' && task.assignedTo?._id 
            ? task.assignedTo._id 
            : task.assignedTo;
          return String(assignedToId) === String(user.employeeId);
        });
      }
      
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, [user]);

  const loadAllLeaveRequests = async () => {
    try {
      const response = await attendanceAPI.getAllLeaveRequests();
      setLeaveRequests(response.data);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    }
  };

  const handleApproveLeave = async (id) => {
    setLeaveActionLoading(id + '-approve');
    try {
      await attendanceAPI.approveLeave(id);
      setToastMsg('Leave approved successfully!');
      await loadAllLeaveRequests();
    } catch (err) {
      setToastMsg('Failed to approve leave.');
    } finally {
      setLeaveActionLoading('');
      setConfirmDialog({ open: false, id: null, action: '', name: '' });
    }
  };
  const handleRejectLeave = async (id) => {
    setLeaveActionLoading(id + '-reject');
    try {
      await attendanceAPI.rejectLeave(id);
      setToastMsg('Leave rejected.');
      await loadAllLeaveRequests();
    } catch (err) {
      setToastMsg('Failed to reject leave.');
    } finally {
      setLeaveActionLoading('');
      setConfirmDialog({ open: false, id: null, action: '', name: '' });
    }
  };

  // Only clear badge when user visits leads or notifications page
  const clearLeadsBadge = useCallback(() => {
    setNotificationCount(0);
  }, []);
  const clearNotificationsBadge = useCallback(() => {
    setNotificationCount(0);
  }, []);
  // Reset new message count when dropdown is opened
  const resetNewMessageCount = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  // Listen for notification read events and decrement count
  useEffect(() => {
    const handleNotificationRead = (event) => {
      setNotificationCount((c) => Math.max(0, c - 1));
      
      // Decrement the specific type count as well
      const notificationType = event.detail?.type;
      if (notificationType === 'lead-assigned') {
        setLeadsCount((c) => Math.max(0, c - 1));
      } else if (notificationType === 'TASK_ASSIGNED' || notificationType === 'TASK_STATUS_UPDATE') {
        setTasksCount((c) => Math.max(0, c - 1));
      } else if (notificationType === 'TEAM_CHAT' || notificationType === 'PRIVATE_MESSAGE') {
        setTeamChatCount((c) => Math.max(0, c - 1));
      } else if (notificationType === 'CALLER_ASSIGNED') {
        setCallersCount((c) => Math.max(0, c - 1));
      } else if (notificationType === 'calendar-event') {
        setCalendarCount((c) => Math.max(0, c - 1));
      }
    };
    window.addEventListener('notificationRead', handleNotificationRead);
    return () => window.removeEventListener('notificationRead', handleNotificationRead);
  }, []);

  useEffect(() => {
    // loadAttendance(); // Removed, not used
    loadNotifications();
    loadTasks();
    // loadEmployees(); // Removed, not used
    loadUsers();
    if (user?.role === 'manager' || user?.role === 'admin') {
      loadAllLeaveRequests();
    }

    // Connect to Socket.IO for real-time notifications and team updates
    const socketBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;
    const socket = io(socketBase, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    // setSocketInstance(socket); // Removed, not used

    socket.on('connect', () => {
      // Identify user for private notifications
      if (user?._id) socket.emit('identify', user._id);
    });

    // Helper to handle all notification types and play sound
    const handleNewNotification = (data) => {
      setNotificationCount((c) => c + 1);
      setNewMessageCount((c) => c + 1);
      
      // Increment specific type count based on notification type
      if (data.type === 'lead-assigned') {
        setLeadsCount((c) => c + 1);
      } else if (data.type === 'TASK_ASSIGNED' || data.type === 'TASK_STATUS_UPDATE') {
        setTasksCount((c) => c + 1);
      } else if (data.type === 'TEAM_CHAT' || data.type === 'PRIVATE_MESSAGE') {
        setTeamChatCount((c) => c + 1);
      } else if (data.type === 'CALLER_ASSIGNED') {
        setCallersCount((c) => c + 1);
      } else if (data.type === 'calendar-event') {
        setCalendarCount((c) => c + 1);
      } else if (data.type === 'ANNOUNCEMENT') {
        // Announcements don't have a specific badge, included in total count
        console.log('📢 New announcement notification received');
      }
      
      playNotificationSound();
      loadNotifications();
    };


    socket.on('taskAssigned', (data) => {
      console.log('📋 New task assigned, reloading tasks...');
      setNewTaskAlert({
        taskTitle: data.task?.title,
        taskDescription: data.task?.description,
        assignedBy: data.task?.assignedBy || '',
        assignedTo: data.task?.assignedTo || '',
        dueDate: data.task?.dueDate
      });
      handleNewNotification({ type: 'TASK_ASSIGNED', ...data });
      // Reload tasks immediately for real-time count update
      loadTasks();
      setTimeout(() => {
        setNewTaskAlert(null);
      }, 2000);
    });

    socket.on('new-lead', (data) => handleNewNotification({ type: 'LEAD', ...data }));
    socket.on('new-notification', (data) => {
      // Handle different notification types
      console.log('🔔 Received notification:', data.type, data);
      handleNewNotification(data);
      
      // Reload notification counts for real-time update in grid cards
      loadNotifications();
    });

    // Listen for task status updates (employee completing tasks)
    socket.on('taskStatusUpdated', (data) => {
      console.log('📋 Task status updated, reloading tasks...');
      loadTasks(); // Reload tasks to update Active Tasks count
      loadNotifications(); // Also reload notifications for manager
      handleNewNotification({ type: 'TASK_STATUS_UPDATE', ...data });
    });

    // Listen for leave approve/reject notifications
    socket.on('notification', (data) => {
      handleNewNotification({ type: 'IMPORTANT', ...data });
    });

    // Listen for announcement events (broadcast to all)
    socket.on('new-announcement', (data) => {
      console.log('📢 New announcement received:', data);
      // Notification already created in backend and sent via new-notification event
      // This is just for UI updates if needed
    });

    // Listen for real-time user additions (employee/user added)
    socket.on('user-added', (data) => {
      console.log('🔔 New user added:', data);
      if (user && user.role === 'MANAGER') {
        loadUsers(); // Reload user count for manager
      }
    });

    // Listen for real-time employee changes (optional, if backend emits these events)
    // socket.on('employee-updated', loadEmployees);
    // socket.on('employee-added', loadEmployees);
    // socket.on('employee-removed', loadEmployees);

    return () => {
      socket.disconnect();
    };
  }, [user, loadNotifications, loadUsers, loadTasks]);

  if (!canViewDashboard) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className="flex-1 flex flex-col">
          <Header user={user} onLogout={logout} />
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view the dashboard.</p>
              <p className="text-sm mt-3 text-red-600">Contact an administrator if you believe this is an error.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-yellow-50">
      <div className="hidden md:block"><Sidebar 
        notificationCount={notificationCount} 
        clearLeadsBadge={clearLeadsBadge}
        leadsCount={leadsCount}
        tasksCount={tasksCount}
        teamChatCount={teamChatCount}
        callersCount={callersCount}
        calendarCount={calendarCount}
      /></div>
      <div className="flex-1 flex flex-col">
        <Header
          user={user}
          onLogout={logout}
          notificationCount={notificationCount}
          clearNotificationsBadge={clearNotificationsBadge}
          onViewLead={(leadId) => {
            localStorage.setItem('viewLeadId', leadId);
            navigate('/leads');
          }}
          newMessageCount={newMessageCount}
          resetNewMessageCount={resetNewMessageCount}
          onNotificationClick={() => {}}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {/* Modern User Banner */}
          <div className="backdrop-blur-md bg-white/70 rounded-2xl shadow-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between border-b border-indigo-100 mb-8 mt-4 mx-2 md:mx-0">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-blue-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {user?.name?.[0] || user?.first_name?.[0] || 'U'}
              </div>
              <div>
                <span className="block font-extrabold text-2xl text-gray-900 mb-1 tracking-tight">Welcome, {user?.name || user?.first_name || 'User'}!</span>
                <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs uppercase font-semibold shadow">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 md:mt-0 px-8 py-2 relative rounded-full text-sm font-bold shadow-2xl transition-transform hover:scale-105 overflow-hidden group border-2 border-pink-300/40 hover:border-pink-400/80"
              style={{
                background: 'linear-gradient(135deg, rgba(244,63,94,0.7) 0%, rgba(236,72,153,0.7) 100%)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 24px 4px rgba(244,63,94,0.25), 0 2px 12px 0 rgba(236,72,153,0.15)'
              }}
            >
              <span className="relative z-10">Logout</span>
              <span className="absolute inset-0 rounded-full pointer-events-none group-hover:opacity-80 opacity-60" style={{background: 'linear-gradient(120deg, rgba(244,63,94,0.3) 0%, rgba(236,72,153,0.3) 100%)', filter: 'blur(8px)'}}></span>
            </button>
          </div>
          {/* Manager Dashboard */}
          {user?.role?.toUpperCase() === 'MANAGER' || user?.role?.toUpperCase() === 'ADMIN' ? (
            <div className="p-2 md:p-0">
              {/* New Task Alert */}
              {newTaskAlert && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl shadow-md animate-pulse">
                  <div className="flex items-start gap-3">
                    <svg className="h-6 w-6 text-green-600 mt-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-bold text-green-800 text-base mb-2">📋 New Task Assigned!</p>
                      <div className="text-sm text-gray-800 mb-1"><span className="font-semibold">Task:</span> {newTaskAlert.taskTitle}</div>
                      <div className="text-sm text-gray-700 mb-1"><span className="font-semibold">Description:</span> {newTaskAlert.taskDescription}</div>
                      <div className="text-sm text-gray-700 mb-1"><span className="font-semibold">Assigned By:</span> {newTaskAlert.assignedBy}</div>
                      <div className="text-sm text-gray-700 mb-1"><span className="font-semibold">Assigned To:</span> {newTaskAlert.assignedTo}</div>
                      <div className="text-sm text-gray-700"><span className="font-semibold">Due Date:</span> {newTaskAlert.dueDate ? new Date(newTaskAlert.dueDate).toLocaleDateString() : '--'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats - 4 cards in a row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div 
                  onClick={() => navigate('/tasks')}
                  className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer"
                  style={{background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(34,211,238,0.7) 100%)', backdropFilter: 'blur(12px)'}}
                >
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-300/40 group-hover:border-cyan-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(59,130,246,0.25), 0 2px 16px 0 rgba(34,211,238,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Active Tasks</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{tasks.filter(task => task.status !== 'COMPLETED').length}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Pending tasks</p>
                </div>
                <div 
                  onClick={() => navigate('/manager-dashboard')}
                  className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer"
                  style={{background: 'linear-gradient(135deg, rgba(34,197,94,0.7) 0%, rgba(20,184,166,0.7) 100%)', backdropFilter: 'blur(12px)'}}
                >
                  <div className="absolute inset-0 rounded-2xl border-2 border-emerald-300/40 group-hover:border-teal-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(34,197,94,0.25), 0 2px 16px 0 rgba(20,184,166,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Employee Stats</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{userCount}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">View Dashboard →</p>
                </div>
                <div 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer"
                  style={{background: 'linear-gradient(135deg, rgba(168,85,247,0.7) 0%, rgba(236,72,153,0.7) 100%)', backdropFilter: 'blur(12px)'}}
                >
                  <div className="absolute inset-0 rounded-2xl border-2 border-purple-300/40 group-hover:border-pink-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(168,85,247,0.25), 0 2px 16px 0 rgba(236,72,153,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Notifications</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{notificationCount}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Unread messages</p>
                </div>
                <div 
                  onClick={() => navigate('/attendance')}
                  className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer"
                  style={{background: 'linear-gradient(135deg, rgba(251,146,60,0.7) 0%, rgba(249,115,22,0.7) 100%)', backdropFilter: 'blur(12px)'}}
                >
                  <div className="absolute inset-0 rounded-2xl border-2 border-amber-300/40 group-hover:border-orange-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(251,146,60,0.25), 0 2px 16px 0 rgba(249,115,22,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">System Status</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">Active</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">All systems ok</p>
                </div>
              </div>

              {/* Recent Leads Section - Modern & Professional */}
              <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-2xl shadow-2xl p-5 mb-8 border border-indigo-200/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">Recent Leads</h2>
                      <p className="text-xs text-gray-500 font-medium">Latest customer inquiries</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/leads')}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold text-xs shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-1"
                  >
                    View All
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-lg bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">#</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Lead Details</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Contact</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Source</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Assigned</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Remarks</th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {(user?.role?.toUpperCase() === 'MANAGER' ? allLeads : assignedLeads).length === 0 ? (
                          <tr>
                            <td colSpan="8" className="px-4 py-8 text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <p className="text-gray-500 font-medium text-sm">No leads found</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          (user?.role?.toUpperCase() === 'MANAGER' ? allLeads : assignedLeads).slice(0, 6).map((lead, index) => (
                            <tr key={lead._id} className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 transition-all duration-200 group">
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold text-xs group-hover:scale-110 transition-transform">
                                  {index + 1}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                                    {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-gray-900 block">{lead.name}</span>
                                    <span className="text-xs text-gray-500">{lead.email || 'No email'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                  <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {lead.phone || '--'}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm">
                                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                                  </svg>
                                  {lead.source || '--'}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${
                                  lead.status === 'NEW' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                                  lead.status === 'CONTACTED' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                                  lead.status === 'QUALIFIED' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                                  lead.status === 'NEGOTIATION' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                                  lead.status === 'CLOSED' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' :
                                  lead.status === 'LOST' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' :
                                  'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                                }`}>
                                  {lead.status || 'ASSIGNED'}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    console.log('🔍 Lead assignedTo:', lead.assignedTo, 'Type:', typeof lead.assignedTo);
                                    console.log('📋 Available employees:', employees.length);
                                    
                                    const assignedToId = typeof lead.assignedTo === 'object' && lead.assignedTo?._id 
                                      ? lead.assignedTo._id 
                                      : lead.assignedTo;
                                    
                                    console.log('🎯 Looking for employee with ID:', assignedToId);
                                    
                                    const assignedEmployee = employees.find(e => {
                                      const match = String(e._id) === String(assignedToId);
                                      console.log(`  Checking employee ${e.name} (${e._id}): ${match}`);
                                      return match;
                                    });
                                    
                                    console.log('✅ Found employee:', assignedEmployee);
                                    
                                    const employeeName = assignedEmployee?.name || (typeof lead.assignedTo === 'object' && lead.assignedTo?.name) || 'Unassigned';
                                    
                                    return (
                                      <>
                                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-xs shadow">
                                          {employeeName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-900">
                                          {employeeName}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {lead.remarks ? (
                                  <span className="text-xs text-gray-600 line-clamp-1 italic">"{lead.remarks}"</span>
                                ) : (
                                  <span className="text-xs text-gray-400">--</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  onClick={() => navigate('/leads')}
                                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Confirmation Dialog */}
              {confirmDialog.open && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm mx-4 sm:mx-0">
                    <h3 className="font-bold mb-2 text-gray-900 text-lg">Confirm {confirmDialog.action === 'approve' ? 'Approval' : 'Rejection'}</h3>
                    <p className="mb-4 text-gray-700 text-sm">Are you sure you want to <span className="font-semibold">{confirmDialog.action}</span> this leave{confirmDialog.name ? ` for ${confirmDialog.name}` : ''}?</p>
                    <div className="flex justify-end space-x-2">
                      <button
                        className="px-3 py-1 rounded bg-gray-200 text-gray-800 text-xs"
                        onClick={() => setConfirmDialog({ open: false, id: null, action: '', name: '' })}
                        disabled={leaveActionLoading}
                      >Cancel</button>
                      <button
                        className={`px-3 py-1 rounded text-xs ${confirmDialog.action === 'approve' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                        onClick={() => confirmDialog.action === 'approve' ? handleApproveLeave(confirmDialog.id) : handleRejectLeave(confirmDialog.id)}
                        disabled={leaveActionLoading}
                      >
                        {leaveActionLoading ? (confirmDialog.action === 'approve' ? 'Approving...' : 'Rejecting...') : (confirmDialog.action === 'approve' ? 'Approve' : 'Reject')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toast/Snackbar */}
              <Toast message={toastMsg} onClose={() => setToastMsg('')} />

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Content (2/3) */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Quick Actions */}
                  <div className="bg-white/80 rounded-2xl shadow-xl p-8 mb-8 border border-indigo-100">
                    <h2 className="text-lg font-extrabold text-indigo-700 mb-4 flex items-center gap-2 tracking-tight">
                      <span role="img" aria-label="bolt">⚡</span> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => navigate('/tasks')}
                        className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white py-3 px-4 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <span className="text-xl">📋</span> Assign Tasks
                      </button>
                      <button
                        onClick={() => navigate('/employees')}
                        className="bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white py-3 px-4 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <span className="text-xl">👥</span> Team
                      </button>
                      <button
                        onClick={() => navigate('/leads')}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-4 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <span className="text-xl">📊</span> Leads
                      </button>
                      <button
                        onClick={() => navigate('/inventory')}
                        className="bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 text-white py-3 px-4 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <span className="text-xl">📦</span> Inventory
                      </button>
                    </div>
                  </div>

                  {/* Recent Notifications */}
                  <div className="bg-white/80 rounded-2xl shadow-xl p-8 border border-blue-100">
                    <h2 className="text-lg font-extrabold text-blue-700 mb-4 flex items-center gap-2 tracking-tight">
                      <span role="img" aria-label="bell">🔔</span> Recent Notifications
                    </h2>
                    {allNotifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications found.</div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50 pr-1">
                        {allNotifications.map((notif, idx) => (
                          <div
                            key={notif._id || notif.id || idx}
                            className="relative group bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 pl-5 pr-4 py-4 rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.025] transition-all duration-200 cursor-pointer flex items-start gap-3"
                            style={{ minHeight: '64px' }}
                          >
                            <div className="flex-shrink-0 flex flex-col items-center justify-center mt-0.5">
                              {notif.type === 'TEAM_CHAT' ? (
                                <span className="text-blue-500 text-lg">💬</span>
                              ) : notif.type?.toLowerCase().includes('leave') ? (
                                notif.title?.toLowerCase().includes('reject') ? (
                                  <span className="text-red-500 text-lg">❌</span>
                                ) : (
                                  <span className="text-green-500 text-lg">✅</span>
                                )
                              ) : notif.type === 'lead-assigned' ? (
                                <span className="text-purple-500 text-lg">📋</span>
                              ) : notif.type === 'TASK_ASSIGNED' ? (
                                <span className="text-indigo-500 text-lg">📝</span>
                              ) : (
                                <span className="text-blue-400 text-lg">🔔</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-bold text-xs ${notif.type === 'TEAM_CHAT' ? 'text-blue-700' : notif.title?.toLowerCase().includes('reject') ? 'text-red-600' : notif.title?.toLowerCase().includes('approve') ? 'text-green-600' : 'text-gray-900'}`}>{notif.title || notif.type || 'Notification'}</span>
                                {notif.type === 'TEAM_CHAT' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Chat</span>}
                                {notif.type === 'lead-assigned' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Lead</span>}
                                {notif.type === 'TASK_ASSIGNED' && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Task</span>}
                              </div>
                              <div className="text-gray-700 text-xs truncate mb-1" title={notif.message}>{notif.message}</div>
                              <div className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt || notif.created_at).toLocaleString()}</div>
                            </div>
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="inline-block bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">New</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Sidebar (1/3) */}
                <div className="space-y-8">
                  {/* Announcements Section for Manager Quick View */}
                  <div className="bg-white/80 rounded-xl shadow-lg p-5 border border-blue-100">
                    <h2 className="text-base font-extrabold text-blue-700 mb-3 flex items-center gap-2 tracking-tight">
                      <span role="img" aria-label="announcement" className="text-xl">📢</span> Announcements
                    </h2>
                    {announcements.length === 0 ? (
                      <div className="text-gray-500 text-xs text-center py-4">No announcements yet.</div>
                    ) : (
                      <ul className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
                        {announcements.map((a) => (
                          <li
                            key={a.id}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-2.5 flex flex-col shadow-sm hover:shadow-md hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
                          >
                            <span className="font-bold text-gray-900 text-sm leading-tight">{a.text}</span>
                            <span className="text-xs text-gray-500 mt-1 font-medium">{a.date}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Events Calendar Widget */}
                  <EventsCalendarWidget 
                    announcements={announcements}
                    holidays={holidays}
                  />
                  {/* Upcoming Holidays Panel */}
                  <UpcomingHolidaysCard holidays={holidays} markedDates={markedDates} />
                </div>
              </div>
            </div>
          ) : (
            /* Employee/Caller Dashboard */
            <div className="p-6">
              {/* New Task Alert */}
              {newTaskAlert && (
                <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded animate-pulse">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800 text-sm">📋 New Task Assigned!</p>
                      <p className="text-xs text-green-700">{newTaskAlert.taskTitle}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats - 4 cards for Employee view */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Holographic Cards */}
                <div onClick={() => navigate('/tasks')} className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer" style={{background: 'linear-gradient(135deg, rgba(34,245,170,0.7) 0%, rgba(34,197,94,0.7) 100%)', backdropFilter: 'blur(12px)'}}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-green-300/40 group-hover:border-green-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(34,245,170,0.25), 0 2px 16px 0 rgba(34,197,94,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Active Tasks</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Pending tasks</p>
                </div>
                <div onClick={() => setShowNotifications(!showNotifications)} className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer" style={{background: 'linear-gradient(135deg, rgba(168,85,247,0.7) 0%, rgba(236,72,153,0.7) 100%)', backdropFilter: 'blur(12px)'}}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-purple-300/40 group-hover:border-pink-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(168,85,247,0.25), 0 2px 16px 0 rgba(236,72,153,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Notifications</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{notificationCount}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Unread messages</p>
                </div>
                <div onClick={() => navigate('/attendance')} className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer" style={{background: 'linear-gradient(135deg, rgba(59,130,246,0.7) 0%, rgba(37,99,235,0.7) 100%)', backdropFilter: 'blur(12px)'}}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-300/40 group-hover:border-blue-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(59,130,246,0.25), 0 2px 16px 0 rgba(37,99,235,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Attendance</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{presentCount}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Total present</p>
                </div>
                <div onClick={() => navigate('/attendance')} className="relative rounded-2xl p-5 overflow-hidden shadow-2xl group transition-transform hover:scale-105 cursor-pointer" style={{background: 'linear-gradient(135deg, rgba(239,68,68,0.7) 0%, rgba(220,38,38,0.7) 100%)', backdropFilter: 'blur(12px)'}}>
                  <div className="absolute inset-0 rounded-2xl border-2 border-red-300/40 group-hover:border-red-400/80 pointer-events-none" style={{boxShadow: '0 0 32px 4px rgba(239,68,68,0.25), 0 2px 16px 0 rgba(220,38,38,0.15)'}}></div>
                  <p className="text-xs font-semibold opacity-90 mb-2 drop-shadow">Absent</p>
                  <p className="text-2xl font-extrabold tracking-tight drop-shadow-lg">{absentCount}</p>
                  <p className="text-xs opacity-80 mt-2 drop-shadow">Total absent</p>
                </div>
              </div>

              {/* Recent Leads Section - shows most recent leads regardless of assignment */}
              <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
                <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-purple-500 text-lg">📊</span> Recent Leads
                </h2>
                {(() => {
                  // Sort all leads by created date descending
                  let filteredLeads = [...assignedLeads];
                  if (user && user.role === 'EMPLOYEE' && user.employeeId) {
                    filteredLeads = filteredLeads.filter(l => l.assignedTo && (l.assignedTo._id === user.employeeId || l.assignedTo === user.employeeId));
                  }
                  const sortedLeads = filteredLeads.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
                  const leadsToShow = sortedLeads.slice(0, 5);
                  if (sortedLeads.length === 0) {
                    return <div className="text-xs text-gray-500">No leads found</div>;
                  }
                  return (
                    <div className="overflow-x-auto relative">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Phone</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Source</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                            {user && user.role !== 'EMPLOYEE' && (
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">Assigned To</th>
                            )}
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Remarks</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {leadsToShow.map((lead, idx) => (
                            <tr key={lead._id} className="hover:bg-purple-50 transition">
                              <td className="px-4 py-2 font-bold text-purple-500">{idx + 1}</td>
                              <td className="px-4 py-2 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                                  {lead.name ? lead.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                                </span>
                                <span className="font-medium text-gray-900">{lead.name}</span>
                              </td>
                              <td className="px-4 py-2 text-gray-700">{lead.phone}</td>
                              <td className="px-4 py-2">
                                <span className="inline-block px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-semibold">
                                  {lead.source || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${lead.status === 'New' ? 'bg-yellow-100 text-yellow-800' : lead.status === 'Contacted' ? 'bg-blue-100 text-blue-800' : lead.status === 'Closed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{lead.status}</span>
                              </td>
                              {user && user.role !== 'EMPLOYEE' && (
                                <td className="px-4 py-2">
                                  <select
                                    value={lead.assignedTo && typeof lead.assignedTo === 'object' ? lead.assignedTo._id : lead.assignedTo || ''}
                                    onChange={e => assignLead(lead, e.target.value)}
                                    className="border rounded px-2 py-1 text-xs"
                                  >
                                    <option value="">Unassigned</option>
                                    {employees.map(emp => (
                                      <option key={emp._id} value={emp._id}>
                                        {emp.name || (emp.first_name ? (emp.first_name + ' ' + (emp.last_name || '')) : emp.email || emp.phone)}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              )}
                              <td className="px-4 py-2">
                                {/* Remarks input for employee */}
                                {user && user.role === 'EMPLOYEE' ? (
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      try {
                                        const remarksValue = remarkInputs[lead._id] !== undefined 
                                          ? remarkInputs[lead._id] 
                                          : lead.remarks || '';
                                        await leadAPI.updateRemarks(lead._id, remarksValue);
                                        // Real-time update will be handled by Socket.IO
                                        setRemarkInputs(prev => ({ ...prev, [lead._id]: '' }));
                                      } catch (err) {
                                        alert('Failed to update remarks');
                                      }
                                    }}
                                  >
                                    <input
                                      type="text"
                                      className="border rounded px-2 py-1 text-xs w-32"
                                      placeholder="Add remarks"
                                      value={remarkInputs[lead._id] || lead.remarks || ''}
                                      onChange={e => setRemarkInputs(inputs => ({ ...inputs, [lead._id]: e.target.value }))}
                                    />
                                    <button type="submit" className="ml-1 px-2 py-1 bg-blue-500 text-white rounded text-xs">Save</button>
                                  </form>
                                ) : (
                                  <span>{lead.remarks || '-'}</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <button className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-1 rounded shadow font-semibold transition" onClick={() => navigate(`/leads?leadId=${lead._id}`)}>View</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end mt-2">
                        <button
                          className="text-xs text-purple-600 hover:text-pink-600 font-semibold underline"
                          onClick={() => navigate('/leads')}
                        >
                          See all leads
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Restored Dashboard Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Actions (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quick Actions */}
                  <div className="relative bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-indigo-100 overflow-hidden mb-8">
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{background: 'linear-gradient(120deg, rgba(99,102,241,0.08) 0%, rgba(236,72,153,0.07) 100%)', filter: 'blur(2px)'}}></div>
                    <h2 className="text-lg font-extrabold text-indigo-700 mb-6 flex items-center gap-2 tracking-tight relative z-10">
                      <span className="text-2xl">⚡</span> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <button
                        onClick={() => navigate('/tasks')}
                        className="group bg-gradient-to-br from-indigo-500/90 to-pink-500/80 hover:from-indigo-600 hover:to-pink-600 text-white py-2 px-1 rounded-lg shadow flex flex-col items-center gap-0.5 transition-transform hover:scale-105 border-2 border-transparent hover:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[60px]"
                      >
                        <span className="text-xl drop-shadow-lg">📋</span>
                        <span className="font-bold text-xs tracking-tight">Assign Tasks</span>
                      </button>
                      <button
                        onClick={() => navigate('/employees')}
                        className="group bg-gradient-to-br from-blue-500/90 to-cyan-400/80 hover:from-blue-600 hover:to-cyan-500 text-white py-2 px-1 rounded-lg shadow flex flex-col items-center gap-0.5 transition-transform hover:scale-105 border-2 border-transparent hover:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-[60px]"
                      >
                        <span className="text-xl drop-shadow-lg">👥</span>
                        <span className="font-bold text-xs tracking-tight">Team</span>
                      </button>
                      <button
                        onClick={() => navigate('/leads')}
                        className="group bg-gradient-to-br from-green-400/90 to-emerald-500/80 hover:from-green-500 hover:to-emerald-600 text-white py-2 px-1 rounded-lg shadow flex flex-col items-center gap-0.5 transition-transform hover:scale-105 border-2 border-transparent hover:border-green-400/60 focus:outline-none focus:ring-2 focus:ring-green-300 min-h-[60px]"
                      >
                        <span className="text-xl drop-shadow-lg">📊</span>
                        <span className="font-bold text-xs tracking-tight">Leads</span>
                      </button>
                      <button
                        onClick={() => navigate('/inventory')}
                        className="group bg-gradient-to-br from-orange-400/90 to-yellow-400/80 hover:from-orange-500 hover:to-yellow-500 text-white py-2 px-1 rounded-lg shadow flex flex-col items-center gap-0.5 transition-transform hover:scale-105 border-2 border-transparent hover:border-orange-400/60 focus:outline-none focus:ring-2 focus:ring-orange-300 min-h-[60px]"
                      >
                        <span className="text-xl drop-shadow-lg">📦</span>
                        <span className="font-bold text-xs tracking-tight">Inventory</span>
                      </button>
                    </div>
                  </div>

                  {/* Recent Notifications */}
                  <div className="relative bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-blue-100 overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{background: 'linear-gradient(120deg, rgba(59,130,246,0.08) 0%, rgba(236,72,153,0.07) 100%)', filter: 'blur(2px)'}}></div>
                    <h2 className="text-lg font-extrabold text-blue-700 mb-5 flex items-center gap-2 tracking-tight relative z-10">
                      <span className="text-2xl">🔔</span> Recent Notifications
                    </h2>
                    {allNotifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 relative z-10">No notifications found.</div>
                    ) : (
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1 relative z-10">
                        {allNotifications.map((notif, idx) => {
                          let icon = '🔔', iconColor = 'text-blue-500';
                          if ((notif.type || '').toLowerCase().includes('lead')) { icon = '📋'; iconColor = 'text-purple-500'; }
                          if ((notif.type || '').toLowerCase().includes('task')) { icon = '📝'; iconColor = 'text-indigo-500'; }
                          if ((notif.type || '').toLowerCase().includes('chat')) { icon = '💬'; iconColor = 'text-green-500'; }
                          if ((notif.type || '').toLowerCase().includes('reject')) { icon = '❌'; iconColor = 'text-red-500'; }
                          if ((notif.type || '').toLowerCase().includes('approve')) { icon = '✅'; iconColor = 'text-green-600'; }
                          return (
                            <div key={notif._id || notif.id || idx} className="flex items-start gap-3 bg-white/80 border border-blue-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-lg hover:scale-[1.025] transition-all duration-200 cursor-pointer">
                              <span className={`text-xl mt-1 ${iconColor}`}>{icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-xs text-blue-900 truncate">{notif.title || notif.type || 'Notification'}</span>
                                  {notif.type === 'TEAM_CHAT' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Chat</span>}
                                  {notif.type === 'lead-assigned' && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Lead</span>}
                                  {notif.type === 'TASK_ASSIGNED' && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full ml-1 font-semibold">Task</span>}
                                </div>
                                <div className="text-gray-700 text-xs truncate mb-1" title={notif.message}>{notif.message}</div>
                                <div className="text-xs text-gray-400 mt-1">{new Date(notif.createdAt || notif.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Announcements (1/3) */}
                <div className="space-y-6">
                  {/* Announcements Section */}
                  <div className="bg-white rounded-lg shadow-sm p-5">
                    <h2 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                      <span role="img" aria-label="announcement">📢</span> Announcements
                    </h2>
                    {announcements.length === 0 ? (
                      <div className="text-gray-500 text-sm">No announcements yet.</div>
                    ) : (
                      <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {announcements.map((a, idx) => (
                          <li
                            key={a.id}
                            className={`bg-blue-50 border border-blue-100 rounded px-4 py-2 flex flex-col ${idx > 2 ? 'opacity-80' : ''}`}
                            style={idx > 2 ? { fontSize: '0.95em' } : {}}
                          >
                            <span className="font-medium text-gray-900">{a.text}</span>
                            <span className="text-xs text-gray-500 mt-1">{a.date}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Events Calendar Widget */}
                  <EventsCalendarWidget 
                    announcements={announcements}
                    holidays={holidays}
                  />
                  {/* Upcoming Holidays Panel */}
                  <UpcomingHolidaysCard holidays={holidays} markedDates={markedDates} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

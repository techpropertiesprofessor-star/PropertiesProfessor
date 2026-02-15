import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { FiBell, FiZap, FiUser, FiLogOut, FiCheckCircle, FiCalendar, FiChevronDown, FiKey } from 'react-icons/fi';
import { notificationAPI } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useNotificationCounts } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

export default function Header({ user, onLogout, onSearch, notificationCount = 0, clearNotificationsBadge, onViewLead, onNotificationClick, newMessageCount = 0, resetNewMessageCount }) {
  // Live time/date/day state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Get theme from context
  const { theme, isDark, setTheme: changeTheme } = useTheme();
  
  // Get notification counts from centralized context
  const { totalUnread: contextUnreadCount, refreshCounts: refreshNotificationCounts } = useNotificationCounts();
  
  // Shared socket
  const { on, off, connected } = useSocket() || {};
  
  // Enhanced UI state - starts with checking status
  const [systemStatus, setSystemStatus] = useState('checking'); // 'online', 'offline', 'checking'
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState({
    messages: 0,
    tasks: 0,
    leads: 0,
    announcements: 0
  });
  
  const quickActionsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [announcementBanner, setAnnouncementBanner] = useState(null); // {title, message}

  // Live clock with IST timezone
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Enhanced system status monitoring - real-time based on user session and API
  useEffect(() => {
    // Set online immediately when user exists (logged in)
    if (user) {
      setSystemStatus('online');
    } else {
      setSystemStatus('offline');
    }
    
    const checkSystemHealth = async () => {
      try {
        const response = await axios.get('/api/bios/ping', { timeout: 3000 });
        if (response.status === 200 && response.data.success) {
          setSystemStatus('online');
        } else {
          setSystemStatus('offline');
        }
      } catch (error) {
        console.log('Health check failed:', error.message);
        setSystemStatus('offline');
      }
    };
    
    // Check immediately when component mounts
    checkSystemHealth();
    
    // Check every 10 seconds regardless of user login status
    const interval = setInterval(checkSystemHealth, 10000);
    return () => clearInterval(interval);
  }, []); // Remove user dependency
  
  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setShowQuickActions(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  // Enhanced quick actions handler - direct navigation and modals
  const handleQuickAction = (action) => {
    setShowQuickActions(false);
    switch (action) {
      case 'add-lead':
        // Direct navigation to leads page with add mode
        navigate('/leads?add=true');
        break;
      case 'add-task':
        // Direct navigation to tasks page with add mode
        navigate('/tasks?add=true');
        break;
      case 'add-inventory':
        // Direct navigation to inventory page with add mode
        navigate('/inventory?add=true');
        break;
      case 'add-caller':
        // Direct navigation to callers page with add mode
        navigate('/callers?add=true');
        break;
      default:
        break;
    }
  };
  
  // Change password handler - create inline modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const handleChangePassword = () => {
    setShowProfileMenu(false);
    setShowPasswordModal(true);
  };
  
  const handlePasswordSubmit = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    setPasswordLoading(true);
    try {
      const response = await axios.put('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        alert('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      // Mark all notifications as read via API
      const promises = notifications
        .filter(n => !n.read && !n.isRead)
        .map(n => notificationAPI.markAsRead(n._id || n.id).catch(() => {}));
      await Promise.all(promises);
      
      // Call existing handler if available
      if (clearNotificationsBadge) {
        clearNotificationsBadge();
      }
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setNotificationTypes({
        messages: 0,
        tasks: 0,
        leads: 0,
        announcements: 0
      });
      
      // Refresh centralized notification counts
      refreshNotificationCounts();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };
  
  // Get formatted IST time
  const getISTTime = () => {
    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return currentTime.toLocaleTimeString('en-IN', options);
  };
  
  // Get formatted IST date
  const getISTDate = () => {
    const options = {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return currentTime.toLocaleDateString('en-IN', options);
  };

  // Real-time notifications: fetch all and update on socket event
  const fetchNotifications = useCallback(() => {
    notificationAPI.getAll()
      .then(res => {
        const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
        setNotifications(sorted);
        const types = {
          messages: sorted.filter(n => n.type === 'TEAM_CHAT' && !n.isRead && !n.read).length,
          tasks: sorted.filter(n => (n.type === 'TASK_ASSIGNED' || n.type === 'TASK_STATUS_UPDATE') && !n.isRead && !n.read).length,
          leads: sorted.filter(n => (n.type === 'lead-assigned' || n.type === 'LEAD_ASSIGNED') && !n.isRead && !n.read).length,
          announcements: sorted.filter(n => n.type === 'announcement' && !n.isRead && !n.read).length
        };
        setNotificationTypes(types);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let interval;
    if (showDropdown) {
      setLoading(true);
      fetchNotifications();
      interval = setInterval(fetchNotifications, 5000);
      if (resetNewMessageCount) resetNewMessageCount();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showDropdown, resetNewMessageCount, fetchNotifications]);

  // Refresh notification list when shared socket fires new-notification
  useEffect(() => {
    if (!on || !off || !connected) return;
    const handler = () => {
      if (showDropdown) fetchNotifications();
    };
    on('new-notification', handler);
    return () => off('new-notification', handler);
  }, [on, off, connected, showDropdown, fetchNotifications]);

  // Play a short beep using WebAudio
  const playNotificationSound = (opts = {}) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = opts.type || 'sine';
      o.frequency.value = opts.freq || 880; // A5
      g.gain.value = opts.volume || 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        o.stop();
        try { ctx.close(); } catch (e) {}
      }, opts.duration || 120);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  // Global socket for sounds and announcement banners (using shared socket)
  useEffect(() => {
    if (!user || !on || !off || !connected) return;

    const handleChat = () => playNotificationSound({ freq: 900, duration: 140, volume: 0.06 });
    const handlePrivate = () => playNotificationSound({ freq: 760, duration: 160, volume: 0.07 });
    const handleLeadAssigned = () => playNotificationSound({ freq: 520, duration: 220, volume: 0.07 });
    const handleAnnouncement = () => {
      playNotificationSound({ freq: 700, duration: 180, volume: 0.08 });
      setTimeout(() => playNotificationSound({ freq: 880, duration: 120, volume: 0.06 }), 200);
    };
    const handleTaskAssigned = () => playNotificationSound({ freq: 600, duration: 200, volume: 0.07 });
    const handleNotification = () => playNotificationSound({ freq: 640, duration: 140, volume: 0.06 });
    const handleNewNotification = async () => {
      playNotificationSound({ freq: 640, duration: 140, volume: 0.06 });
      try {
        const res = await notificationAPI.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const latestAnnouncement = list.find(n => n.type === 'announcement');
        if (latestAnnouncement) {
          setAnnouncementBanner({
            title: latestAnnouncement.title || 'Announcement',
            message: latestAnnouncement.message || latestAnnouncement.body || ''
          });
          setTimeout(() => setAnnouncementBanner(null), 7000);
        }
      } catch (e) { /* ignore */ }
    };

    on('chat-message', handleChat);
    on('private-message', handlePrivate);
    on('lead-assigned', handleLeadAssigned);
    on('new-announcement', handleAnnouncement);
    on('taskAssigned', handleTaskAssigned);
    on('notification', handleNotification);
    on('new-notification', handleNewNotification);

    return () => {
      off('chat-message', handleChat);
      off('private-message', handlePrivate);
      off('lead-assigned', handleLeadAssigned);
      off('new-announcement', handleAnnouncement);
      off('taskAssigned', handleTaskAssigned);
      off('notification', handleNotification);
      off('new-notification', handleNewNotification);
    };
  }, [user, on, off, connected]);

  // Use centralized context count for the bell badge (always up-to-date)
  // The local notifications list is only used for the dropdown content
  const totalUnreadCount = contextUnreadCount;
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // Deduplicate notifications: only show one notification per sender/message combo (latest only)
  const sortedNotifications = notifications.slice().sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
  const uniqueNotificationsMap = new Map();
  for (const notif of sortedNotifications) {
    // Use senderName + message as a unique key
    const key = `${notif.senderName || 'System'}|${notif.message}`;
    if (!uniqueNotificationsMap.has(key)) {
      uniqueNotificationsMap.set(key, notif);
    }
  }
  const uniqueNotifications = Array.from(uniqueNotificationsMap.values());

  return (
    <>
      <header className="sticky top-0 z-40 flex-shrink-0 bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 shadow-sm border-b border-yellow-300">
        <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 sm:py-2.5">
        {/* Brand section with role badge */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
          {/* Mobile hamburger (left of role badge) - visible on small screens */}
          <div className="md:hidden">
            <button onClick={() => { setShowMobileSidebar(true); }} className="p-1.5 sm:p-2 rounded-md bg-white/50 hover:bg-white/80 text-gray-700" aria-label="Open menu">☰</button>
          </div>
          {/* Role Badge - moved to left corner */}
          <div className="group relative">
            <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border-2 cursor-default transition-all duration-200 ${
              user?.role === 'MANAGER' ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' :
              user?.role === 'ADMIN' ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' :
              'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
            }`}>
              {user?.role || 'Employee'}
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                Current Role: {user?.role || 'Employee'}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Middle section - empty for now */}
        <div className="hidden md:flex items-center">
        </div>
        
        {/* Enhanced Live Clock with IST - hidden on very small screens */}
        <div className="hidden xs:flex items-center space-x-3 bg-white/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200">
          <div className="text-center">
            <div className="text-xs sm:text-sm font-bold text-gray-800 transition-all duration-1000">
              {getISTTime()}
            </div>
            <div className="text-xs text-gray-600 font-medium hidden sm:block">
              {getISTDate()}
            </div>
          </div>
        </div>
        {/* Right side controls */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Quick Actions Menu */}
          <div className="relative" ref={quickActionsRef}>
            <button
              className="relative text-gray-600 hover:text-blue-700 p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/50 hover:bg-white/80"
              aria-label="Quick Actions"
              onClick={() => setShowQuickActions(!showQuickActions)}
            >
              <FiZap size={20} />
            </button>
            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 px-2">Quick Actions</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => handleQuickAction('add-lead')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center space-x-2 transition-colors"
                  >
                    <FiUser size={16} className="text-blue-600" />
                    <span>Add Lead</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('add-task')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 flex items-center space-x-2 transition-colors"
                  >
                    <FiCheckCircle size={16} className="text-green-600" />
                    <span>Add Task</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('add-inventory')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-purple-50 flex items-center space-x-2 transition-colors"
                  >
                    <FiCalendar size={16} className="text-purple-600" />
                    <span>Add Inventory</span>
                  </button>
                  <button
                    onClick={() => handleQuickAction('add-caller')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center space-x-2 transition-colors"
                  >
                    <FiUser size={16} className="text-orange-600" />
                    <span>Add Caller</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced Smart Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="relative text-gray-600 hover:text-blue-700 p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/50 hover:bg-white/80"
              aria-label="Notifications"
              onClick={() => setShowDropdown((v) => !v)}
            >
              <FiBell size={20} />
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-tr from-pink-500 to-yellow-400 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-bold animate-bounce shadow-lg border-2 border-white">
                  {totalUnreadCount}
                </span>
              )}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-full sm:w-80 bg-white rounded-xl shadow-xl z-50 max-h-[28rem] overflow-hidden border border-gray-200">
                {/* Header with categories */}
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FiBell className="text-blue-600" size={18} />
                      <span className="font-semibold text-gray-800">Notifications</span>
                    </div>
                    {totalUnreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  {/* Category indicators */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {notificationTypes.messages > 0 && (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        {notificationTypes.messages} Messages
                      </div>
                    )}
                    {notificationTypes.tasks > 0 && (
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        {notificationTypes.tasks} Tasks
                      </div>
                    )}
                    {notificationTypes.leads > 0 && (
                      <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                        {notificationTypes.leads} Leads
                      </div>
                    )}
                    {notificationTypes.announcements > 0 && (
                      <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                        {notificationTypes.announcements} Announcements
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Notifications list */}
                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="p-5 text-center text-gray-500 text-sm font-medium">Loading...</div>
                  ) : uniqueNotifications.length === 0 ? (
                    <div className="p-5 text-center text-gray-500 text-sm font-medium">No notifications found.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {uniqueNotifications.map((notif, idx) => {
                        let sender = notif.senderName;
                        let message = notif.message || '';
                        if (notif.type === 'TEAM_CHAT' && !sender && message.includes(' sent a team chat message')) {
                          sender = message.split(' sent a team chat message')[0];
                        }
                        // For TEAM_CHAT, extract only the actual chat message
                        if (notif.type === 'TEAM_CHAT' && message.includes(' sent a team chat message: ')) {
                          message = message.split(' sent a team chat message: ')[1] || '';
                        }
                        
                        // Get notification icon and color based on type
                        const getNotificationStyle = (type) => {
                          switch (type) {
                            case 'TEAM_CHAT':
                              return 'bg-blue-100 text-blue-600';
                            case 'TASK_ASSIGNED':
                            case 'TASK_STATUS_UPDATE':
                              return 'bg-green-100 text-green-600';
                            case 'lead-assigned':
                            case 'LEAD_ASSIGNED':
                              return 'bg-purple-100 text-purple-600';
                            case 'announcement':
                              return 'bg-orange-100 text-orange-600';
                            default:
                              return 'bg-gray-100 text-gray-600';
                          }
                        };
                        
                        return (
                          <li
                            key={notif._id || notif.id || idx}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 items-start ${
                              !notif.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                            }`}
                            onClick={async () => {
                              // Mark as read and dispatch custom event with type
                              if (!notif.read && (notif._id || notif.id)) {
                                await notificationAPI.markAsRead(notif._id || notif.id);
                                window.dispatchEvent(new CustomEvent('notificationRead', { 
                                  detail: { type: notif.type } 
                                }));
                              }
                              
                              if (onNotificationClick) onNotificationClick(notif);
                              if (notif.type === 'TEAM_CHAT') {
                                navigate('/chat');
                              } else if (notif.type === 'calendar-event') {
                                navigate('/calendar');
                              } else if (notif.leadId) {
                                if (onViewLead) onViewLead(notif.leadId);
                              } else if (notif.type === 'TASK_ASSIGNED' || notif.type === 'TASK_STATUS_UPDATE') {
                                navigate('/tasks');
                              } else if (notif.type === 'lead-assigned') {
                                navigate('/leads');
                              }
                            }}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getNotificationStyle(notif.type)}`}>
                              {notif.type === 'TEAM_CHAT' ? (sender?.[0]?.toUpperCase() || 'M') : (notif.title?.[0] || notif.type?.[0] || 'N')}
                            </div>
                            <div className="flex-1 min-w-0">
                              {notif.type === 'TEAM_CHAT' ? (
                                <>
                                  <div className="font-medium text-gray-800 text-sm truncate">
                                    {sender || 'User'}
                                  </div>
                                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                                    {message}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="font-medium text-gray-800 text-sm truncate">
                                    {notif.title || notif.type || 'Notification'}
                                  </div>
                                  <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                                    {notif.message}
                                  </div>
                                </>
                              )}
                              <div className="text-xs text-gray-400 mt-2">
                                {new Date(notif.createdAt || notif.created_at).toLocaleString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Profile Mini Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              className="flex items-center space-x-2 pl-3 border-l border-gray-200 cursor-pointer hover:bg-white/50 rounded-r-lg p-2 transition-colors duration-200"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.first_name?.charAt(0) || user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-900">
                  {user?.first_name || user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <FiChevronDown size={14} className="text-gray-500" />
            </button>
            
            {/* Enhanced Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-800">{user?.first_name || user?.name || 'User'}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <div className="py-1">
                  <a
                    href="/profile"
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                  >
                    <FiUser size={16} className="text-gray-500" />
                    <span>My Profile</span>
                  </a>
                  <button
                    onClick={handleChangePassword}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <FiKey size={16} className="text-gray-500" />
                    <span>Change Password</span>
                  </button>
                  
                  <div className="border-t border-gray-100">
                    <button
                      onClick={onLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}  
          </div>
        </div>
      </div>
    </header>
    {/* Mobile Sidebar Overlay (top-level) */}
    {showMobileSidebar && (
      <div className="fixed inset-0 z-60">
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileSidebar(false)} />
        <div className="absolute inset-y-0 left-0">
          <Sidebar mobile={true} onClose={() => setShowMobileSidebar(false)} />
        </div>
      </div>
    )}

    {/* Mobile notifications panel (full-width) */}
    {showDropdown && (
      <div className="md:hidden fixed top-14 left-0 right-0 z-60">
        <div className="mx-3 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[60vh] overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FiBell className="text-blue-600" size={18} />
                <span className="font-semibold text-gray-800">Notifications</span>
              </div>
              {totalUnreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {notificationTypes.messages > 0 && (
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">{notificationTypes.messages} Messages</div>
              )}
              {notificationTypes.tasks > 0 && (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">{notificationTypes.tasks} Tasks</div>
              )}
              {notificationTypes.leads > 0 && (
                <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">{notificationTypes.leads} Leads</div>
              )}
              {notificationTypes.announcements > 0 && (
                <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">{notificationTypes.announcements} Announcements</div>
              )}
            </div>
          </div>
          <div className="max-h-[52vh] overflow-y-auto">
            {loading ? (
              <div className="p-5 text-center text-gray-500 text-sm font-medium">Loading...</div>
            ) : uniqueNotifications.length === 0 ? (
              <div className="p-5 text-center text-gray-500 text-sm font-medium">No notifications found.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {uniqueNotifications.map((notif, idx) => {
                  let sender = notif.senderName;
                  let message = notif.message || '';
                  if (notif.type === 'TEAM_CHAT' && !sender && message.includes(' sent a team chat message')) {
                    sender = message.split(' sent a team chat message')[0];
                  }
                  if (notif.type === 'TEAM_CHAT' && message.includes(' sent a team chat message: ')) {
                    message = message.split(' sent a team chat message: ')[1] || '';
                  }
                  const getNotificationStyle = (type) => {
                    switch (type) {
                      case 'TEAM_CHAT':
                        return 'bg-blue-100 text-blue-600';
                      case 'TASK_ASSIGNED':
                      case 'TASK_STATUS_UPDATE':
                        return 'bg-green-100 text-green-600';
                      case 'lead-assigned':
                      case 'LEAD_ASSIGNED':
                        return 'bg-purple-100 text-purple-600';
                      case 'announcement':
                        return 'bg-orange-100 text-orange-600';
                      default:
                        return 'bg-gray-100 text-gray-600';
                    }
                  };

                  return (
                    <li
                      key={notif._id || notif.id || idx}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 items-start ${!notif.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                      onClick={async () => {
                        if (!notif.read && (notif._id || notif.id)) {
                          await notificationAPI.markAsRead(notif._id || notif.id);
                          window.dispatchEvent(new CustomEvent('notificationRead', { detail: { type: notif.type } }));
                        }
                        if (onNotificationClick) onNotificationClick(notif);
                        if (notif.type === 'TEAM_CHAT') {
                          navigate('/chat');
                        } else if (notif.type === 'calendar-event') {
                          navigate('/calendar');
                        } else if (notif.leadId) {
                          if (onViewLead) onViewLead(notif.leadId);
                        } else if (notif.type === 'TASK_ASSIGNED' || notif.type === 'TASK_STATUS_UPDATE') {
                          navigate('/tasks');
                        } else if (notif.type === 'lead-assigned') {
                          navigate('/leads');
                        }
                        setShowDropdown(false);
                      }}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getNotificationStyle(notif.type)}`}>
                        {notif.type === 'TEAM_CHAT' ? (sender?.[0]?.toUpperCase() || 'M') : (notif.title?.[0] || notif.type?.[0] || 'N')}
                      </div>
                      <div className="flex-1 min-w-0">
                        {notif.type === 'TEAM_CHAT' ? (
                          <>
                            <div className="font-medium text-gray-800 text-sm truncate">{sender || 'User'}</div>
                            <div className="text-gray-600 text-sm mt-1 line-clamp-2">{message}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-gray-800 text-sm truncate">{notif.title || notif.type || 'Notification'}</div>
                            <div className="text-gray-600 text-sm mt-1 line-clamp-2">{notif.message}</div>
                          </>
                        )}
                        <div className="text-xs text-gray-400 mt-2">{new Date(notif.createdAt || notif.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Announcement banner under header, centered */}
    {announcementBanner && (
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[70]">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white px-6 py-3 rounded-xl shadow-lg max-w-3xl w-screen sm:w-auto mx-4 text-center">
          <div className="font-semibold text-sm">{announcementBanner.title}</div>
          {announcementBanner.message && <div className="text-xs opacity-90 mt-1">{announcementBanner.message}</div>}
        </div>
      </div>
    )}
    
    {/* Change Password Modal */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 sm:mx-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>

            {/* (mobile overlay moved out of modal for correct behavior) */}
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, currentPassword: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

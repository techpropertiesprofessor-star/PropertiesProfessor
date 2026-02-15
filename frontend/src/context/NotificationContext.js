import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { notificationAPI } from '../api/client';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const useNotificationCounts = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotificationCounts must be used within NotificationProvider');
  }
  return ctx;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const { on, off, connected } = useSocket() || {};

  // Total unread count (for bell badge)
  const [totalUnread, setTotalUnread] = useState(0);
  // Per-section unread counts (for sidebar badges)
  const [leadsCount, setLeadsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [teamChatCount, setTeamChatCount] = useState(0);
  const [callersCount, setCallersCount] = useState(0);
  const [calendarCount, setCalendarCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  // Fetch all counts from backend API
  const refreshCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [unreadRes, countsRes] = await Promise.all([
        notificationAPI.getUnreadCount(),
        notificationAPI.getCountsByType()
      ]);
      setTotalUnread(unreadRes.data?.count || 0);
      if (countsRes.data) {
        setLeadsCount(countsRes.data.leads || 0);
        setTasksCount(countsRes.data.tasks || 0);
        setTeamChatCount(countsRes.data.teamChat || 0);
        setCallersCount(countsRes.data.callers || 0);
        setCalendarCount(countsRes.data.calendar || 0);
        setAnnouncementsCount(countsRes.data.announcements || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    }
  }, [user]);

  // Clear a section's count (when user visits that page)
  const clearSection = useCallback(async (section) => {
    try {
      await notificationAPI.markSectionAsRead(section);
      const sectionSetters = {
        leads: setLeadsCount,
        tasks: setTasksCount,
        teamChat: setTeamChatCount,
        callers: setCallersCount,
        calendar: setCalendarCount,
        announcements: setAnnouncementsCount
      };
      const setter = sectionSetters[section];
      if (setter) setter(0);
      try {
        const unreadRes = await notificationAPI.getUnreadCount();
        setTotalUnread(unreadRes.data?.count || 0);
      } catch (e) {
        refreshCounts();
      }
    } catch (err) {
      console.error('Failed to clear section notifications:', err);
    }
  }, [refreshCounts]);

  // Increment counts when a new notification arrives (called from socket)
  const incrementCount = useCallback((type) => {
    setTotalUnread((c) => c + 1);
    if (type === 'lead-assigned' || type === 'LEAD_ASSIGNED') {
      setLeadsCount((c) => c + 1);
    } else if (type === 'TASK_ASSIGNED' || type === 'TASK_STATUS_UPDATE') {
      setTasksCount((c) => c + 1);
    } else if (type === 'TEAM_CHAT' || type === 'PRIVATE_MESSAGE') {
      setTeamChatCount((c) => c + 1);
    } else if (type === 'CALLER_ASSIGNED') {
      setCallersCount((c) => c + 1);
    } else if (type === 'calendar-event') {
      setCalendarCount((c) => c + 1);
    } else if (type === 'ANNOUNCEMENT') {
      setAnnouncementsCount((c) => c + 1);
    }
  }, []);

  // Decrement a single notification (when user reads one)
  const decrementCount = useCallback((type) => {
    setTotalUnread((c) => Math.max(0, c - 1));
    if (type === 'lead-assigned' || type === 'LEAD_ASSIGNED') {
      setLeadsCount((c) => Math.max(0, c - 1));
    } else if (type === 'TASK_ASSIGNED' || type === 'TASK_STATUS_UPDATE') {
      setTasksCount((c) => Math.max(0, c - 1));
    } else if (type === 'TEAM_CHAT' || type === 'PRIVATE_MESSAGE') {
      setTeamChatCount((c) => Math.max(0, c - 1));
    } else if (type === 'CALLER_ASSIGNED') {
      setCallersCount((c) => Math.max(0, c - 1));
    } else if (type === 'calendar-event') {
      setCalendarCount((c) => Math.max(0, c - 1));
    } else if (type === 'ANNOUNCEMENT') {
      setAnnouncementsCount((c) => Math.max(0, c - 1));
    }
  }, []);

  // Initial fetch on mount + when user changes
  useEffect(() => {
    if (user) {
      refreshCounts();
    } else {
      setTotalUnread(0);
      setLeadsCount(0);
      setTasksCount(0);
      setTeamChatCount(0);
      setCallersCount(0);
      setCalendarCount(0);
      setAnnouncementsCount(0);
    }
  }, [user, refreshCounts]);

  // Use shared socket for real-time count updates
  useEffect(() => {
    if (!user || !on || !off || !connected) return;

    const handleNewNotification = (data) => {
      const type = data?.type || data?.notificationType || '';
      incrementCount(type);
    };
    const handleTaskAssigned = () => incrementCount('TASK_ASSIGNED');
    const handleNewLead = () => incrementCount('lead-assigned');
    const handleTaskStatusUpdated = () => incrementCount('TASK_STATUS_UPDATE');
    const handleNotification = (data) => incrementCount(data?.type || 'IMPORTANT');
    const handleNewAnnouncement = () => incrementCount('ANNOUNCEMENT');
    const handleChatMessage = () => incrementCount('TEAM_CHAT');
    const handlePrivateMessage = () => incrementCount('PRIVATE_MESSAGE');
    const handleLeadAssigned = () => incrementCount('lead-assigned');

    on('new-notification', handleNewNotification);
    on('taskAssigned', handleTaskAssigned);
    on('new-lead', handleNewLead);
    on('taskStatusUpdated', handleTaskStatusUpdated);
    on('notification', handleNotification);
    on('new-announcement', handleNewAnnouncement);
    on('chat-message', handleChatMessage);
    on('private-message', handlePrivateMessage);
    on('lead-assigned', handleLeadAssigned);

    return () => {
      off('new-notification', handleNewNotification);
      off('taskAssigned', handleTaskAssigned);
      off('new-lead', handleNewLead);
      off('taskStatusUpdated', handleTaskStatusUpdated);
      off('notification', handleNotification);
      off('new-announcement', handleNewAnnouncement);
      off('chat-message', handleChatMessage);
      off('private-message', handlePrivateMessage);
      off('lead-assigned', handleLeadAssigned);
    };
  }, [user, on, off, connected, incrementCount]);

  // Listen for notificationRead custom events (from Header when marking individual notifications)
  useEffect(() => {
    const handleNotificationRead = (event) => {
      const notificationType = event.detail?.type;
      if (notificationType) {
        decrementCount(notificationType);
      } else {
        // If no type specified, just refresh
        refreshCounts();
      }
    };
    window.addEventListener('notificationRead', handleNotificationRead);
    return () => window.removeEventListener('notificationRead', handleNotificationRead);
  }, [decrementCount, refreshCounts]);

  const value = {
    totalUnread,
    leadsCount,
    tasksCount,
    teamChatCount,
    callersCount,
    calendarCount,
    announcementsCount,
    refreshCounts,
    clearSection,
    incrementCount,
    decrementCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;

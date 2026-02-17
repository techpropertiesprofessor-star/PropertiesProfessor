import { useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotificationToast } from '../context/NotificationToastContext';
import { playNotificationSound } from '../utils/sound';

export const useRealtimeNotifications = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useNotificationToast();
  const navigate = useNavigate();
  const { on, off, connected } = useSocket() || {};

  // Helper to map notification types to routes
  const getRouteForType = useCallback((type) => {
    const typeStr = String(type).toLowerCase();
    if (typeStr.includes('task')) return '/tasks';
    if (typeStr.includes('lead')) return '/leads';
    if (typeStr.includes('caller')) return '/callers';
    if (typeStr.includes('chat') || typeStr.includes('message')) return '/chat';
    if (typeStr.includes('announcement')) return '/announcements';
    return '/notifications';
  }, []);

  useEffect(() => {
    if (!user || !on || !off || !connected) return;

    const currentUserId = user.id || user._id || user.employeeId;

    // Helper to format notification data
    const formatNotification = (data) => ({
      type: data.type || 'notification',
      title: data.title || data.taskTitle || 'New Notification',
      message: data.message || data.description || data.taskDescription || '',
      timestamp: data.timestamp || data.createdAt || Date.now(),
      link: getRouteForType(data.type),
      onClick: () => navigate(getRouteForType(data.type))
    });

    const handleNewNotification = (data) => {
      // Don't play sound if current user triggered the notification
      const createdBy = data?.createdBy || data?.senderId || data?.sender_id;
      if (!createdBy || String(createdBy) !== String(currentUserId)) {
        playNotificationSound();
      }
      showToast(formatNotification(data));
    };

    const handleTaskAssigned = (data) => {
      playNotificationSound();
      showToast({
        type: 'TASK_ASSIGNED',
        title: '📋 New Task Assigned',
        message: data.task?.title || data.message || 'You have a new task',
        timestamp: Date.now(),
        link: '/tasks',
        onClick: () => navigate('/tasks')
      });
    };

    const handleNewLead = (data) => {
      playNotificationSound();
      showToast({
        type: 'LEAD',
        title: '👤 New Lead Assigned',
        message: data.message || 'You have a new lead',
        timestamp: Date.now(),
        link: '/leads',
        onClick: () => navigate('/leads')
      });
    };

    const handleNotification = (data) => {
      // Don't play sound if current user triggered the notification
      const createdBy = data?.createdBy || data?.senderId || data?.sender_id;
      if (!createdBy || String(createdBy) !== String(currentUserId)) {
        playNotificationSound();
      }
      showToast(formatNotification(data));
    };

    const handleAnnouncement = (data) => {
      // Don't play sound if current user created the announcement
      const createdBy = data?.createdBy;
      if (!createdBy || String(createdBy) !== String(currentUserId)) {
        playNotificationSound();
      }
      showToast({
        type: 'ANNOUNCEMENT',
        title: '📢 New Announcement',
        message: data.message || data.title || data.text || 'New announcement posted',
        timestamp: Date.now(),
        link: '/announcements',
        onClick: () => navigate('/announcements')
      });
    };

    const handleChat = (data) => {
      // Don't play sound if current user sent the message
      const senderId = data?.sender_id || data?.senderId;
      if (!senderId || String(senderId) !== String(currentUserId)) {
        playNotificationSound();
      }
    };

    const handleLeadAssigned = (data) => {
      playNotificationSound();
      showToast({
        type: 'LEAD_ASSIGNED',
        title: '📋 Lead Assigned',
        message: data.message || 'A lead has been assigned to you',
        timestamp: Date.now(),
        link: '/leads',
        onClick: () => navigate('/leads')
      });
    };

    on('new-notification', handleNewNotification);
    on('taskAssigned', handleTaskAssigned);
    on('new-lead', handleNewLead);
    on('notification', handleNotification);
    on('ANNOUNCEMENT', handleAnnouncement);
    on('new-announcement', handleAnnouncement);
    on('chat-message', handleChat);
    on('private-message', handleChat);
    on('lead-assigned', handleLeadAssigned);

    return () => {
      off('new-notification', handleNewNotification);
      off('taskAssigned', handleTaskAssigned);
      off('new-lead', handleNewLead);
      off('notification', handleNotification);
      off('ANNOUNCEMENT', handleAnnouncement);
      off('new-announcement', handleAnnouncement);
      off('chat-message', handleChat);
      off('private-message', handleChat);
      off('lead-assigned', handleLeadAssigned);
    };
  }, [user, on, off, connected, showToast, navigate, getRouteForType]);
};

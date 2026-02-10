import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { useNotificationToast } from '../context/NotificationToastContext';
import { playNotificationSound } from '../utils/sound';

export const useRealtimeNotifications = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useNotificationToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const socketBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;

    const socket = io(socketBase, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔔 Toast notification system connected');
      if (user?._id) socket.emit('identify', user._id);
    });

    // Helper to map notification types to routes
    const getRouteForType = (type) => {
      const typeStr = String(type).toLowerCase();
      
      if (typeStr.includes('task')) return '/tasks';
      if (typeStr.includes('lead')) return '/leads';
      if (typeStr.includes('caller')) return '/callers';
      if (typeStr.includes('chat') || typeStr.includes('message')) return '/chat';
      if (typeStr.includes('announcement')) return '/announcements';
      
      return '/notifications';
    };

    // Helper to format notification data
    const formatNotification = (data) => {
      return {
        type: data.type || 'notification',
        title: data.title || data.taskTitle || 'New Notification',
        message: data.message || data.description || data.taskDescription || '',
        timestamp: data.timestamp || data.createdAt || Date.now(),
        link: getRouteForType(data.type),
        onClick: () => {
          navigate(getRouteForType(data.type));
        }
      };
    };

    // Listen to various notification events
    socket.on('new-notification', (data) => {
      console.log('🔔 New notification:', data);
      playNotificationSound();
      showToast(formatNotification(data));
    });

    socket.on('taskAssigned', (data) => {
      console.log('📋 Task assigned:', data);
      playNotificationSound();
      showToast({
        type: 'TASK_ASSIGNED',
        title: '📋 New Task Assigned',
        message: data.task?.title || data.message || 'You have a new task',
        timestamp: Date.now(),
        link: '/tasks',
        onClick: () => navigate('/tasks')
      });
    });

    socket.on('new-lead', (data) => {
      console.log('👤 New lead:', data);
      playNotificationSound();
      showToast({
        type: 'LEAD',
        title: '👤 New Lead Assigned',
        message: data.message || 'You have a new lead',
        timestamp: Date.now(),
        link: '/leads',
        onClick: () => navigate('/leads')
      });
    });

    socket.on('notification', (data) => {
      console.log('🔔 General notification:', data);
      playNotificationSound();
      showToast(formatNotification(data));
    });

    socket.on('ANNOUNCEMENT', (data) => {
      console.log('📢 Announcement:', data);
      playNotificationSound();
      showToast({
        type: 'ANNOUNCEMENT',
        title: '📢 New Announcement',
        message: data.message || data.title || 'New announcement posted',
        timestamp: Date.now(),
        link: '/announcements',
        onClick: () => navigate('/announcements')
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, showToast, navigate]);
};

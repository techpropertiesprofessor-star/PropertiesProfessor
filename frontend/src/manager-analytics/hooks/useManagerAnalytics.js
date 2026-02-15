/**
 * Manager Analytics Hook
 * Manages analytics state and real-time socket updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import analyticsService from '../services/analyticsService';

// Socket.IO connects to base URL (not /api path)
const SOCKET_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const useManagerAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    taskStatus: null,
    employeeLoad: null,
    leadsFunnel: null,
    leadSources: null,
    inventory: null,
    callActivity: null,
    kpis: null,
    alerts: null
  });

  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Debounce timer ref
  const debounceTimers = useRef({});

  /**
   * Debounced update function
   */
  const debouncedUpdate = useCallback((key, updateFn, delay = 1000) => {
    // Clear existing timer
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    // Set new timer
    debounceTimers.current[key] = setTimeout(() => {
      updateFn();
      debounceTimers.current[key] = null;
    }, delay);
  }, []);

  /**
   * Update specific data key
   */
  const updateData = useCallback((key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  /**
   * Initial data load
   */
  const loadAllAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await analyticsService.getAllAnalytics();
      
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('[ANALYTICS_HOOK] Load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh specific chart
   */
  const refreshChart = useCallback(async (chartType) => {
    try {
      let response;
      
      switch (chartType) {
        case 'taskStatus':
          response = await analyticsService.getTaskStatus();
          if (response.success) updateData('taskStatus', response.data);
          break;
        case 'employeeLoad':
          response = await analyticsService.getEmployeeLoad();
          if (response.success) updateData('employeeLoad', response.data);
          break;
        case 'leadsFunnel':
          response = await analyticsService.getLeadsFunnel();
          if (response.success) updateData('leadsFunnel', response.data);
          break;
        case 'leadSources':
          response = await analyticsService.getLeadSources();
          if (response.success) updateData('leadSources', response.data);
          break;
        case 'inventory':
          response = await analyticsService.getInventoryStatus();
          if (response.success) updateData('inventory', response.data);
          break;
        case 'callActivity':
          response = await analyticsService.getCallActivity();
          if (response.success) updateData('callActivity', response.data);
          break;
        case 'kpis':
          response = await analyticsService.getPerformanceKPIs();
          if (response.success) updateData('kpis', response.data);
          break;
        case 'alerts':
          response = await analyticsService.getAlerts();
          if (response.success) updateData('alerts', response.data);
          break;
        default:
          console.warn('[ANALYTICS_HOOK] Unknown chart type:', chartType);
      }
    } catch (err) {
      console.error(`[ANALYTICS_HOOK] Refresh ${chartType} error:`, err);
    }
  }, [updateData]);

  /**
   * Setup socket connection and listeners
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('[ANALYTICS_HOOK] Socket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[ANALYTICS_HOOK] Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[ANALYTICS_HOOK] Socket connection error:', err);
      setIsConnected(false);
    });

    // Analytics update listeners with improved debouncing for real-time feel
    socket.on('manager:analytics:taskStatus', (response) => {
      if (response.success) {
        debouncedUpdate('taskStatus', () => updateData('taskStatus', response.data), 500); // Faster updates
      }
    });

    socket.on('manager:analytics:employeeLoad', (response) => {
      if (response.success) {
        debouncedUpdate('employeeLoad', () => updateData('employeeLoad', response.data), 1000); // Reduced delay
      }
    });

    socket.on('manager:analytics:leadsFunnel', (response) => {
      if (response.success) {
        debouncedUpdate('leadsFunnel', () => updateData('leadsFunnel', response.data), 500); // Faster updates
      }
    });

    socket.on('manager:analytics:leadSources', (response) => {
      if (response.success) {
        debouncedUpdate('leadSources', () => updateData('leadSources', response.data), 1000); // Reduced delay
      }
    });

    socket.on('manager:analytics:inventory', (response) => {
      if (response.success) {
        debouncedUpdate('inventory', () => updateData('inventory', response.data), 500); // Faster updates
      }
    });

    socket.on('manager:analytics:callActivity', (response) => {
      if (response.success) {
        debouncedUpdate('callActivity', () => updateData('callActivity', response.data), 1500); // Reduced delay
      }
    });

    socket.on('manager:analytics:kpis', (response) => {
      if (response.success) {
        debouncedUpdate('kpis', () => updateData('kpis', response.data));
      }
    });

    socket.on('manager:analytics:alerts', (response) => {
      if (response.success) {
        // Immediate update for alerts - no debouncing needed for critical data
        updateData('alerts', response.data);
      }
    });

    // New alert notification - immediate update
    socket.on('manager:analytics:newAlert', (response) => {
      if (response.success) {
        console.log('[ANALYTICS_HOOK] New alert received:', response.data);
        // Immediately refresh alerts to show new alert
        refreshChart('alerts');
      }
    });

    // All data update
    socket.on('manager:analytics:all', (response) => {
      if (response.success) {
        setData(response.data);
      }
    });

    // Error handler
    socket.on('manager:analytics:error', (error) => {
      console.error('[ANALYTICS_HOOK] Socket error:', error);
    });

    // Cleanup
    return () => {
      console.log('[ANALYTICS_HOOK] Cleaning up socket');
      
      // Clear all debounce timers
      Object.values(debounceTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      
      socket.disconnect();
    };
  }, [debouncedUpdate, updateData]);

  /**
   * Load data on mount and setup auto-refresh
   */
  useEffect(() => {
    loadAllAnalytics();
    
    // Auto-refresh every 30 seconds for real-time feel
    const autoRefreshInterval = setInterval(() => {
      console.log('[ANALYTICS_HOOK] Auto-refreshing all data...');
      refreshChart('alerts');
      refreshChart('kpis');
      refreshChart('taskStatus');
      refreshChart('employeeLoad');
      refreshChart('leadsFunnel');
      refreshChart('leadSources');
      refreshChart('inventory');
      refreshChart('callActivity');
    }, 30 * 1000); // 30 seconds
    
    // Cleanup auto-refresh
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, [loadAllAnalytics, refreshChart]);

  return {
    data,
    loading,
    error,
    isConnected,
    refreshChart,
    reload: loadAllAnalytics
  };
};

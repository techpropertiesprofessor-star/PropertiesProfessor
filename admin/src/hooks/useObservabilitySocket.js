import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * ADMIN OBSERVABILITY SOCKET HOOK
 * Provides real-time updates with automatic fallback to polling
 */
export const useObservabilitySocket = (userRole, timeRange = '1h') => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // connected, polling, disconnected
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiMetrics, setApiMetrics] = useState(null);
  const [errorMetrics, setErrorMetrics] = useState(null);
  const [bandwidth, setBandwidth] = useState(null);
  const [activeUsers, setActiveUsers] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const socketRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  /**
   * Fetch metrics via HTTP (fallback polling)
   */
  const fetchMetricsHttp = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch system metrics
      const systemRes = await axios.get(`${API_BASE}/api/admin/metrics/system`, {
        headers,
        params: { timeRange }
      });
      
      if (systemRes.data.success) {
        const data = systemRes.data.data;
        
        // Update all metrics
        setSystemHealth({
          status: 'healthy',
          uptime: data.uptime,
          memoryUsageMB: data.memoryUsageMB,
          memoryUsagePercent: data.memoryUsagePercent,
          cpuLoad: data.cpuLoad,
          activeSockets: data.activeSockets || 0,
          timestamp: new Date().toISOString()
        });
        
        setApiMetrics({
          totalRequests: data.totalRequests || 0,
          requestsPerSecond: data.requestsPerSecond || 0,
          avgResponseTime: data.avgResponseTime || 0,
          errorRate: data.errorRate || 0,
          timestamp: new Date().toISOString()
        });
        
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('[ObservabilitySocket] HTTP fetch error:', error);
    }
  }, [timeRange]);
  
  /**
   * Start polling fallback
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    console.log('[ObservabilitySocket] Starting polling mode (15s interval)');
    setConnectionStatus('polling');
    
    // Fetch immediately
    fetchMetricsHttp();
    
    // Then every 15 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchMetricsHttp();
    }, 15000);
  }, [fetchMetricsHttp]);
  
  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[ObservabilitySocket] Polling stopped');
    }
  }, []);
  
  /**
   * Connect to socket
   */
  const connectSocket = useCallback(() => {
    // Allow all admin roles: admin, manager, super_admin, etc.
    const adminRoles = ['admin', 'super_admin', 'superadmin', 'manager'];
    if (!userRole || !adminRoles.includes(userRole.toLowerCase())) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Create socket connection
      const socket = io(API_BASE, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });
      
      socketRef.current = socket;
      
      // Connection events
      socket.on('connect', () => {
        console.log('[ObservabilitySocket] Connected:', socket.id);
        setConnectionStatus('connected');
        stopPolling(); // Stop polling when socket connects
        
        // Join admin-observability room
        socket.emit('join-admin-observability', { role: userRole, timeRange });
      });
      
      socket.on('disconnect', (reason) => {
        console.log('[ObservabilitySocket] Disconnected:', reason);
        setConnectionStatus('disconnected');
        
        // Start polling as fallback
        startPolling();
      });
      
      socket.on('connect_error', (error) => {
        console.error('[ObservabilitySocket] Connection error:', error.message);
        setConnectionStatus('disconnected');
        
        // Start polling as fallback
        startPolling();
      });
      
      // Metric events
      socket.on('systemHealthUpdate', (data) => {
        setSystemHealth(data);
        setLastUpdate(new Date());
      });
      
      socket.on('apiMetricsUpdate', (data) => {
        setApiMetrics(data);
        setLastUpdate(new Date());
      });
      
      socket.on('errorMetricsUpdate', (data) => {
        setErrorMetrics(data);
        setLastUpdate(new Date());
      });
      
      socket.on('bandwidthUpdate', (data) => {
        setBandwidth(data);
        setLastUpdate(new Date());
      });
      
      socket.on('activeUsersUpdate', (data) => {
        setActiveUsers(data);
        setLastUpdate(new Date());
      });
      
      socket.on('crashDetected', (data) => {
        console.error('[ObservabilitySocket] Crash detected:', data);
        // Could trigger notification here
      });
      
      socket.on('activityLogAdded', (data) => {
        // Could trigger real-time log update here
        console.log('[ObservabilitySocket] Activity log added:', data);
      });
      
      socket.on('apiLogAdded', (data) => {
        // Could trigger real-time log update here
        console.log('[ObservabilitySocket] API log added:', data);
      });
      
      socket.on('error', (error) => {
        console.error('[ObservabilitySocket] Socket error:', error);
      });
      
    } catch (error) {
      console.error('[ObservabilitySocket] Failed to connect:', error);
      startPolling(); // Fallback to polling
    }
  }, [userRole, timeRange, startPolling, stopPolling]);
  
  /**
   * Disconnect socket
   */
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopPolling();
  }, [stopPolling]);
  
  /**
   * Change time range
   */
  const changeTimeRange = useCallback((newTimeRange) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('change-time-range', {
        role: userRole,
        timeRange: newTimeRange
      });
    } else {
      // If not connected, fetch via HTTP
      fetchMetricsHttp();
    }
  }, [userRole, fetchMetricsHttp]);
  
  /**
   * Initialize on mount
   */
  useEffect(() => {
    const adminRoles = ['admin', 'super_admin', 'superadmin', 'manager'];
    if (userRole && adminRoles.includes(userRole.toLowerCase())) {
      connectSocket();
    }
    
    return () => {
      disconnectSocket();
    };
  }, [userRole, connectSocket, disconnectSocket]);
  
  /**
   * Handle time range change
   */
  useEffect(() => {
    changeTimeRange(timeRange);
  }, [timeRange, changeTimeRange]);
  
  return {
    connectionStatus,
    systemHealth,
    apiMetrics,
    errorMetrics,
    bandwidth,
    activeUsers,
    lastUpdate,
    isConnected: connectionStatus === 'connected',
    isPolling: connectionStatus === 'polling',
    isDisconnected: connectionStatus === 'disconnected'
  };
};

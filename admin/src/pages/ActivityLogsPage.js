import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '../services/api';
import { format } from 'date-fns';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [filters, setFilters] = useState({
    actionType: '',
    category: '',
    search: ''
  });
  const [isLive, setIsLive] = useState(true);
  const socketRef = useRef(null);

  // Setup socket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) return;

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[ActivityLogs] Socket connected');
      // Join admin observability room
      socket.emit('join-admin-observability', { role: user.role });
    });

    socket.on('activityLogAdded', (newLog) => {
      if (!isLive) return;
      
      console.log('[ActivityLogs] New activity:', newLog);
      
      // Only add if on first page and no filters
      if (pagination.page === 1 && !filters.actionType && !filters.category && !filters.search) {
        setLogs(prev => [newLog, ...prev].slice(0, pagination.limit));
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[ActivityLogs] Socket error:', error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isLive, pagination.page, pagination.limit, filters]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      const response = await adminApi.getActivityLogs(params);
      setLogs(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionTypeColor = (actionType) => {
    const colors = {
      CLICK: 'bg-blue-900 text-blue-200',
      NAVIGATION: 'bg-purple-900 text-purple-200',
      FORM_SUBMIT: 'bg-green-900 text-green-200',
      API_CALL: 'bg-cyan-900 text-cyan-200',
      ERROR: 'bg-red-900 text-red-200',
      PERMISSION_CHANGE: 'bg-orange-900 text-orange-200',
      AUTH: 'bg-yellow-900 text-yellow-200'
    };
    return colors[actionType] || 'bg-gray-900 text-gray-200';
  };

  const getCategoryBadge = (category) => {
    const badges = {
      CRITICAL: '🔴 Critical',
      ACTIVITY: '🔵 Activity',
      SYSTEM: '🟢 System'
    };
    return badges[category] || category;
  };

  const downloadAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Username', 'User Role', 'User ID', 'Action Type', 'Category', 'Route', 'Description', 'IP Address', 'User Agent', 'Session ID', 'Request Method', 'Request Body', 'Response Status', 'Response Body', 'Error Message', 'Error Stack', 'Duration (ms)', 'Metadata'];
    const csvData = logs.map(log => [
      log._id || '',
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'),
      log.username || log.user?.username || 'Unknown',
      log.userRole || log.user?.role || '',
      log.userId || log.user?._id || '',
      log.actionType || '',
      log.category || '',
      log.route || log.path || '',
      log.description || '',
      log.metadata?.ipAddress || log.ipAddress || '',
      log.metadata?.userAgent || log.userAgent || '',
      log.sessionId || '',
      log.method || '',
      JSON.stringify(log.requestBody || log.metadata?.requestBody || {}),
      log.responseStatus || log.statusCode || '',
      JSON.stringify(log.responseBody || log.metadata?.responseBody || {}),
      log.errorMessage || log.error?.message || '',
      log.errorStack || log.error?.stack || '',
      log.duration || log.responseTime || '',
      JSON.stringify(log.metadata || {})
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Logs</h1>
          <p className="text-gray-400 mt-1">User actions and system activities</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadAsCSV}
            disabled={logs.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center gap-2"
          >
            📥 CSV
          </button>
          <button
            onClick={downloadAsJSON}
            disabled={logs.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center gap-2"
          >
            📥 JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="CLICK">Click</option>
              <option value="NAVIGATION">Navigation</option>
              <option value="FORM_SUBMIT">Form Submit</option>
              <option value="API_CALL">API Call</option>
              <option value="ERROR">Error</option>
              <option value="PERMISSION_CHANGE">Permission Change</option>
              <option value="AUTH">Authentication</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="CRITICAL">Critical</option>
              <option value="ACTIVITY">Activity</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search username, route..."
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            >
              {isLive ? '🟢 Live' : '⚪ Paused'}
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Showing {logs.length} of {pagination.total.toLocaleString()} logs
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-dark-panel rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">No logs found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Route</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Details</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-800 hover:bg-dark-card transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss.SSS')}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white text-sm font-medium">{log.username || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{log.userRole}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionTypeColor(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300 font-mono">
                      {log.route || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {log.elementText || log.elementId || log.entityType || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {getCategoryBadge(log.category)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-dark-card hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 bg-dark-card rounded-lg text-white">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-dark-card hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import { useObservabilitySocket } from '../hooks/useObservabilitySocket';
import ConnectionStatus from '../components/ConnectionStatus';

const DashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [healthChecks, setHealthChecks] = useState([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [queueStats, setQueueStats] = useState(null);
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  
  // Real-time socket connection
  const {
    connectionStatus,
    systemHealth,
    apiMetrics,
    errorMetrics,
    bandwidth,
    activeUsers,
    lastUpdate,
    isConnected
  } = useObservabilitySocket(userRole, timeRange);

  const loadData = useCallback(async () => {
    try {
      const [analyticsRes, healthRes, queueRes] = await Promise.all([
        adminApi.getAnalytics({ timeRange }),
        adminApi.getHealthChecks(),
        adminApi.getQueueStats().catch(() => ({ data: { data: null } }))
      ]);

      setAnalytics(analyticsRes.data.data);
      setHealthChecks(healthRes.data.data);
      setQueueStats(queueRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
    // Only poll if socket not connected
    if (!isConnected) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [loadData, isConnected]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'GREEN': return 'bg-green-500';
      case 'YELLOW': return 'bg-yellow-500';
      case 'RED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'GREEN': return '🟢 Healthy';
      case 'YELLOW': return '🟡 Warning';
      case 'RED': return '🔴 Critical';
      default: return '⚪ Unknown';
    }
  };

  const formatBytes = (bytes) => {
    const numBytes = Number(bytes) || 0;
    if (numBytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time system observability</p>
          <div className="mt-2">
            <ConnectionStatus status={connectionStatus} lastUpdate={lastUpdate} />
          </div>
        </div>

        <div className="flex gap-2">
          {['1h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-dark-card text-gray-300 hover:bg-dark-hover'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">System Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {healthChecks.map((health) => (
            <div key={health.component} className="bg-dark-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">{health.component}</span>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health.status)}`} />
              </div>
              <p className="text-lg font-semibold text-white">{getStatusText(health.status)}</p>
              {health.responseTime && (
                <p className="text-xs text-gray-400 mt-1">{health.responseTime}ms</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      {(apiMetrics || analytics) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total API Calls */}
          <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">API Calls</span>
              <span className="text-2xl">🌐</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {(apiMetrics?.totalRequests || analytics?.totalApiCalls || 0).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {apiMetrics?.requestsPerSecond ? `${apiMetrics.requestsPerSecond}/s` : 'Total requests'}
            </p>
          </div>

          {/* Error Rate */}
          <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Error Rate</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {Number(apiMetrics?.errorRate || errorMetrics?.errorRate || analytics?.errorRate || 0).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {(apiMetrics?.totalErrors || errorMetrics?.totalErrors || analytics?.apiErrors || 0)} errors
            </p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Avg Response</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {Number(apiMetrics?.avgResponseTime || analytics?.avgResponseTime || 0).toFixed(2)}ms
            </p>
            <p className="text-sm text-gray-400 mt-1">Response time</p>
          </div>

          {/* Active Users */}
          <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Sockets</span>
              <span className="text-2xl">👥</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {systemHealth?.activeSockets || activeUsers?.count || analytics?.activeUsers || 0}
            </p>
            <p className="text-sm text-gray-400 mt-1">Connected</p>
          </div>
        </div>
      )}

      {/* Bandwidth */}
      {(bandwidth || analytics) && (
        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Bandwidth Usage</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total In</p>
              <p className="text-2xl font-bold text-blue-400">
                {bandwidth ? `${bandwidth.inMB} MB` : formatBytes(analytics?.totalBandwidth?.in || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Out</p>
              <p className="text-2xl font-bold text-purple-400">
                {bandwidth ? `${bandwidth.outMB} MB` : formatBytes(analytics?.totalBandwidth?.out || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-green-400">
                {bandwidth ? `${bandwidth.totalMB} MB` : formatBytes(analytics?.totalBandwidth?.total || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Endpoints */}
      {analytics && analytics.topEndpoints && analytics.topEndpoints.length > 0 && (
        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Top Endpoints</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Endpoint</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Requests</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg Time</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topEndpoints.map((endpoint, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-dark-card transition-colors">
                    <td className="py-3 px-4 text-white font-mono text-sm">{endpoint._id}</td>
                    <td className="py-3 px-4 text-right text-white">{endpoint.count.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{Number(endpoint.avgResponseTime || 0).toFixed(2)}ms</td>
                    <td className="py-3 px-4 text-right">
                      <span className={endpoint.errors > 0 ? 'text-red-400' : 'text-green-400'}>
                        {endpoint.errors}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Queue Stats */}
      {queueStats && (
        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Logging Queue</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Queue Size</p>
              <p className="text-2xl font-bold text-white">{queueStats.queueSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Max Size</p>
              <p className="text-2xl font-bold text-gray-400">{queueStats.maxQueueSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p className="text-2xl font-bold text-green-400">
                {queueStats.processing ? '⚙️ Processing' : '✓ Idle'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Info */}
      {systemHealth && (
        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Memory Usage</p>
              <p className="text-lg font-bold text-white">
                {Number(systemHealth.memoryUsageMB || 0).toFixed(1)} MB
              </p>
              <p className="text-xs text-gray-500">
                {Number(systemHealth.memoryUsagePercent || 0).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">CPU Load</p>
              <p className="text-lg font-bold text-white">
                {Number(systemHealth.cpuLoad || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Uptime</p>
              <p className="text-lg font-bold text-white">
                {Math.floor((systemHealth.uptime || 0) / 3600)}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p className="text-lg font-bold text-green-400">
                {systemHealth.status === 'healthy' ? '✓ Healthy' : '⚠️ Warning'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="text-center text-sm text-gray-500">
        <p>
          {isConnected 
            ? '🟢 Real-time updates active' 
            : '🟡 Polling mode (15s interval)'}
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;

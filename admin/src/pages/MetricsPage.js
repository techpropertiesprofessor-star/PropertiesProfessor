import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import io from 'socket.io-client';

const MetricsPage = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 6h, 24h, 7d
  const [metricType, setMetricType] = useState('all'); // all, cpu, memory, disk, network
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);

  const loadMetrics = useCallback(async () => {
    try {
      const response = await adminApi.getSystemMetrics({ timeRange, type: metricType });
      const data = response.data;
      
      // Handle different response structures
      if (Array.isArray(data)) {
        setMetrics(data);
      } else if (data && Array.isArray(data.metrics)) {
        setMetrics(data.metrics);
      } else if (data && Array.isArray(data.data)) {
        setMetrics(data.data);
      } else {
        console.warn('Unexpected metrics data structure:', data);
        setMetrics([]);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange, metricType]);

  // Socket.IO Connection for Real-time Updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) return;

    // Connect to backend Socket.IO with authentication
    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Metrics] Socket connected');
      setIsLive(true);
      
      // Join admin-observability room
      socket.emit('join-admin-observability', { 
        role: user.role,
        page: 'metrics' 
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ [Metrics] Socket disconnected');
      setIsLive(false);
    });

    // Listen for real-time system health updates
    socket.on('systemHealthUpdate', (data) => {
      console.log('📊 [Metrics] System health update:', data);
      setLastUpdate(new Date());
      
      // Convert system health data to metrics format
      const timestamp = data.timestamp || Date.now();
      const newMetrics = [];
      
      // CPU Metric
      if (data.cpuLoad !== undefined) {
        newMetrics.push({
          timestamp,
          metricType: 'CPU',
          name: 'CPU Load',
          value: data.cpuLoad,
          unit: 'PERCENT',
          status: data.cpuLoad > 80 ? 'RED' : data.cpuLoad > 60 ? 'YELLOW' : 'GREEN',
          component: 'BACKEND'
        });
      }
      
      // Memory Metric
      if (data.memoryUsagePercent !== undefined) {
        newMetrics.push({
          timestamp,
          metricType: 'MEMORY',
          name: 'Memory Usage',
          value: data.memoryUsagePercent,
          unit: 'PERCENT',
          status: data.memoryUsagePercent > 80 ? 'RED' : data.memoryUsagePercent > 60 ? 'YELLOW' : 'GREEN',
          component: 'BACKEND'
        });
      }
      
      // Disk Metric (if available)
      if (data.diskUsage !== undefined) {
        newMetrics.push({
          timestamp,
          metricType: 'DISK',
          name: 'Disk Usage',
          value: data.diskUsage,
          unit: 'PERCENT',
          status: data.diskUsage > 80 ? 'RED' : data.diskUsage > 70 ? 'YELLOW' : 'GREEN',
          component: 'BACKEND'
        });
      }
      
      // Network Metric (using active connections as a proxy)
      if (data.activeConnections !== undefined) {
        newMetrics.push({
          timestamp,
          metricType: 'NETWORK',
          name: 'Active Connections',
          value: data.activeConnections,
          unit: 'COUNT',
          status: data.activeConnections > 100 ? 'YELLOW' : 'GREEN',
          component: 'BACKEND'
        });
      }
      
      // Add new metrics to the existing list
      setMetrics(prevMetrics => {
        const combined = [...prevMetrics, ...newMetrics];
        // Keep only last 100 metrics to prevent memory issues
        return combined.slice(-100);
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[Metrics] Socket connection error:', error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadMetrics]);

  const downloadAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Metric Type', 'Value', 'Unit', 'Status', 'Component', 'Service', 'Instance ID', 'Hostname', 'Environment', 'Threshold Min', 'Threshold Max', 'Is Alert', 'Alert Level', 'Previous Value', 'Change (%)', 'Average (last hour)', 'Peak Value', 'Min Value', 'Sample Count', 'Collection Method', 'Tags', 'Metadata'];
    const csvData = metrics.map(metric => [
      metric._id || '',
      format(new Date(metric.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'),
      metric.metricType || metric.type || '',
      metric.value || 0,
      metric.unit || '',
      metric.status || '',
      metric.component || '',
      metric.service || '',
      metric.instanceId || '',
      metric.hostname || '',
      metric.environment || metric.env || '',
      metric.thresholdMin || metric.minThreshold || '',
      metric.thresholdMax || metric.maxThreshold || '',
      metric.isAlert ? 'Yes' : 'No',
      metric.alertLevel || '',
      metric.previousValue || '',
      metric.changePercent || '',
      metric.avgLastHour || '',
      metric.peakValue || '',
      metric.minValue || '',
      metric.sampleCount || '',
      metric.collectionMethod || '',
      JSON.stringify(metric.tags || []),
      JSON.stringify(metric.metadata || {})
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${timeRange}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = JSON.stringify(metrics, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${timeRange}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Group metrics by type
  const groupedMetrics = (Array.isArray(metrics) ? metrics : []).reduce((acc, metric) => {
    const type = metric.metricType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(metric);
    return acc;
  }, {});

  // Calculate averages
  const getAverage = (metricsList) => {
    if (!metricsList || metricsList.length === 0) return 0;
    const sum = metricsList.reduce((acc, m) => acc + m.value, 0);
    return (sum / metricsList.length).toFixed(2);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'GREEN': return 'text-green-400 bg-green-400/10';
      case 'YELLOW': return 'text-yellow-400 bg-yellow-400/10';
      case 'RED': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  // Get chart color by metric type
  const getChartColors = (type) => {
    switch(type) {
      case 'CPU':
        return {
          stroke: '#ef4444',
          gradient1: '#ef4444',
          gradient2: '#dc2626',
          icon: '🔥'
        };
      case 'MEMORY':
        return {
          stroke: '#8b5cf6',
          gradient1: '#8b5cf6',
          gradient2: '#7c3aed',
          icon: '💾'
        };
      case 'DISK':
        return {
          stroke: '#f59e0b',
          gradient1: '#f59e0b',
          gradient2: '#d97706',
          icon: '💿'
        };
      case 'NETWORK':
        return {
          stroke: '#10b981',
          gradient1: '#10b981',
          gradient2: '#059669',
          icon: '🌐'
        };
      default:
        return {
          stroke: '#3b82f6',
          gradient1: '#3b82f6',
          gradient2: '#2563eb',
          icon: '📊'
        };
    }
  };

  // Format chart data
  const formatChartData = (metricsList) => {
    return metricsList.slice(-20).map(m => ({
      time: format(new Date(m.timestamp), 'HH:mm'),
      value: m.value,
      status: m.status
    }));
  };

  // Get min/max values for a metric list
  const getMetricStats = (metricsList) => {
    if (metricsList.length === 0) return { min: 0, max: 0 };
    const values = metricsList.map(m => m.value);
    return {
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2)
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">System Metrics</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">System Metrics</h1>
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-xs font-medium ${isLive ? 'text-green-400' : 'text-red-400'}`}>
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <p className="text-gray-400 mt-1">
            Real-time performance and resource monitoring
            {lastUpdate && (
              <span className="ml-2 text-xs text-gray-500">
                • Last update: {format(lastUpdate, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Download Buttons */}
          <button
            onClick={downloadAsCSV}
            disabled={metrics.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            📥 CSV
          </button>
          <button
            onClick={downloadAsJSON}
            disabled={metrics.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            📥 JSON
          </button>
          <div className="border-l border-gray-600 mx-2"></div>
          {/* Time Range Filter */}
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-dark-panel border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          
          {/* Metric Type Filter */}
          <select 
            value={metricType} 
            onChange={(e) => setMetricType(e.target.value)}
            className="bg-dark-panel border border-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Metrics</option>
            <option value="CPU">CPU</option>
            <option value="MEMORY">Memory</option>
            <option value="DISK">Disk</option>
            <option value="NETWORK">Network</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['CPU', 'MEMORY', 'DISK', 'NETWORK'].map(type => {
          const typeMetrics = groupedMetrics[type] || [];
          const avg = getAverage(typeMetrics);
          const latest = typeMetrics[typeMetrics.length - 1];
          const status = latest?.status || 'UNKNOWN';
          const value = latest?.value || 0;
          const unit = latest?.unit || '';
          const colors = getChartColors(type);
          const stats = getMetricStats(typeMetrics);
          
          return (
            <div key={type} className="bg-dark-panel rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{colors.icon}</span>
                  <h3 className="text-gray-300 text-sm font-semibold">{type}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>
              <div className="text-4xl font-bold text-white mb-2" style={{ color: colors.stroke }}>
                {Number(value).toFixed(1)}{unit === 'PERCENT' ? '%' : unit === 'COUNT' ? '' : ''}
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Avg: {avg}{unit === 'PERCENT' ? '%' : ''}</span>
                <span>Min: {stats.min} | Max: {stats.max}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts - Full Width Layout */}
      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedMetrics).map(([type, metricsList]) => {
          if (metricsList.length === 0) return null;
          const chartData = formatChartData(metricsList);
          const latest = metricsList[metricsList.length - 1];
          const value = Number(latest?.value || 0);
          const unit = latest?.unit || '';
          const colors = getChartColors(type);
          const stats = getMetricStats(metricsList);
          
          return (
            <div key={type} className="bg-dark-panel rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{colors.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{type} Performance</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Real-time monitoring • Component: {latest?.component}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-4 py-2 text-2xl font-bold rounded-lg ${getStatusColor(latest?.status)}`} style={{ color: colors.stroke }}>
                    {value.toFixed(1)}{unit === 'PERCENT' ? '%' : unit === 'COUNT' ? '' : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Min: {stats.min} • Max: {stats.max} • Avg: {getAverage(metricsList)}
                  </div>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.gradient1} stopOpacity={0.4}/>
                      <stop offset="50%" stopColor={colors.gradient2} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={colors.gradient2} stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id={`stroke-${type}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={colors.gradient1}/>
                      <stop offset="100%" stopColor={colors.gradient2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    tick={{ fill: '#9ca3af' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: `2px solid ${colors.stroke}`,
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                    itemStyle={{ color: colors.stroke }}
                    formatter={(value) => [`${Number(value).toFixed(2)} ${unit}`, type]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={`url(#stroke-${type})`}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#gradient-${type})`}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    <span className="font-semibold text-white">Status:</span> {latest?.status}
                  </span>
                  <span className="text-gray-400">
                    <span className="font-semibold text-white">Unit:</span> {unit}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Showing last 20 data points
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Metrics Table */}
      <div className="bg-dark-panel rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Component</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {metrics.slice(-20).reverse().map((metric, index) => (
                <tr key={index} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {format(new Date(metric.timestamp), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                      {metric.metricType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {metric.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                    {Number(metric.value || 0).toFixed(2)} {metric.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {metric.component}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(metric.status)}`}>
                      {metric.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {metrics.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No metrics data available
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-500">
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
};

export default MetricsPage;

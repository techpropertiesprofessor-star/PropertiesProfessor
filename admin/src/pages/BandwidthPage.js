import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { adminApi } from '../services/api';
import { io } from 'socket.io-client';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BandwidthPage = () => {
  const [bandwidthData, setBandwidthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
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
      console.log('[Bandwidth] Socket connected');
      socket.emit('join-admin-observability', { role: user.role, timeRange });
    });

    socket.on('bandwidthUpdate', (data) => {
      if (!isLive) return;
      console.log('[Bandwidth] Update received:', data);
      // Reload data when bandwidth updates
      loadBandwidthData();
    });

    socket.on('connect_error', (error) => {
      console.error('[Bandwidth] Socket error:', error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [isLive, timeRange]);

  const loadBandwidthData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getBandwidthByUser({ timeRange });
      setBandwidthData(response.data.data);
    } catch (error) {
      console.error('Failed to load bandwidth data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadBandwidthData();
  }, [loadBandwidthData]);

  const formatBytes = (bytes) => {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAsCSV = () => {
    const headers = ['User ID', 'Username', 'Email', 'Role', 'Total Requests', 'Successful Requests', 'Failed Requests', 'Data In (bytes)', 'Data In (formatted)', 'Data Out (bytes)', 'Data Out (formatted)', 'Total Data (bytes)', 'Total Data (formatted)', 'Average Request Size', 'Average Response Size', 'Peak Bandwidth Time', 'First Request', 'Last Request', 'Unique Endpoints', 'Most Used Endpoint', 'Error Rate (%)', 'Metadata'];
    const csvData = bandwidthData.map(user => [
      user.userId || user._id || '',
      user.username || 'Unknown',
      user.email || '',
      user.role || '',
      user.requests || user.totalRequests || 0,
      user.successfulRequests || '',
      user.failedRequests || '',
      user.totalIn || 0,
      formatBytes(user.totalIn || 0),
      user.totalOut || 0,
      formatBytes(user.totalOut || 0),
      user.total || 0,
      formatBytes(user.total || 0),
      user.avgRequestSize || '',
      user.avgResponseSize || '',
      user.peakTime || '',
      user.firstRequest ? format(new Date(user.firstRequest), 'yyyy-MM-dd HH:mm:ss') : '',
      user.lastRequest ? format(new Date(user.lastRequest), 'yyyy-MM-dd HH:mm:ss') : '',
      user.uniqueEndpoints || '',
      user.mostUsedEndpoint || '',
      user.errorRate || '',
      JSON.stringify(user.metadata || {})
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bandwidth-${timeRange}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = JSON.stringify(bandwidthData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bandwidth-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Bandwidth Usage</h1>
          <p className="text-gray-400 mt-1">Data transfer by user</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadAsCSV}
            disabled={bandwidthData.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            📥 CSV
          </button>
          <button
            onClick={downloadAsJSON}
            disabled={bandwidthData.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            📥 JSON
          </button>
          <div className="border-l border-gray-600 mx-2"></div>
          {['1h', '24h', '7d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg ${timeRange === range ? 'bg-purple-600' : 'bg-dark-card'} text-white`}
            >
              {range}
            </button>
          ))}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${isLive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
          >
            {isLive ? '🟢 Live' : '⚪ Paused'}
          </button>
        </div>
      </div>

      <div className="bg-dark-panel rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400">User</th>
                  <th className="text-right py-3 px-4 text-gray-400">Requests</th>
                  <th className="text-right py-3 px-4 text-gray-400">Data In</th>
                  <th className="text-right py-3 px-4 text-gray-400">Data Out</th>
                  <th className="text-right py-3 px-4 text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {bandwidthData.map((user) => (
                  <tr key={user.userId} className="border-b border-gray-800 hover:bg-dark-card">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{user.username || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{user.role}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-white">{user.requests}</td>
                    <td className="py-3 px-4 text-right text-blue-400">{formatBytes(user.totalIn)}</td>
                    <td className="py-3 px-4 text-right text-purple-400">{formatBytes(user.totalOut)}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-semibold">{formatBytes(user.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BandwidthPage;

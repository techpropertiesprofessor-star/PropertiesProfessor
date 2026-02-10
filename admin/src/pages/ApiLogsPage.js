import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { format } from 'date-fns';

const ApiLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });
  const [filters, setFilters] = useState({
    method: '',
    statusCode: '',
    isError: ''
  });

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getApiLogs({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setLogs(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to load API logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusCode) => {
    if (statusCode < 300) return 'text-green-400';
    if (statusCode < 400) return 'text-blue-400';
    if (statusCode < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-blue-900 text-blue-200',
      POST: 'bg-green-900 text-green-200',
      PUT: 'bg-yellow-900 text-yellow-200',
      DELETE: 'bg-red-900 text-red-200',
      PATCH: 'bg-purple-900 text-purple-200'
    };
    return colors[method] || 'bg-gray-900 text-gray-200';
  };

  const downloadAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Method', 'Endpoint', 'Status Code', 'Status Text', 'Response Time (ms)', 'Request Size (bytes)', 'Response Size (bytes)', 'User', 'User ID', 'User Role', 'IP Address', 'User Agent', 'Session ID', 'Request Headers', 'Request Body', 'Request Query', 'Response Headers', 'Response Body', 'Error Message', 'Error Stack', 'Is Error', 'Controller', 'Action', 'Metadata'];
    const csvData = logs.map(log => [
      log._id || '',
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'),
      log.method || '',
      log.endpoint || log.url || log.path || '',
      log.statusCode || '',
      log.statusText || '',
      log.responseTime || '',
      log.requestSize || log.reqSize || '',
      log.responseSize || log.resSize || '',
      log.user?.username || log.username || 'Anonymous',
      log.user?._id || log.userId || '',
      log.user?.role || log.userRole || '',
      log.ipAddress || log.ip || '',
      log.userAgent || '',
      log.sessionId || '',
      JSON.stringify(log.requestHeaders || log.reqHeaders || {}),
      JSON.stringify(log.requestBody || log.reqBody || {}),
      JSON.stringify(log.query || log.requestQuery || {}),
      JSON.stringify(log.responseHeaders || log.resHeaders || {}),
      JSON.stringify(log.responseBody || log.resBody || {}),
      log.errorMessage || log.error?.message || '',
      log.errorStack || log.error?.stack || '',
      log.isError || log.error ? 'true' : 'false',
      log.controller || '',
      log.action || '',
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
    a.download = `api-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">API Logs</h1>
          <p className="text-gray-400 mt-1">API request and response monitoring</p>
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Method</label>
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white"
            >
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filters.statusCode}
              onChange={(e) => setFilters({ ...filters, statusCode: e.target.value })}
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white"
            >
              <option value="">All Status</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Errors Only</label>
            <select
              value={filters.isError}
              onChange={(e) => setFilters({ ...filters, isError: e.target.value })}
              className="w-full px-4 py-2 bg-dark-card border border-gray-600 rounded-lg text-white"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={loadLogs} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-dark-panel rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-400">Timestamp</th>
                  <th className="text-left py-3 px-4 text-gray-400">Method</th>
                  <th className="text-left py-3 px-4 text-gray-400">Endpoint</th>
                  <th className="text-right py-3 px-4 text-gray-400">Status</th>
                  <th className="text-right py-3 px-4 text-gray-400">Time</th>
                  <th className="text-right py-3 px-4 text-gray-400">Size</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-gray-800 hover:bg-dark-card">
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(log.method)}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-white font-mono">{log.endpoint}</td>
                    <td className={`py-3 px-4 text-right text-sm font-semibold ${getStatusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-300">{log.responseTime}ms</td>
                    <td className="py-3 px-4 text-right text-sm text-gray-300">
                      {((log.requestSize + log.responseSize) / 1024).toFixed(1)}KB
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
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-dark-card rounded-lg text-white disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="px-4 py-2 bg-dark-card rounded-lg text-white">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 bg-dark-card rounded-lg text-white disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ApiLogsPage;

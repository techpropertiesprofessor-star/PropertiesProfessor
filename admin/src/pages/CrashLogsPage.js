import React, { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { format } from 'date-fns';

const CrashLogsPage = () => {
  const [crashes, setCrashes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrash, setSelectedCrash] = useState(null);

  useEffect(() => {
    loadCrashes();
  }, []);

  const loadCrashes = async () => {
    try {
      const response = await adminApi.getCrashLogs();
      const data = response.data;
      
      if (Array.isArray(data)) {
        setCrashes(data);
      } else if (data && Array.isArray(data.crashes)) {
        setCrashes(data.crashes);
      } else if (data && Array.isArray(data.data)) {
        setCrashes(data.data);
      } else {
        console.warn('Unexpected crash logs data structure:', data);
        setCrashes([]);
      }
    } catch (error) {
      console.error('Failed to load crash logs:', error);
      setCrashes([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch(severity?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-400 bg-red-400/10';
      case 'HIGH': return 'text-orange-400 bg-orange-400/10';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10';
      case 'LOW': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getCrashTypeIcon = (type) => {
    switch(type) {
      case 'UNCAUGHT_EXCEPTION': return '💥';
      case 'UNHANDLED_REJECTION': return '⚠️';
      case 'MEMORY_LEAK': return '🧠';
      case 'TIMEOUT': return '⏱️';
      case 'DATABASE_ERROR': return '🗄️';
      case 'API_ERROR': return '🌐';
      default: return '❌';
    }
  };

  const downloadAsCSV = () => {
    const headers = ['ID', 'Timestamp', 'Crash Type', 'Component', 'Severity', 'Status', 'Error Message', 'Error Name', 'Error Code', 'Error Stack', 'Recovered', 'Recovered At', 'Recovery Method', 'Environment', 'Node Version', 'Platform', 'Memory Usage (MB)', 'CPU Usage (%)', 'Uptime (seconds)', 'PID', 'User ID', 'Request URL', 'Request Method', 'Session ID', 'IP Address', 'User Agent', 'Additional Info', 'Metadata'];
    const csvData = crashes.map(crash => [
      crash._id || '',
      format(new Date(crash.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'),
      crash.crashType || crash.type || '',
      crash.component || '',
      crash.severity || '',
      crash.status || '',
      crash.errorMessage || crash.message || '',
      crash.errorName || crash.name || '',
      crash.errorCode || crash.code || '',
      crash.errorStack || crash.stack || '',
      crash.recovered ? 'Yes' : 'No',
      crash.recoveredAt ? format(new Date(crash.recoveredAt), 'yyyy-MM-dd HH:mm:ss.SSS') : '',
      crash.recoveryMethod || '',
      crash.environment || crash.env || '',
      crash.nodeVersion || crash.metadata?.nodeVersion || '',
      crash.platform || crash.metadata?.platform || '',
      crash.memoryUsage || crash.metadata?.memoryUsage || '',
      crash.cpuUsage || crash.metadata?.cpuUsage || '',
      crash.uptime || crash.metadata?.uptime || '',
      crash.pid || crash.metadata?.pid || '',
      crash.userId || crash.metadata?.userId || '',
      crash.requestUrl || crash.url || crash.metadata?.url || '',
      crash.requestMethod || crash.method || crash.metadata?.method || '',
      crash.sessionId || crash.metadata?.sessionId || '',
      crash.ipAddress || crash.ip || crash.metadata?.ip || '',
      crash.userAgent || crash.metadata?.userAgent || '',
      crash.additionalInfo || crash.info || '',
      JSON.stringify(crash.metadata || {})
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crash-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = JSON.stringify(crashes, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crash-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Crash Logs</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Crash Logs</h1>
          <p className="text-gray-400 mt-1">System crashes and recovery events</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadAsCSV}
            disabled={crashes.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center gap-2"
          >
            📥 CSV
          </button>
          <button
            onClick={downloadAsJSON}
            disabled={crashes.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors flex items-center gap-2"
          >
            📥 JSON
          </button>
          <button
            onClick={loadCrashes}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Crashes</span>
            <span className="text-2xl">💥</span>
          </div>
          <p className="text-3xl font-bold text-white">{crashes.length}</p>
        </div>

        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Critical</span>
            <span className="text-2xl">🔴</span>
          </div>
          <p className="text-3xl font-bold text-red-400">
            {crashes.filter(c => c.severity === 'CRITICAL').length}
          </p>
        </div>

        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Recovered</span>
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-3xl font-bold text-green-400">
            {crashes.filter(c => c.recovered).length}
          </p>
        </div>

        <div className="bg-dark-panel rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Last 24h</span>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {crashes.filter(c => {
              const crashTime = new Date(c.timestamp);
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              return crashTime > dayAgo;
            }).length}
          </p>
        </div>
      </div>

      {/* Crash Logs List */}
      <div className="bg-dark-panel rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Recent Crashes</h2>
        </div>

        {crashes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-lg">🎉 No crashes recorded</p>
            <p className="text-gray-500 text-sm mt-2">System is running smoothly!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 bg-dark-card">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Component</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Severity</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Message</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {crashes.map((crash, index) => (
                  <tr 
                    key={crash._id || index} 
                    className="border-b border-gray-800 hover:bg-dark-card transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCrashTypeIcon(crash.crashType)}</span>
                        <span className="text-white text-sm font-mono">{crash.crashType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-blue-400 font-semibold">{crash.component}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(crash.severity)}`}>
                        {crash.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white text-sm truncate max-w-xs">
                        {crash.errorMessage}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-gray-300 text-sm">
                      {format(new Date(crash.timestamp), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4">
                      {crash.recovered ? (
                        <span className="text-green-400 text-sm">✅ Recovered</span>
                      ) : (
                        <span className="text-red-400 text-sm">❌ Not Recovered</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedCrash(crash)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Crash Details Modal */}
      {selectedCrash && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCrash(null)}
        >
          <div 
            className="bg-dark-panel rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-dark-panel border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Crash Details</h2>
              <button
                onClick={() => setSelectedCrash(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Crash Type</label>
                  <p className="text-white font-semibold mt-1 flex items-center gap-2">
                    <span className="text-2xl">{getCrashTypeIcon(selectedCrash.crashType)}</span>
                    {selectedCrash.crashType}
                  </p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Component</label>
                  <p className="text-blue-400 font-semibold mt-1">{selectedCrash.component}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Severity</label>
                  <p className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(selectedCrash.severity)}`}>
                      {selectedCrash.severity}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Time</label>
                  <p className="text-white font-semibold mt-1">
                    {format(new Date(selectedCrash.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div>
                <label className="text-gray-400 text-sm">Error Message</label>
                <div className="bg-dark-card rounded-lg p-4 mt-2">
                  <p className="text-red-400 font-mono text-sm">{selectedCrash.errorMessage}</p>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedCrash.errorStack && (
                <div>
                  <label className="text-gray-400 text-sm">Stack Trace</label>
                  <div className="bg-dark-card rounded-lg p-4 mt-2 overflow-x-auto">
                    <pre className="text-gray-300 font-mono text-xs whitespace-pre-wrap">
                      {selectedCrash.errorStack}
                    </pre>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedCrash.metadata && Object.keys(selectedCrash.metadata).length > 0 && (
                <div>
                  <label className="text-gray-400 text-sm">Additional Information</label>
                  <div className="bg-dark-card rounded-lg p-4 mt-2">
                    <pre className="text-gray-300 font-mono text-xs">
                      {JSON.stringify(selectedCrash.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Recovery Status */}
              <div className="flex items-center justify-between bg-dark-card rounded-lg p-4">
                <span className="text-gray-400">Recovery Status</span>
                {selectedCrash.recovered ? (
                  <span className="text-green-400 font-semibold">✅ System Recovered</span>
                ) : (
                  <span className="text-red-400 font-semibold">❌ Not Recovered</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrashLogsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';

// ============== HELPER COMPONENTS ==============

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const StatusBadge = ({ ok, label }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
    ok ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
  }`}>
    {ok ? '✓' : '✗'} {label}
  </span>
);

const ProgressBar = ({ percent, height = 'h-2' }) => {
  const p = Math.min(parseFloat(percent) || 0, 100);
  const barColor = p > 90 ? 'bg-red-500' : p > 70 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className={`w-full bg-gray-700 rounded-full ${height}`}>
      <div className={`${height} rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${p}%` }} />
    </div>
  );
};

const SectionHeader = ({ icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {subtitle && <p className="text-gray-500 text-xs font-mono mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-dark-card rounded-xl border border-gray-700 p-4 ${className}`}>{children}</div>
);

// ============== TAB DEFINITIONS ==============
const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'api-health', label: 'API Health', icon: '🔌' },
  { id: 'database', label: 'Database', icon: '🗄️' },
  { id: 'crashes', label: 'Crashes', icon: '💥' },
  { id: 'diagnose', label: 'Diagnose', icon: '🔍' },
];

const SeverityBadge = ({ severity }) => {
  const styles = {
    CRITICAL: 'bg-red-600/20 text-red-400 border-red-600/40',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    LOW: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
  };
  const icons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold border ${styles[severity] || 'bg-gray-600/20 text-gray-400 border-gray-600/40'}`}>
      {icons[severity] || '⚪'} {severity}
    </span>
  );
};

const CheckStatusIcon = ({ status }) => {
  const map = { PASS: '✅', FAIL: '❌', WARN: '⚠️', SKIP: '⏭️' };
  return <span>{map[status] || '❓'}</span>;
};

// ============== MAIN COMPONENT ==============
const BiosPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [diagnostics, setDiagnostics] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [apiHealthLoading, setApiHealthLoading] = useState(false);
  const [diagnoseData, setDiagnoseData] = useState(null);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [errorLogs, setErrorLogs] = useState(null);
  const [errorLogsLoading, setErrorLogsLoading] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadDiagnostics = useCallback(async () => {
    try {
      const res = await adminApi.getBiosFullDiagnostics();
      setDiagnostics(res.data.data);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      if (err.response?.status === 403) setError('SUPER ADMIN ACCESS REQUIRED');
      else setError('Failed to load diagnostics');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadApiHealth = useCallback(async () => {
    setApiHealthLoading(true);
    try {
      const res = await adminApi.getBiosApiHealth();
      setApiHealth(res.data.data);
    } catch (err) {
      console.error('API health check failed:', err);
    } finally {
      setApiHealthLoading(false);
    }
  }, []);

  const loadStorage = useCallback(async () => {
    try {
      const res = await adminApi.getBiosStorage();
      setStorage(res.data.data);
    } catch (err) {
      console.error('Storage check failed:', err);
    }
  }, []);

  useEffect(() => {
    loadDiagnostics();
    loadStorage();
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDiagnostics();
        if (activeTab === 'storage') loadStorage();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [loadDiagnostics, loadStorage, autoRefresh, activeTab]);

  const loadDiagnose = useCallback(async () => {
    setDiagnoseLoading(true);
    try {
      const res = await adminApi.getBiosDiagnose();
      setDiagnoseData(res.data.data);
    } catch (err) {
      console.error('Diagnosis failed:', err);
    } finally {
      setDiagnoseLoading(false);
    }
  }, []);

  const loadErrorLogs = useCallback(async (hours = 24) => {
    setErrorLogsLoading(true);
    try {
      const res = await adminApi.getBiosErrorLogs(hours);
      setErrorLogs(res.data.data);
    } catch (err) {
      console.error('Error logs failed:', err);
    } finally {
      setErrorLogsLoading(false);
    }
  }, []);

  const loadDiagnosticReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await adminApi.getBiosDiagnosticReport();
      setDiagnosticReport(res.data.data);
    } catch (err) {
      console.error('Diagnostic report failed:', err);
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Load API health when tab is clicked (not auto-refresh, it's heavy)
  useEffect(() => {
    if (activeTab === 'api-health' && !apiHealth) {
      loadApiHealth();
    }
  }, [activeTab, apiHealth, loadApiHealth]);

  // Load diagnose data when tab is clicked
  useEffect(() => {
    if (activeTab === 'diagnose' && !diagnoseData) {
      loadDiagnose();
      loadErrorLogs();
    }
  }, [activeTab, diagnoseData, loadDiagnose, loadErrorLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4" />
          <p className="text-green-400 font-mono animate-pulse">LOADING SYSTEM DIAGNOSTICS...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-8 text-center">
          <p className="text-red-400 text-xl font-mono mb-2">⛔ {error}</p>
          <button onClick={loadDiagnostics} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm">Retry</button>
        </div>
      </div>
    );
  }

  const d = diagnostics;
  const uptime = d?.systemInfo?.processUptime || 0;
  const uptimeStr = `${String(Math.floor(uptime / 3600)).padStart(2, '0')}:${String(Math.floor((uptime % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(uptime % 60)).padStart(2, '0')}`;
  const memPercent = d?.systemInfo ? (((d.systemInfo.totalMemory - d.systemInfo.freeMemory) / d.systemInfo.totalMemory) * 100).toFixed(1) : 0;
  const heapPercent = d?.processMemory ? ((d.processMemory.heapUsed / d.processMemory.heapTotal) * 100).toFixed(1) : 0;

  const getStatusColor = (status) => ({ GREEN: 'text-green-400', YELLOW: 'text-yellow-400', RED: 'text-red-400' }[status] || 'text-gray-400');
  const getStatusBg = (status) => ({ GREEN: 'bg-green-500/10 border-green-500/30', YELLOW: 'bg-yellow-500/10 border-yellow-500/30', RED: 'bg-red-500/10 border-red-500/30' }[status] || 'bg-gray-500/10 border-gray-500/30');
  const getStatusIcon = (status) => ({ GREEN: '✅', YELLOW: '⚠️', RED: '❌' }[status] || '❓');
  const getStatusLabel = (status) => ({ GREEN: 'OPERATIONAL', YELLOW: 'WARNING', RED: 'CRITICAL' }[status] || 'UNKNOWN');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🖥️</span> BIOS System Panel
          </h1>
          <p className="text-gray-500 text-xs font-mono mt-1">
            Super Admin Diagnostics • Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${autoRefresh ? 'bg-green-600/20 text-green-400 border border-green-600/40' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
            {autoRefresh ? '● AUTO 5s' : '○ AUTO OFF'}
          </button>
          <button onClick={() => { loadDiagnostics(); loadStorage(); if (apiHealth) loadApiHealth(); }}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-mono">↻ REFRESH</button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className={`rounded-lg border p-3 text-center ${getStatusBg(d?.overallStatus)}`}>
          <p className="text-xs text-gray-400 font-mono">STATUS</p>
          <p className={`text-lg font-bold font-mono ${getStatusColor(d?.overallStatus)}`}>{getStatusIcon(d?.overallStatus)} {d?.overallStatus}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-dark-card p-3 text-center">
          <p className="text-xs text-gray-400 font-mono">UPTIME</p>
          <p className="text-lg font-bold text-white font-mono">{uptimeStr}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-dark-card p-3 text-center">
          <p className="text-xs text-gray-400 font-mono">MEMORY</p>
          <p className={`text-lg font-bold font-mono ${parseFloat(memPercent) > 85 ? 'text-red-400' : 'text-green-400'}`}>{memPercent}%</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-dark-card p-3 text-center">
          <p className="text-xs text-gray-400 font-mono">DB</p>
          <p className={`text-lg font-bold font-mono ${d?.dbStats?.connectionState === 'CONNECTED' ? 'text-green-400' : 'text-red-400'}`}>
            {d?.dbStats?.connectionState === 'CONNECTED' ? '● ON' : '● OFF'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-dark-card p-3 text-center">
          <p className="text-xs text-gray-400 font-mono">CRASHES</p>
          <p className={`text-lg font-bold font-mono ${d?.recentCrashes?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {d?.recentCrashes?.length || 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-mono whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-dark-card text-gray-400 hover:bg-dark-hover border border-gray-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && <OverviewTab d={d} memPercent={memPercent} heapPercent={heapPercent} getStatusColor={getStatusColor} getStatusBg={getStatusBg} getStatusIcon={getStatusIcon} getStatusLabel={getStatusLabel} />}
        {activeTab === 'storage' && <StorageTab storage={storage} d={d} loadStorage={loadStorage} />}
        {activeTab === 'api-health' && <ApiHealthTab apiHealth={apiHealth} loading={apiHealthLoading} onRefresh={loadApiHealth} />}
        {activeTab === 'database' && <DatabaseTab d={d} />}
        {activeTab === 'crashes' && <CrashesTab d={d} />}
        {activeTab === 'diagnose' && <DiagnoseTab data={diagnoseData} loading={diagnoseLoading} onRunDiagnose={loadDiagnose} errorLogs={errorLogs} errorLogsLoading={errorLogsLoading} onLoadErrorLogs={loadErrorLogs} diagnosticReport={diagnosticReport} reportLoading={reportLoading} onGenerateReport={loadDiagnosticReport} />}
      </div>
    </div>
  );
};

// ============== OVERVIEW TAB ==============
const OverviewTab = ({ d, memPercent, heapPercent, getStatusColor, getStatusBg, getStatusIcon, getStatusLabel }) => (
  <div className="space-y-4">
    {/* Component Status */}
    <div>
      <SectionHeader icon="📋" title="COMPONENT STATUS" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {d?.components?.map((c) => (
          <div key={c.component} className={`rounded-xl border p-4 ${getStatusBg(c.status)}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-mono font-bold text-sm">{c.component}</span>
              <span>{getStatusIcon(c.status)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono ${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span>
              {c.responseTime && <span className="text-xs text-gray-400 font-mono">{c.responseTime}ms</span>}
            </div>
            {c.message && <p className="text-xs text-gray-500 font-mono mt-1 truncate">{c.message}</p>}
          </div>
        ))}
      </div>
    </div>

    {/* System Resources */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Server Info */}
      <Card>
        <h3 className="text-sm font-bold text-gray-400 mb-3 font-mono">🖥️ SERVER INFO</h3>
        <div className="space-y-2 text-sm font-mono">
          {[
            ['HOSTNAME', d?.systemInfo?.hostname],
            ['PLATFORM', `${d?.systemInfo?.platform} (${d?.systemInfo?.arch})`],
            ['NODE.JS', d?.systemInfo?.nodeVersion],
            ['CPUs', `${d?.systemInfo?.cpus}x ${d?.systemInfo?.cpuModel}`],
            ['CPU SPEED', `${d?.systemInfo?.cpuSpeed} MHz`],
            ['PID', d?.systemInfo?.pid],
            ['OS UPTIME', d?.systemInfo?.osUptime ? `${Math.floor(d.systemInfo.osUptime / 3600)}h ${Math.floor((d.systemInfo.osUptime % 3600) / 60)}m` : '-'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-gray-400">{k}</span><span className="text-white truncate ml-2">{v}</span></div>
          ))}
        </div>
      </Card>

      {/* Memory */}
      <Card>
        <h3 className="text-sm font-bold text-gray-400 mb-3 font-mono">🧠 MEMORY</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">System RAM: {formatBytes((d?.systemInfo?.totalMemory || 0) - (d?.systemInfo?.freeMemory || 0))} / {formatBytes(d?.systemInfo?.totalMemory)}</span>
              <span className={parseFloat(memPercent) > 85 ? 'text-red-400' : 'text-green-400'}>{memPercent}%</span>
            </div>
            <ProgressBar percent={memPercent} height="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-gray-400">Heap: {formatBytes(d?.processMemory?.heapUsed)} / {formatBytes(d?.processMemory?.heapTotal)}</span>
              <span className={parseFloat(heapPercent) > 85 ? 'text-red-400' : 'text-blue-400'}>{heapPercent}%</span>
            </div>
            <ProgressBar percent={heapPercent} height="h-2" />
          </div>
          <div className="text-xs font-mono text-gray-500 space-y-1">
            <div className="flex justify-between"><span>RSS</span><span>{formatBytes(d?.processMemory?.rss)}</span></div>
            <div className="flex justify-between"><span>External</span><span>{formatBytes(d?.processMemory?.external)}</span></div>
          </div>
        </div>
      </Card>
    </div>

    {/* Disk Quick View */}
    {d?.diskUsage?.length > 0 && (
      <div>
        <SectionHeader icon="💽" title="DISK QUICK VIEW" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {d.diskUsage.map((disk) => (
            <Card key={disk.drive}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-mono font-bold">{disk.drive}</span>
                <span className={`text-sm font-mono font-bold ${parseFloat(disk.usedPercent) > 90 ? 'text-red-400' : parseFloat(disk.usedPercent) > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {disk.usedPercent}%
                </span>
              </div>
              <ProgressBar percent={disk.usedPercent} height="h-3" />
              <div className="flex justify-between mt-1 text-xs font-mono text-gray-500">
                <span>Used: {formatBytes(disk.used)}</span>
                <span>Free: {formatBytes(disk.free)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ============== STORAGE TAB ==============
const StorageTab = ({ storage, d, loadStorage }) => {
  if (!storage) return <div className="text-gray-400 text-center py-8 font-mono">Loading storage data...</div>;

  return (
    <div className="space-y-4">
      {/* Disk Usage */}
      <div>
        <SectionHeader icon="💽" title="DISK USAGE" subtitle="Physical storage drives"
          action={<button onClick={loadStorage} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs font-mono">↻ Refresh</button>} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {storage.diskUsage?.map((disk) => (
            <Card key={disk.drive}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-mono font-bold text-lg">{disk.drive}</span>
                <span className={`text-sm font-mono font-bold ${parseFloat(disk.usedPercent) > 90 ? 'text-red-400' : parseFloat(disk.usedPercent) > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {disk.usedPercent}% used
                </span>
              </div>
              <ProgressBar percent={disk.usedPercent} height="h-4" />
              <div className="flex justify-between mt-2 text-xs font-mono text-gray-400">
                <span>Used: {formatBytes(disk.used)}</span>
                <span>Free: {formatBytes(disk.free)}</span>
                <span>Total: {formatBytes(disk.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Project Folder Sizes */}
      <div>
        <SectionHeader icon="📁" title="PROJECT FOLDERS" subtitle="Size of each module" />
        <Card>
          <div className="space-y-3">
            {storage.folderSizes?.map((folder) => {
              const totalProjectSize = storage.folderSizes.reduce((s, f) => s + f.size, 0);
              const pct = totalProjectSize > 0 ? ((folder.size / totalProjectSize) * 100).toFixed(1) : 0;
              return (
                <div key={folder.name}>
                  <div className="flex justify-between text-sm font-mono mb-1">
                    <span className="text-white">📂 {folder.name}</span>
                    <span className="text-gray-400">{formatBytes(folder.size)}</span>
                  </div>
                  <ProgressBar percent={pct} />
                </div>
              );
            })}
            <div className="border-t border-gray-600 pt-2 flex justify-between text-sm font-mono font-bold">
              <span className="text-white">TOTAL</span>
              <span className="text-blue-400">{formatBytes(storage.folderSizes?.reduce((s, f) => s + f.size, 0))}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Uploads Breakdown */}
      {storage.uploadsBreakdown?.length > 0 && (
        <div>
          <SectionHeader icon="📎" title="UPLOADS BREAKDOWN" subtitle="Files stored in uploads directory" />
          <Card>
            <div className="space-y-2">
              {storage.uploadsBreakdown.map((dir) => (
                <div key={dir.name} className="flex justify-between text-sm font-mono">
                  <span className="text-gray-300">📁 {dir.name}</span>
                  <span className="text-gray-400">{formatBytes(dir.size)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Database Storage */}
      {storage.dbStorage && !storage.dbStorage.error && (
        <div>
          <SectionHeader icon="🗄️" title="DATABASE STORAGE" subtitle="MongoDB storage usage" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Data Size', formatBytes(storage.dbStorage.dataSize), '📊'],
              ['Storage Size', formatBytes(storage.dbStorage.storageSize), '💾'],
              ['Index Size', formatBytes(storage.dbStorage.indexSize), '🔍'],
              ['Total Objects', (storage.dbStorage.objects || 0).toLocaleString(), '📄'],
            ].map(([label, value, icon]) => (
              <Card key={label} className="text-center">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-lg font-bold text-white font-mono">{value}</p>
                <p className="text-xs text-gray-400 font-mono">{label}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== API HEALTH TAB ==============
const ApiHealthTab = ({ apiHealth, loading, onRefresh }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mx-auto mb-3" />
          <p className="text-blue-400 font-mono text-sm animate-pulse">CHECKING ALL API ENDPOINTS...</p>
          <p className="text-gray-500 font-mono text-xs mt-1">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (!apiHealth) return <div className="text-gray-400 text-center py-8 font-mono">Click refresh to check API health</div>;

  const { summary, groups } = apiHealth;
  const healthPct = parseFloat(summary.healthPercent);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="text-center">
          <p className="text-xs text-gray-400 font-mono">TOTAL</p>
          <p className="text-2xl font-bold text-white font-mono">{summary.total}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-400 font-mono">HEALTHY</p>
          <p className="text-2xl font-bold text-green-400 font-mono">{summary.healthy}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-400 font-mono">FAILED</p>
          <p className={`text-2xl font-bold font-mono ${summary.failed > 0 ? 'text-red-400' : 'text-green-400'}`}>{summary.failed}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-400 font-mono">HEALTH %</p>
          <p className={`text-2xl font-bold font-mono ${healthPct >= 90 ? 'text-green-400' : healthPct >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{summary.healthPercent}%</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <button onClick={onRefresh} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-mono">🔄 Re-check All APIs</button>
      </div>

      {/* Endpoint Groups */}
      {Object.entries(groups).map(([groupName, endpoints]) => {
        const allOk = endpoints.every(e => e.ok);
        const failedCount = endpoints.filter(e => !e.ok).length;
        return (
          <Card key={groupName}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                {allOk ? '✅' : '❌'} {groupName}
              </h3>
              {failedCount > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">{failedCount} failed</span>
              )}
            </div>
            <div className="space-y-2">
              {endpoints.map((ep) => (
                <div key={ep.path} className={`flex items-center justify-between p-2 rounded-lg ${ep.ok ? 'bg-green-500/5' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge ok={ep.ok} label={ep.status || 'ERR'} />
                    <div className="min-w-0">
                      <span className="text-white text-sm font-mono">{ep.name}</span>
                      <p className="text-gray-500 text-xs font-mono truncate">{ep.method} {ep.path}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-xs font-mono ${ep.responseTime > 1000 ? 'text-red-400' : ep.responseTime > 300 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {ep.responseTime}ms
                    </span>
                    {ep.error && <p className="text-xs text-red-400 font-mono">{ep.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ============== DATABASE TAB ==============
const DatabaseTab = ({ d }) => {
  if (!d?.dbStats) return <div className="text-gray-400 text-center py-8 font-mono">No database info</div>;
  const db = d.dbStats;

  return (
    <div className="space-y-4">
      {/* Connection Info */}
      <Card>
        <SectionHeader icon="🔗" title="CONNECTION" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
          {[
            ['State', db.connectionState, db.connectionState === 'CONNECTED' ? 'text-green-400' : 'text-red-400'],
            ['Host', db.host, 'text-white'],
            ['Database', db.name, 'text-blue-400'],
            ['Collections', db.totalCollections, 'text-white'],
          ].map(([label, value, color]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`font-bold truncate ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Storage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Data Size', formatBytes(db.dataSize), '📊'],
          ['Storage Size', formatBytes(db.storageSize), '💾'],
          ['Index Size', formatBytes(db.indexSize), '🔍'],
          ['Total Objects', (db.objects || 0).toLocaleString(), '📄'],
        ].map(([label, value, icon]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-lg font-bold text-white font-mono">{value}</p>
            <p className="text-xs text-gray-400 font-mono">{label}</p>
          </Card>
        ))}
      </div>

      {/* Collection Details */}
      {db.collections?.length > 0 && (
        <div>
          <SectionHeader icon="📋" title="COLLECTIONS" subtitle={`${db.collections.length} collections`} />
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-600">
                    <th className="text-left py-2 px-2">Collection</th>
                    <th className="text-right py-2 px-2">Documents</th>
                    <th className="text-right py-2 px-2">Data Size</th>
                    <th className="text-right py-2 px-2">Storage</th>
                    <th className="text-right py-2 px-2">Indexes</th>
                    <th className="text-right py-2 px-2">Index Size</th>
                  </tr>
                </thead>
                <tbody>
                  {db.collections.map((col) => (
                    <tr key={col.name} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-1.5 px-2 text-white">{col.name}</td>
                      <td className="py-1.5 px-2 text-right text-gray-300">{(col.count || 0).toLocaleString()}</td>
                      <td className="py-1.5 px-2 text-right text-gray-300">{formatBytes(col.size)}</td>
                      <td className="py-1.5 px-2 text-right text-gray-300">{formatBytes(col.storageSize)}</td>
                      <td className="py-1.5 px-2 text-right text-gray-300">{col.indexes || 0}</td>
                      <td className="py-1.5 px-2 text-right text-gray-300">{formatBytes(col.indexSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

// ============== CRASHES TAB ==============
const CrashesTab = ({ d }) => {
  const crashes = d?.recentCrashes || [];

  if (crashes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-green-400 font-mono text-lg">NO RECENT CRASHES</p>
        <p className="text-gray-500 font-mono text-sm mt-1">System is running smoothly</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader icon="💥" title="RECENT CRASHES" subtitle={`Last ${crashes.length} crash events`} />
      {crashes.map((crash, i) => (
        <Card key={crash._id || i} className={crash.severity === 'CRITICAL' ? 'border-red-500/50' : ''}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                crash.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                crash.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>{crash.severity || 'UNKNOWN'}</span>
              <span className="text-xs text-gray-400 font-mono">{crash.crashType || crash.type}</span>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {crash.timestamp ? new Date(crash.timestamp).toLocaleString() : '-'}
            </span>
          </div>
          <p className="text-white text-sm font-mono mb-1">{crash.errorMessage || crash.message || 'Unknown error'}</p>
          <p className="text-gray-500 text-xs font-mono">{crash.component || 'BACKEND'}</p>
          {(crash.stack || crash.stackTrace) && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 font-mono cursor-pointer hover:text-gray-300">Stack trace</summary>
              <pre className="mt-1 text-xs text-gray-600 font-mono bg-black/30 p-2 rounded overflow-x-auto max-h-32">{crash.stack || crash.stackTrace}</pre>
            </details>
          )}
        </Card>
      ))}
    </div>
  );
};

// ============== DIAGNOSE TAB ==============
const DiagnoseTab = ({ data, loading, onRunDiagnose, errorLogs, errorLogsLoading, onLoadErrorLogs, diagnosticReport, reportLoading, onGenerateReport }) => {
  const [activeSubTab, setActiveSubTab] = useState('diagnosis');
  const [errorHours, setErrorHours] = useState(24);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [expandedReportIssue, setExpandedReportIssue] = useState(null);

  const healthColors = {
    CRITICAL: 'from-red-900/40 to-red-800/20 border-red-600/60',
    WARNING: 'from-orange-900/40 to-orange-800/20 border-orange-500/60',
    ATTENTION: 'from-yellow-900/40 to-yellow-800/20 border-yellow-500/60',
    HEALTHY: 'from-green-900/40 to-green-800/20 border-green-500/60',
  };
  const healthIcons = { CRITICAL: '🚨', WARNING: '⚠️', ATTENTION: '🔔', HEALTHY: '✅' };
  const healthText = { CRITICAL: 'text-red-400', WARNING: 'text-orange-400', ATTENTION: 'text-yellow-400', HEALTHY: 'text-green-400' };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Download the diagnostic report as an HTML file
  const handleDownloadReport = () => {
    if (!diagnosticReport) return;
    const r = diagnosticReport;
    const printContent = `
<!DOCTYPE html>
<html><head><title>Diagnostic Report - ${r.reportId}</title>
<style>
  body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; padding: 40px; }
  h1 { color: #60a5fa; border-bottom: 2px solid #60a5fa; padding-bottom: 10px; }
  h2 { color: #34d399; margin-top: 30px; }
  h3 { color: #fbbf24; }
  .header-box { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 15px 0; }
  .issue-card { background: #1a1a1a; border-left: 4px solid #ef4444; border-radius: 4px; padding: 15px; margin: 10px 0; }
  .issue-card.high { border-left-color: #f97316; }
  .issue-card.medium { border-left-color: #eab308; }
  .issue-card.low { border-left-color: #3b82f6; }
  .solution-step { background: #0d1117; padding: 8px 12px; margin: 4px 0; border-radius: 4px; border-left: 3px solid #22d3ee; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-critical { background: #7f1d1d; color: #fca5a5; }
  .badge-high { background: #7c2d12; color: #fdba74; }
  .badge-medium { background: #713f12; color: #fde047; }
  .badge-low { background: #1e3a5f; color: #93c5fd; }
  .check-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .check-item { background: #111; padding: 8px; border-radius: 4px; border: 1px solid #333; }
  .pass { color: #34d399; } .fail { color: #ef4444; } .warn { color: #fbbf24; }
  .prevention { background: #0d2818; border: 1px solid #166534; border-radius: 4px; padding: 10px; margin: 5px 0; }
  .snapshot-table { width: 100%; border-collapse: collapse; }
  .snapshot-table td { padding: 6px 12px; border-bottom: 1px solid #222; }
  .snapshot-table td:first-child { color: #9ca3af; width: 200px; }
</style></head><body>
<h1>🖥️ BIOS DIAGNOSTIC REPORT</h1>
<div class="header-box">
  <p><strong>Report ID:</strong> ${r.reportId}</p>
  <p><strong>Generated:</strong> ${new Date(r.generatedAt).toLocaleString()}</p>
  <p><strong>Generated By:</strong> ${r.generatedBy}</p>
  <p><strong>Duration:</strong> ${r.duration}ms</p>
</div>
<h2>📋 EXECUTIVE SUMMARY</h2>
<div class="header-box">
  <p><strong>Overall Health:</strong> <span class="${r.executiveSummary.overallHealth === 'HEALTHY' ? 'pass' : r.executiveSummary.overallHealth === 'CRITICAL' ? 'fail' : 'warn'}">${r.executiveSummary.overallHealth}</span></p>
  <p><strong>Total Issues:</strong> ${r.executiveSummary.totalIssues} (Critical: ${r.executiveSummary.criticalCount}, High: ${r.executiveSummary.highCount}, Medium: ${r.executiveSummary.mediumCount}, Low: ${r.executiveSummary.lowCount})</p>
  <p><strong>Recommendation:</strong> ${r.executiveSummary.recommendation}</p>
</div>
<h2>🖥️ SYSTEM SNAPSHOT</h2>
<table class="snapshot-table">
  <tr><td>Hostname</td><td>${r.systemSnapshot.hostname}</td></tr>
  <tr><td>Platform</td><td>${r.systemSnapshot.platform}</td></tr>
  <tr><td>Node.js</td><td>${r.systemSnapshot.nodeVersion}</td></tr>
  <tr><td>CPUs</td><td>${r.systemSnapshot.cpus}</td></tr>
  <tr><td>Memory Usage</td><td>${r.systemSnapshot.memoryUsagePercent}%</td></tr>
  <tr><td>Heap Usage</td><td>${r.systemSnapshot.heapPercent}%</td></tr>
  <tr><td>Database</td><td>${r.systemSnapshot.dbState}</td></tr>
  <tr><td>Process Uptime</td><td>${Math.floor(r.systemSnapshot.processUptime / 3600)}h ${Math.floor((r.systemSnapshot.processUptime % 3600) / 60)}m</td></tr>
</table>
<h2>🔍 DIAGNOSTIC CHECKS (${r.diagnosticChecks.length})</h2>
<div class="check-grid">
  ${r.diagnosticChecks.map(c => `<div class="check-item"><span class="${c.status === 'PASS' ? 'pass' : c.status === 'FAIL' ? 'fail' : 'warn'}">${c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️'}</span> <strong>${c.name}</strong><br><small>${c.detail}</small></div>`).join('')}
</div>
${r.solutionReport.length > 0 ? `
<h2>🛠️ SOLUTION REPORT (${r.solutionReport.length} Issues)</h2>
${r.solutionReport.map(s => `
<div class="issue-card ${s.severity.toLowerCase()}">
  <h3><span class="badge badge-${s.severity.toLowerCase()}">${s.severity}</span> #${s.issueNumber}: ${s.title}</h3>
  <p><strong>Category:</strong> ${s.category} | <strong>Est. Time:</strong> ${s.estimatedTime} | <strong>Risk:</strong> ${s.riskLevel}${s.requiresRestart ? ' | ⚠️ Requires Restart' : ''}</p>
  <p><strong>Details:</strong> ${s.detail}</p>
  <p><strong>Quick Fix:</strong> ${s.quickFix}</p>
  <h4>Step-by-Step Solution:</h4>
  ${s.solutionSteps.map(step => `<div class="solution-step">${step}</div>`).join('')}
  ${s.preventionTips ? `<div class="prevention"><strong>🛡️ Prevention Tips:</strong><ul>${s.preventionTips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
</div>
`).join('')}` : '<h2>🎉 NO ISSUES FOUND</h2><p>All systems are running normally.</p>'}
<hr style="border-color: #333; margin: 30px 0;">
<p style="color: #666; text-align: center;">BIOS System Panel • Auto-generated Diagnostic Report • ${new Date().toLocaleString()}</p>
</body></html>`;
    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diagnostic_Report_${r.reportId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print/Export the diagnostic report
  const handlePrintReport = () => {
    if (!diagnosticReport) return;
    const r = diagnosticReport;
    const printContent = `
<!DOCTYPE html>
<html><head><title>Diagnostic Report - ${r.reportId}</title>
<style>
  body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; padding: 40px; }
  h1 { color: #60a5fa; border-bottom: 2px solid #60a5fa; padding-bottom: 10px; }
  h2 { color: #34d399; margin-top: 30px; }
  h3 { color: #fbbf24; }
  .header-box { background: #1a1a2e; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 15px 0; }
  .issue-card { background: #1a1a1a; border-left: 4px solid #ef4444; border-radius: 4px; padding: 15px; margin: 10px 0; }
  .issue-card.high { border-left-color: #f97316; }
  .issue-card.medium { border-left-color: #eab308; }
  .issue-card.low { border-left-color: #3b82f6; }
  .solution-step { background: #0d1117; padding: 8px 12px; margin: 4px 0; border-radius: 4px; border-left: 3px solid #22d3ee; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-critical { background: #7f1d1d; color: #fca5a5; }
  .badge-high { background: #7c2d12; color: #fdba74; }
  .badge-medium { background: #713f12; color: #fde047; }
  .badge-low { background: #1e3a5f; color: #93c5fd; }
  .check-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .check-item { background: #111; padding: 8px; border-radius: 4px; border: 1px solid #333; }
  .pass { color: #34d399; } .fail { color: #ef4444; } .warn { color: #fbbf24; }
  .prevention { background: #0d2818; border: 1px solid #166534; border-radius: 4px; padding: 10px; margin: 5px 0; }
  .snapshot-table { width: 100%; border-collapse: collapse; }
  .snapshot-table td { padding: 6px 12px; border-bottom: 1px solid #222; }
  .snapshot-table td:first-child { color: #9ca3af; width: 200px; }
  @media print { body { background: white; color: black; } .header-box, .issue-card, .solution-step, .check-item { border: 1px solid #ccc; } }
</style></head><body>
<h1>🖥️ BIOS DIAGNOSTIC REPORT</h1>
<div class="header-box">
  <p><strong>Report ID:</strong> ${r.reportId}</p>
  <p><strong>Generated:</strong> ${new Date(r.generatedAt).toLocaleString()}</p>
  <p><strong>Generated By:</strong> ${r.generatedBy}</p>
  <p><strong>Duration:</strong> ${r.duration}ms</p>
</div>

<h2>📋 EXECUTIVE SUMMARY</h2>
<div class="header-box">
  <p><strong>Overall Health:</strong> <span class="${r.executiveSummary.overallHealth === 'HEALTHY' ? 'pass' : r.executiveSummary.overallHealth === 'CRITICAL' ? 'fail' : 'warn'}">${r.executiveSummary.overallHealth}</span></p>
  <p><strong>Total Issues:</strong> ${r.executiveSummary.totalIssues} (Critical: ${r.executiveSummary.criticalCount}, High: ${r.executiveSummary.highCount}, Medium: ${r.executiveSummary.mediumCount}, Low: ${r.executiveSummary.lowCount})</p>
  <p><strong>Recommendation:</strong> ${r.executiveSummary.recommendation}</p>
</div>

<h2>🖥️ SYSTEM SNAPSHOT</h2>
<table class="snapshot-table">
  <tr><td>Hostname</td><td>${r.systemSnapshot.hostname}</td></tr>
  <tr><td>Platform</td><td>${r.systemSnapshot.platform}</td></tr>
  <tr><td>Node.js</td><td>${r.systemSnapshot.nodeVersion}</td></tr>
  <tr><td>CPUs</td><td>${r.systemSnapshot.cpus}</td></tr>
  <tr><td>Memory Usage</td><td>${r.systemSnapshot.memoryUsagePercent}%</td></tr>
  <tr><td>Heap Usage</td><td>${r.systemSnapshot.heapPercent}%</td></tr>
  <tr><td>Database</td><td>${r.systemSnapshot.dbState}</td></tr>
  <tr><td>Process Uptime</td><td>${Math.floor(r.systemSnapshot.processUptime / 3600)}h ${Math.floor((r.systemSnapshot.processUptime % 3600) / 60)}m</td></tr>
</table>

<h2>🔍 DIAGNOSTIC CHECKS (${r.diagnosticChecks.length})</h2>
<div class="check-grid">
  ${r.diagnosticChecks.map(c => `<div class="check-item"><span class="${c.status === 'PASS' ? 'pass' : c.status === 'FAIL' ? 'fail' : 'warn'}">${c.status === 'PASS' ? '✅' : c.status === 'FAIL' ? '❌' : '⚠️'}</span> <strong>${c.name}</strong><br><small>${c.detail}</small></div>`).join('')}
</div>

${r.solutionReport.length > 0 ? `
<h2>🛠️ SOLUTION REPORT (${r.solutionReport.length} Issues)</h2>
${r.solutionReport.map(s => `
<div class="issue-card ${s.severity.toLowerCase()}">
  <h3><span class="badge badge-${s.severity.toLowerCase()}">${s.severity}</span> #${s.issueNumber}: ${s.title}</h3>
  <p><strong>Category:</strong> ${s.category} | <strong>Est. Time:</strong> ${s.estimatedTime} | <strong>Risk:</strong> ${s.riskLevel}${s.requiresRestart ? ' | ⚠️ Requires Restart' : ''}</p>
  <p><strong>Details:</strong> ${s.detail}</p>
  <p><strong>Quick Fix:</strong> ${s.quickFix}</p>
  <h4>Step-by-Step Solution:</h4>
  ${s.solutionSteps.map(step => `<div class="solution-step">${step}</div>`).join('')}
  ${s.preventionTips ? `<div class="prevention"><strong>🛡️ Prevention Tips:</strong><ul>${s.preventionTips.map(t => `<li>${t}</li>`).join('')}</ul></div>` : ''}
</div>
`).join('')}` : '<h2>🎉 NO ISSUES FOUND</h2><p>All systems are running normally.</p>'}

<hr style="border-color: #333; margin: 30px 0;">
<p style="color: #666; text-align: center;">BIOS System Panel • Auto-generated Diagnostic Report • ${new Date().toLocaleString()}</p>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      // Popup blocked — download as HTML file instead
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diagnostic_Report_${r.reportId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {['diagnosis', 'report', 'error-logs'].map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              activeSubTab === tab ? 'bg-purple-600 text-white' : 'bg-dark-card text-gray-400 hover:bg-dark-hover border border-gray-700'
            }`}>
            {tab === 'diagnosis' ? '🔍 System Diagnosis' : tab === 'report' ? '📄 Diagnostic Report' : '📋 Error Logs'}
          </button>
        ))}
      </div>

      {activeSubTab === 'diagnosis' && (
        <>
          {/* Run Diagnosis Button */}
          <div className="flex items-center justify-between">
            <SectionHeader icon="🔍" title="Smart System Diagnosis" subtitle="15+ automated checks across all components" />
            <button
              onClick={onRunDiagnose}
              disabled={loading}
              className={`px-5 py-2.5 rounded-lg text-sm font-mono font-bold transition-all flex items-center gap-2 ${
                loading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/20'
              }`}>
              {loading ? (
                <><span className="animate-spin">⏳</span> SCANNING...</>
              ) : (
                <><span>🚀</span> RUN FULL DIAGNOSIS</>
              )}
            </button>
          </div>

          {loading && !data && (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-3" />
                <p className="text-purple-400 font-mono animate-pulse text-sm">Running 15+ diagnostic checks...</p>
              </div>
            </div>
          )}

          {data && (
            <>
              {/* Overall Health Card */}
              <div className={`bg-gradient-to-r ${healthColors[data.overallHealth]} border rounded-xl p-5 mb-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{healthIcons[data.overallHealth]}</span>
                    <div>
                      <h3 className={`text-2xl font-bold font-mono ${healthText[data.overallHealth]}`}>{data.overallHealth}</h3>
                      <p className="text-gray-400 text-xs font-mono">Completed in {data.duration}ms • {data.checks?.length} checks</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-center">
                    {data.summary?.critical > 0 && <div><p className="text-2xl font-bold text-red-400 font-mono">{data.summary.critical}</p><p className="text-xs text-gray-500">Critical</p></div>}
                    {data.summary?.high > 0 && <div><p className="text-2xl font-bold text-orange-400 font-mono">{data.summary.high}</p><p className="text-xs text-gray-500">High</p></div>}
                    {data.summary?.medium > 0 && <div><p className="text-2xl font-bold text-yellow-400 font-mono">{data.summary.medium}</p><p className="text-xs text-gray-500">Medium</p></div>}
                    {data.summary?.low > 0 && <div><p className="text-2xl font-bold text-blue-300 font-mono">{data.summary.low}</p><p className="text-xs text-gray-500">Low</p></div>}
                    {data.summary?.total === 0 && <div><p className="text-2xl font-bold text-green-400 font-mono">0</p><p className="text-xs text-gray-500">Issues</p></div>}
                  </div>
                </div>
                {/* Quick action: Generate Report if issues found */}
                {data.issues?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-600/30 flex items-center justify-between">
                    <p className="text-gray-400 text-xs font-mono">💡 Issues detected — generate a full diagnostic report with solutions</p>
                    <button
                      onClick={() => { setActiveSubTab('report'); onGenerateReport(); }}
                      className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20">
                      📄 Generate Solution Report
                    </button>
                  </div>
                )}
              </div>

              {/* Checks Grid */}
              <Card>
                <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">📋 CHECK RESULTS</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.checks?.map((check, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border text-xs font-mono ${
                      check.status === 'PASS' ? 'bg-green-500/5 border-green-700/30' :
                      check.status === 'FAIL' ? 'bg-red-500/10 border-red-700/40' :
                      check.status === 'WARN' ? 'bg-yellow-500/5 border-yellow-700/30' :
                      'bg-gray-700/20 border-gray-600/30'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckStatusIcon status={check.status} />
                        <span className="text-white font-bold truncate">{check.name}</span>
                      </div>
                      <p className="text-gray-400 truncate" title={check.detail}>{check.detail}</p>
                      <p className="text-gray-600 mt-0.5">{check.duration}ms</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Issues List — Clickable with expandable details */}
              {data.issues?.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-300 font-mono">🛑 DETECTED ISSUES ({data.issues.length}) — Click to expand</h3>
                  {data.issues.map((issue, i) => (
                    <div key={i}
                      className={`rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        issue.severity === 'CRITICAL' ? 'border-l-4 border-l-red-500 border-red-700/30 hover:border-red-600/60' :
                        issue.severity === 'HIGH' ? 'border-l-4 border-l-orange-500 border-orange-700/30 hover:border-orange-600/60' :
                        issue.severity === 'MEDIUM' ? 'border-l-4 border-l-yellow-500 border-yellow-700/30 hover:border-yellow-600/60' :
                        'border-l-4 border-l-blue-400 border-blue-700/30 hover:border-blue-600/60'
                      } bg-dark-card`}
                      onClick={() => setExpandedIssue(expandedIssue === i ? null : i)}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={issue.severity} />
                            <span className="bg-gray-700/50 px-2 py-0.5 rounded text-xs font-mono text-gray-300">{issue.category}</span>
                          </div>
                          <span className="text-gray-500 text-xs font-mono">{expandedIssue === i ? '▲ Collapse' : '▼ Expand'}</span>
                        </div>
                        <h4 className="text-white font-bold font-mono text-sm mb-1">{issue.title}</h4>
                        <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap bg-black/20 p-2 rounded mb-2 max-h-16 overflow-hidden">{issue.detail}</pre>
                      </div>

                      {/* Expanded view with suggestion and action */}
                      {expandedIssue === i && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3" onClick={(e) => e.stopPropagation()}>
                          {/* Full Detail */}
                          <div>
                            <p className="text-xs text-gray-500 font-mono mb-1">📝 FULL DETAILS</p>
                            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap bg-black/30 p-3 rounded max-h-48 overflow-auto">{issue.detail}</pre>
                          </div>

                          {/* Quick Fix Suggestion */}
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">💡</span>
                              <div>
                                <p className="text-blue-400 text-xs font-mono font-bold mb-1">QUICK FIX SUGGESTION</p>
                                <p className="text-blue-300 text-xs font-mono">{issue.suggestion}</p>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveSubTab('report'); onGenerateReport(); }}
                              className="px-3 py-1.5 bg-cyan-600/20 border border-cyan-600/40 hover:bg-cyan-600/30 rounded-lg text-cyan-400 text-xs font-mono transition-colors">
                              📄 Get Full Solution Report
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`Issue: ${issue.title}\nSeverity: ${issue.severity}\nCategory: ${issue.category}\nDetail: ${issue.detail}\nSuggestion: ${issue.suggestion}`); }}
                              className="px-3 py-1.5 bg-gray-700/50 border border-gray-600/40 hover:bg-gray-600/50 rounded-lg text-gray-300 text-xs font-mono transition-colors">
                              📋 Copy Details
                            </button>
                          </div>

                          {/* Timestamp */}
                          <p className="text-gray-600 text-[10px] font-mono">Detected at: {new Date(issue.timestamp).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <span className="text-4xl">🎉</span>
                  <h3 className="text-green-400 font-bold font-mono mt-2">ALL SYSTEMS HEALTHY</h3>
                  <p className="text-gray-500 text-xs font-mono mt-1">No issues detected across {data.checks?.length} diagnostic checks</p>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* =================== DIAGNOSTIC REPORT SUB-TAB =================== */}
      {activeSubTab === 'report' && (
        <>
          <div className="flex items-center justify-between">
            <SectionHeader icon="📄" title="Diagnostic Report" subtitle="Full system diagnosis with step-by-step solutions" />
            <div className="flex gap-2">
              {diagnosticReport && (
                <>
                  <button onClick={handleDownloadReport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-mono font-bold flex items-center gap-1.5">
                    💾 Download
                  </button>
                  <button onClick={handlePrintReport}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-xs font-mono font-bold flex items-center gap-1.5">
                    🖨️ Print / Export
                  </button>
                </>
              )}
              <button
                onClick={onGenerateReport}
                disabled={reportLoading}
                className={`px-5 py-2.5 rounded-lg text-sm font-mono font-bold transition-all flex items-center gap-2 ${
                  reportLoading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20'
                }`}>
                {reportLoading ? <><span className="animate-spin">⏳</span> GENERATING...</> : <><span>📄</span> GENERATE REPORT</>}
              </button>
            </div>
          </div>

          {reportLoading && !diagnosticReport && (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto mb-3" />
                <p className="text-cyan-400 font-mono animate-pulse text-sm">Analyzing system & generating solutions...</p>
              </div>
            </div>
          )}

          {diagnosticReport && (
            <div className="space-y-4">
              {/* Report Header */}
              <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-600/40 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">📋 {diagnosticReport.reportId}</h3>
                    <p className="text-gray-400 text-xs font-mono mt-1">
                      Generated: {new Date(diagnosticReport.generatedAt).toLocaleString()} • By: {diagnosticReport.generatedBy} • Duration: {diagnosticReport.duration}ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className={`bg-gradient-to-r ${healthColors[diagnosticReport.executiveSummary.overallHealth]} border rounded-xl p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{healthIcons[diagnosticReport.executiveSummary.overallHealth]}</span>
                  <div>
                    <h3 className={`text-xl font-bold font-mono ${healthText[diagnosticReport.executiveSummary.overallHealth]}`}>
                      {diagnosticReport.executiveSummary.overallHealth}
                    </h3>
                    <p className="text-gray-400 text-xs font-mono">
                      {diagnosticReport.executiveSummary.totalIssues} issues found
                      (🔴 {diagnosticReport.executiveSummary.criticalCount} • 🟠 {diagnosticReport.executiveSummary.highCount} • 🟡 {diagnosticReport.executiveSummary.mediumCount} • 🔵 {diagnosticReport.executiveSummary.lowCount})
                    </p>
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 mt-2">
                  <p className="text-gray-300 text-sm font-mono">
                    <span className="text-cyan-400 font-bold">📌 Recommendation:</span> {diagnosticReport.executiveSummary.recommendation}
                  </p>
                </div>
                {diagnosticReport.executiveSummary.topPriorities?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 font-mono mb-2">🎯 TOP PRIORITIES:</p>
                    <div className="space-y-1">
                      {diagnosticReport.executiveSummary.topPriorities.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 bg-black/10 rounded px-3 py-1.5 text-xs font-mono">
                          <SeverityBadge severity={p.severity} />
                          <span className="text-white">{p.title}</span>
                          <span className="text-gray-500 ml-auto truncate max-w-xs">→ {p.quickFix}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* System Snapshot */}
              <Card>
                <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">🖥️ SYSTEM SNAPSHOT</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  {[
                    ['Hostname', diagnosticReport.systemSnapshot.hostname],
                    ['Platform', diagnosticReport.systemSnapshot.platform],
                    ['Node.js', diagnosticReport.systemSnapshot.nodeVersion],
                    ['CPUs', diagnosticReport.systemSnapshot.cpus],
                    ['RAM Usage', `${diagnosticReport.systemSnapshot.memoryUsagePercent}%`],
                    ['Heap', `${diagnosticReport.systemSnapshot.heapPercent}%`],
                    ['RSS', formatBytes(diagnosticReport.systemSnapshot.rss)],
                    ['Database', diagnosticReport.systemSnapshot.dbState],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-black/20 rounded-lg p-2.5">
                      <p className="text-gray-500 text-[10px]">{k}</p>
                      <p className="text-white font-bold truncate">{v}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Diagnostic Checks */}
              <Card>
                <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">🔍 DIAGNOSTIC CHECKS ({diagnosticReport.diagnosticChecks.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {diagnosticReport.diagnosticChecks.map((check, i) => (
                    <div key={i} className={`rounded-lg p-2.5 border text-xs font-mono ${
                      check.status === 'PASS' ? 'bg-green-500/5 border-green-700/30' :
                      check.status === 'FAIL' ? 'bg-red-500/10 border-red-700/40' :
                      check.status === 'WARN' ? 'bg-yellow-500/5 border-yellow-700/30' :
                      'bg-gray-700/20 border-gray-600/30'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckStatusIcon status={check.status} />
                        <span className="text-white font-bold truncate">{check.name}</span>
                      </div>
                      <p className="text-gray-400 truncate">{check.detail}</p>
                      <p className="text-gray-600 mt-0.5">{check.duration}ms</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Solution Report — The Main Part */}
              {diagnosticReport.solutionReport?.length > 0 ? (
                <div className="space-y-3">
                  <SectionHeader icon="🛠️" title={`SOLUTION REPORT (${diagnosticReport.solutionReport.length} Issues)`} subtitle="Click each issue for step-by-step fix instructions" />
                  {diagnosticReport.solutionReport.map((sol, i) => (
                    <div key={i}
                      className={`rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg bg-dark-card ${
                        sol.severity === 'CRITICAL' ? 'border-l-4 border-l-red-500 border-red-700/30' :
                        sol.severity === 'HIGH' ? 'border-l-4 border-l-orange-500 border-orange-700/30' :
                        sol.severity === 'MEDIUM' ? 'border-l-4 border-l-yellow-500 border-yellow-700/30' :
                        'border-l-4 border-l-blue-400 border-blue-700/30'
                      }`}
                      onClick={() => setExpandedReportIssue(expandedReportIssue === i ? null : i)}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-mono font-bold text-sm">#{sol.issueNumber}</span>
                            <SeverityBadge severity={sol.severity} />
                            <span className="bg-gray-700/50 px-2 py-0.5 rounded text-xs font-mono text-gray-300">{sol.category}</span>
                            <span className="bg-cyan-900/30 px-2 py-0.5 rounded text-xs font-mono text-cyan-400">⏱ {sol.estimatedTime}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${sol.riskLevel === 'HIGH' ? 'bg-red-900/30 text-red-400' : sol.riskLevel === 'MEDIUM' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-green-900/30 text-green-400'}`}>
                              Risk: {sol.riskLevel}
                            </span>
                            {sol.requiresRestart && <span className="bg-orange-900/30 px-2 py-0.5 rounded text-xs font-mono text-orange-400">⚠️ Restart Required</span>}
                          </div>
                          <span className="text-gray-500 text-xs font-mono shrink-0 ml-2">{expandedReportIssue === i ? '▲' : '▼'}</span>
                        </div>
                        <h4 className="text-white font-bold font-mono text-sm">{sol.title}</h4>
                        <p className="text-gray-400 text-xs font-mono mt-1">{sol.detail}</p>
                      </div>

                      {expandedReportIssue === i && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50 pt-3" onClick={(e) => e.stopPropagation()}>
                          {/* Quick Fix */}
                          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-blue-400 text-xs font-mono font-bold mb-1">💡 QUICK FIX</p>
                            <p className="text-blue-300 text-xs font-mono">{sol.quickFix}</p>
                          </div>

                          {/* Step-by-step solution */}
                          <div>
                            <p className="text-cyan-400 text-xs font-mono font-bold mb-2">🔧 STEP-BY-STEP SOLUTION</p>
                            <div className="space-y-1.5">
                              {sol.solutionSteps.map((step, j) => (
                                <div key={j} className="bg-cyan-900/10 border border-cyan-800/20 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 hover:bg-cyan-900/20 transition-colors">
                                  {step}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Prevention tips */}
                          {sol.preventionTips?.length > 0 && (
                            <div className="bg-green-900/10 border border-green-700/20 rounded-lg p-3">
                              <p className="text-green-400 text-xs font-mono font-bold mb-2">🛡️ PREVENTION TIPS</p>
                              <ul className="space-y-1">
                                {sol.preventionTips.map((tip, j) => (
                                  <li key={j} className="text-green-300/80 text-xs font-mono flex items-start gap-2">
                                    <span className="text-green-500">•</span> {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Meta info */}
                          <div className="flex gap-4 text-[10px] font-mono text-gray-600 pt-1">
                            <span>Est. Time: {sol.estimatedTime}</span>
                            <span>Risk: {sol.riskLevel}</span>
                            {sol.requiresRestart && <span className="text-orange-500">⚠️ Server restart required</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <span className="text-4xl">🎉</span>
                  <h3 className="text-green-400 font-bold font-mono mt-2">ALL SYSTEMS HEALTHY</h3>
                  <p className="text-gray-500 text-xs font-mono mt-1">No issues detected — no solutions needed</p>
                </Card>
              )}
            </div>
          )}

          {!reportLoading && !diagnosticReport && (
            <Card className="text-center py-12">
              <span className="text-5xl mb-3 block">📄</span>
              <h3 className="text-gray-300 font-bold font-mono text-lg mb-2">Generate Diagnostic Report</h3>
              <p className="text-gray-500 text-sm font-mono mb-4 max-w-md mx-auto">
                Run a full system diagnosis and generate a detailed report with step-by-step solutions for every detected issue.
              </p>
              <button
                onClick={onGenerateReport}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-xl text-white font-mono font-bold transition-all shadow-lg shadow-cyan-500/20">
                🚀 Generate Full Report
              </button>
            </Card>
          )}
        </>
      )}

      {activeSubTab === 'error-logs' && (
        <>
          <div className="flex items-center justify-between">
            <SectionHeader icon="📋" title="Error Logs" subtitle="API errors, activity errors, and crashes" />
            <div className="flex items-center gap-2">
              <select
                value={errorHours}
                onChange={(e) => { setErrorHours(parseInt(e.target.value)); onLoadErrorLogs(parseInt(e.target.value)); }}
                className="bg-dark-card border border-gray-700 text-gray-300 text-xs font-mono rounded-lg px-3 py-2">
                <option value={1}>Last 1h</option>
                <option value={6}>Last 6h</option>
                <option value={24}>Last 24h</option>
                <option value={72}>Last 3 days</option>
                <option value={168}>Last 7 days</option>
              </select>
              <button onClick={() => onLoadErrorLogs(errorHours)} disabled={errorLogsLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-white text-xs font-mono">
                {errorLogsLoading ? '⏳' : '↻'} Refresh
              </button>
            </div>
          </div>

          {errorLogsLoading && !errorLogs && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          )}

          {errorLogs && (
            <>
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="text-center">
                  <p className="text-xs text-gray-500 font-mono">5xx Errors</p>
                  <p className={`text-xl font-bold font-mono ${errorLogs.stats?.total5xx > 0 ? 'text-red-400' : 'text-green-400'}`}>{errorLogs.stats?.total5xx || 0}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-gray-500 font-mono">4xx Errors</p>
                  <p className={`text-xl font-bold font-mono ${errorLogs.stats?.total4xx > 0 ? 'text-yellow-400' : 'text-green-400'}`}>{errorLogs.stats?.total4xx || 0}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-gray-500 font-mono">Activity Errors</p>
                  <p className={`text-xl font-bold font-mono ${errorLogs.stats?.totalActivityErrors > 0 ? 'text-orange-400' : 'text-green-400'}`}>{errorLogs.stats?.totalActivityErrors || 0}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-gray-500 font-mono">Crashes</p>
                  <p className={`text-xl font-bold font-mono ${errorLogs.stats?.totalCrashes > 0 ? 'text-red-400' : 'text-green-400'}`}>{errorLogs.stats?.totalCrashes || 0}</p>
                </Card>
                <Card className="text-center">
                  <p className="text-xs text-gray-500 font-mono">Time Range</p>
                  <p className="text-xl font-bold font-mono text-gray-300">{errorLogs.stats?.timeRange}</p>
                </Card>
              </div>

              {/* API Errors */}
              {errorLogs.apiErrors?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">🔴 API ERRORS ({errorLogs.apiErrors.length})</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {errorLogs.apiErrors.map((err, i) => (
                      <div key={i} className={`flex items-center justify-between py-2 px-3 rounded text-xs font-mono border ${
                        err.statusCode >= 500 ? 'bg-red-900/10 border-red-800/30' : 'bg-yellow-900/10 border-yellow-800/20'
                      }`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            err.statusCode >= 500 ? 'bg-red-600/30 text-red-400' : 'bg-yellow-600/30 text-yellow-400'
                          }`}>{err.statusCode}</span>
                          <span className="text-gray-400 w-12">{err.method}</span>
                          <span className="text-white truncate flex-1" title={err.endpoint}>{err.endpoint}</span>
                          {err.error && <span className="text-gray-500 truncate max-w-xs" title={err.error}>{err.error}</span>}
                        </div>
                        <span className="text-gray-600 ml-2 whitespace-nowrap">{new Date(err.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Activity Errors */}
              {errorLogs.activityErrors?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">🟠 ACTIVITY ERRORS ({errorLogs.activityErrors.length})</h3>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {errorLogs.activityErrors.map((err, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 rounded text-xs font-mono bg-orange-900/10 border border-orange-800/20">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="bg-orange-600/30 text-orange-400 px-1.5 py-0.5 rounded font-bold">{err.actionType}</span>
                          <span className="text-white truncate" title={err.route}>{err.route || '-'}</span>
                          <span className="text-gray-400 truncate" title={err.errorMessage}>{err.errorMessage || err.username || '-'}</span>
                        </div>
                        <span className="text-gray-600 ml-2 whitespace-nowrap">{new Date(err.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Crashes */}
              {errorLogs.recentCrashes?.length > 0 && (
                <Card>
                  <h3 className="text-sm font-bold text-gray-300 font-mono mb-3">💥 CRASHES ({errorLogs.recentCrashes.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {errorLogs.recentCrashes.map((crash, i) => (
                      <div key={i} className="py-2 px-3 rounded text-xs font-mono bg-red-900/10 border border-red-800/30">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={crash.severity} />
                            <span className="text-gray-400">{crash.crashType}</span>
                            <span className="text-gray-500">{crash.component}</span>
                          </div>
                          <span className="text-gray-600">{new Date(crash.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-white">{crash.errorMessage}</p>
                        {crash.errorStack && (
                          <details className="mt-1">
                            <summary className="text-gray-500 cursor-pointer hover:text-gray-300">Stack trace</summary>
                            <pre className="mt-1 text-gray-600 bg-black/30 p-2 rounded overflow-x-auto max-h-24">{crash.errorStack}</pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* No errors */}
              {(!errorLogs.apiErrors?.length && !errorLogs.activityErrors?.length && !errorLogs.recentCrashes?.length) && (
                <Card className="text-center py-8">
                  <span className="text-4xl">🎉</span>
                  <h3 className="text-green-400 font-bold font-mono mt-2">NO ERRORS FOUND</h3>
                  <p className="text-gray-500 text-xs font-mono mt-1">No errors in the selected time range</p>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default BiosPage;

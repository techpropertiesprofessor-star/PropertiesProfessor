/**
 * BIOS CONTROLLER
 * Comprehensive system health, storage, API health, and diagnostics
 * Must work independently even if main app crashes
 */

const systemHealthMonitor = require('../../services/observability/systemHealthMonitor');
const HealthCheck = require('../../models/observability/HealthCheck');
const CrashLog = require('../../models/observability/CrashLog');
const ActivityLog = require('../../models/observability/ActivityLog');
const ApiLog = require('../../models/observability/ApiLog');
const os = require('os');
const mongoose = require('mongoose');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// ============== HELPER: Internal API health check ==============
function checkEndpoint(port, urlPath, method = 'GET', token = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({
          path: urlPath,
          method,
          status: res.statusCode,
          responseTime: Date.now() - startTime,
          ok: res.statusCode >= 200 && res.statusCode < 500,
          error: null
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        path: urlPath,
        method,
        status: 0,
        responseTime: Date.now() - startTime,
        ok: false,
        error: err.message
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({
        path: urlPath,
        method,
        status: 0,
        responseTime: 5000,
        ok: false,
        error: 'TIMEOUT'
      });
    });
    if (method === 'POST') req.write('{}');
    req.end();
  });
}

// ============== HELPER: Get disk usage (Windows & Linux) ==============
function getDiskUsage() {
  try {
    if (os.platform() === 'win32') {
      const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8', timeout: 5000 });
      const lines = output.trim().split('\n').filter(l => l.trim());
      const disks = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 3) {
          const caption = parts[0];
          const freeSpace = parseInt(parts[1]) || 0;
          const size = parseInt(parts[2]) || 0;
          if (size > 0) {
            disks.push({
              drive: caption,
              total: size,
              free: freeSpace,
              used: size - freeSpace,
              usedPercent: ((size - freeSpace) / size * 100).toFixed(1)
            });
          }
        }
      }
      return disks;
    } else {
      const output = execSync("df -B1 / | tail -1", { encoding: 'utf8', timeout: 5000 });
      const parts = output.trim().split(/\s+/);
      return [{
        drive: parts[0],
        total: parseInt(parts[1]) || 0,
        used: parseInt(parts[2]) || 0,
        free: parseInt(parts[3]) || 0,
        usedPercent: (parts[4] || '0%').replace('%', '')
      }];
    }
  } catch (e) {
    return [{ drive: 'unknown', total: 0, free: 0, used: 0, usedPercent: '0', error: e.message }];
  }
}

// ============== HELPER: Get folder size (fast, async) ==============
function getFolderSizeAsync(folderPath) {
  return new Promise((resolve) => {
    const fs = require('fs');
    if (!fs.existsSync(folderPath)) return resolve(0);
    resolve(getNodeFolderSize(folderPath, true));
  });
}

// Node.js-based recursive folder size
// includeNodeModules: if true, does a quick estimate for node_modules via dir command
function getNodeFolderSize(dirPath, includeHeavyDirs = false) {
  const fs = require('fs');
  let total = 0;
  const heavyDirs = ['node_modules', '.git', 'build', '.next', 'dist'];
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      try {
        if (item.isFile()) {
          total += fs.statSync(fullPath).size;
        } else if (item.isDirectory()) {
          if (heavyDirs.includes(item.name)) {
            if (includeHeavyDirs) {
              // Quick estimate: count number of entries * avg file size
              try {
                const count = fs.readdirSync(fullPath).length;
                // For node_modules, rough estimate: each package ~50KB avg
                if (item.name === 'node_modules') {
                  total += count * 50 * 1024; // rough estimate
                } else {
                  total += getNodeFolderSize(fullPath, false);
                }
              } catch(e) {}
            }
          } else {
            total += getNodeFolderSize(fullPath, includeHeavyDirs);
          }
        }
      } catch (e) { /* skip inaccessible */ }
    }
  } catch (e) { /* skip */ }
  return total;
}

// Get node_modules size separately (async)
function getNodeModulesSize(projectPath) {
  return new Promise((resolve) => {
    const nmPath = path.join(projectPath, 'node_modules');
    const fs = require('fs');
    if (!fs.existsSync(nmPath)) return resolve(0);
    
    const { exec } = require('child_process');
    if (os.platform() === 'win32') {
      exec(`dir /s /-c "${nmPath}"`, { timeout: 30000, shell: 'cmd.exe', maxBuffer: 100 * 1024 * 1024 }, (err, stdout) => {
        if (err || !stdout) return resolve(0);
        const lines = stdout.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.includes('File(s)') && line.includes('bytes')) {
            const match = line.match(/(\d+)\s+bytes/);
            if (match) return resolve(parseInt(match[1]) || 0);
          }
        }
        resolve(0);
      });
    } else {
      exec(`du -sb "${nmPath}" 2>/dev/null | cut -f1`, { timeout: 30000 }, (err, stdout) => {
        resolve(err ? 0 : parseInt(stdout?.trim()) || 0);
      });
    }
  });
}

/**
 * Get overall system status
 */
exports.getSystemStatus = async (req, res) => {
  try {
    // Get latest health checks
    const health = await systemHealthMonitor.getCurrentHealth();
    
    // Calculate overall status
    let overallStatus = 'GREEN';
    if (health.some(h => h.status === 'RED')) {
      overallStatus = 'RED';
    } else if (health.some(h => h.status === 'YELLOW')) {
      overallStatus = 'YELLOW';
    }
    
    // Get uptime
    const uptime = Math.floor(process.uptime());
    
    // Get system info
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const avgCpuSpeed = cpus.length > 0 ? Math.round(cpus.reduce((s, c) => s + c.speed, 0) / cpus.length) : 0;
    
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: cpus.length,
      cpuModel,
      cpuSpeed: avgCpuSpeed,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
      osUptime: os.uptime()
    };
    
    res.json({
      success: true,
      data: {
        overallStatus,
        uptime,
        systemInfo,
        components: health
      }
    });
  } catch (error) {
    console.error('[BiosController] getSystemStatus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get detailed component health
 */
exports.getComponentHealth = async (req, res) => {
  try {
    const { component } = req.params;
    
    // Get recent health checks for this component
    const healthChecks = await HealthCheck.find({ component: component.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(100);
    
    if (healthChecks.length === 0) {
      return res.json({
        success: true,
        data: {
          component,
          status: 'UNKNOWN',
          message: 'No health data available'
        }
      });
    }
    
    const latest = healthChecks[0];
    
    res.json({
      success: true,
      data: {
        component,
        current: latest,
        history: healthChecks
      }
    });
  } catch (error) {
    console.error('[BiosController] getComponentHealth error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get recent crashes
 */
exports.getRecentCrashes = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const crashes = await CrashLog.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: crashes
    });
  } catch (error) {
    console.error('[BiosController] getRecentCrashes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get crash timeline
 */
exports.getCrashTimeline = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const crashes = await CrashLog.find({ timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 });
    
    // Group by hour
    const timeline = {};
    crashes.forEach(crash => {
      const hour = new Date(crash.timestamp).toISOString().slice(0, 13) + ':00:00';
      if (!timeline[hour]) {
        timeline[hour] = {
          timestamp: hour,
          crashes: [],
          count: 0
        };
      }
      timeline[hour].crashes.push({
        type: crash.crashType,
        component: crash.component,
        severity: crash.severity,
        message: crash.errorMessage
      });
      timeline[hour].count++;
    });
    
    res.json({
      success: true,
      data: Object.values(timeline)
    });
  } catch (error) {
    console.error('[BiosController] getCrashTimeline error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get database diagnostics
 */
exports.getDatabaseDiagnostics = async (req, res) => {
  try {
    const diagnostics = {
      connectionState: mongoose.connection.readyState,
      connectionStateText: ['DISCONNECTED', 'CONNECTED', 'CONNECTING', 'DISCONNECTING'][mongoose.connection.readyState],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: []
    };
    
    // Get stats if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const stats = await mongoose.connection.db.stats();
        diagnostics.stats = {
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        };
        
        // Get collection names
        const collections = await mongoose.connection.db.listCollections().toArray();
        diagnostics.collections = collections.map(c => c.name);
      } catch (error) {
        diagnostics.error = error.message;
      }
    }
    
    res.json({
      success: true,
      data: diagnostics
    });
  } catch (error) {
    console.error('[BiosController] getDatabaseDiagnostics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get process metrics
 */
exports.getProcessMetrics = async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('[BiosController] getProcessMetrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Ping endpoint for health check
 */
exports.ping = (req, res) => {
  res.json({ 
    success: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Get comprehensive system diagnostics (all-in-one)
 */
exports.getFullDiagnostics = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // 1. System info
    const cpus = os.cpus();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuSpeed: cpus.length > 0 ? Math.round(cpus.reduce((s, c) => s + c.speed, 0) / cpus.length) : 0,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      loadAvg: os.loadavg(),
      osUptime: os.uptime(),
      processUptime: process.uptime(),
      pid: process.pid
    };

    // 2. Process memory
    const processMemory = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0
    };

    // 3. Disk storage
    const diskUsage = getDiskUsage();

    // 4. Project folder sizes (async, parallel)
    const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
    const [backendSize, uploadsSize, frontendBuildSize, adminSize] = await Promise.all([
      getFolderSizeAsync(path.join(projectRoot, 'backend')),
      getFolderSizeAsync(path.join(projectRoot, 'uploads')),
      getFolderSizeAsync(path.join(projectRoot, 'frontend', 'build')),
      getFolderSizeAsync(path.join(projectRoot, 'admin'))
    ]);

    const projectStorage = {
      backend: backendSize,
      uploads: uploadsSize,
      frontendBuild: frontendBuildSize,
      admin: adminSize,
      total: backendSize + uploadsSize + frontendBuildSize + adminSize
    };

    // 5. Database stats
    let dbStats = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const stats = await mongoose.connection.db.stats();
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        // Get individual collection sizes using $collStats (compatible with MongoDB 6+/8+)
        // Run in parallel with per-collection timeout for speed
        const getColStats = async (colName) => {
          try {
            const aggResult = await Promise.race([
              mongoose.connection.db.collection(colName).aggregate([
                { $collStats: { storageStats: {} } }
              ]).toArray(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
            ]);
            if (aggResult[0] && aggResult[0].storageStats) {
              const ss = aggResult[0].storageStats;
              return {
                name: colName,
                count: ss.count || 0,
                size: ss.size || 0,
                storageSize: ss.storageSize || 0,
                indexes: ss.nindexes || 0,
                indexSize: ss.totalIndexSize || 0
              };
            }
          } catch (e) { /* fall through */ }
          // Fallback: just count documents
          try {
            const count = await mongoose.connection.db.collection(colName).countDocuments();
            return { name: colName, count, size: 0, storageSize: 0, indexes: 0, indexSize: 0 };
          } catch (e2) {
            return { name: colName, count: 0, size: 0, storageSize: 0, indexes: 0, indexSize: 0 };
          }
        };

        const collectionDetails = await Promise.all(
          collections.map(col => getColStats(col.name))
        );
        collectionDetails.sort((a, b) => (b.count || 0) - (a.count || 0));

        dbStats = {
          connectionState: 'CONNECTED',
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          totalCollections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize,
          avgObjSize: stats.avgObjSize || 0,
          objects: stats.objects,
          collections: collectionDetails
        };
      } catch (e) {
        dbStats = { connectionState: 'CONNECTED', error: e.message };
      }
    } else {
      dbStats = { connectionState: ['DISCONNECTED', 'CONNECTED', 'CONNECTING', 'DISCONNECTING'][mongoose.connection.readyState] || 'UNKNOWN' };
    }

    // 6. Health checks
    const health = await systemHealthMonitor.getCurrentHealth();
    let overallStatus = 'GREEN';
    if (health.some(h => h.status === 'RED')) overallStatus = 'RED';
    else if (health.some(h => h.status === 'YELLOW')) overallStatus = 'YELLOW';

    // 7. Recent crashes (last 10)
    const recentCrashes = await CrashLog.find().sort({ timestamp: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        overallStatus,
        systemInfo,
        processMemory,
        diskUsage,
        projectStorage,
        dbStats,
        components: health,
        recentCrashes
      }
    });
  } catch (error) {
    console.error('[BiosController] getFullDiagnostics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Check health of all API endpoints
 */
exports.getApiHealth = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const port = process.env.PORT || 5000;

    // Define all API endpoint groups to check
    const endpointGroups = {
      'Core': [
        { path: '/health', method: 'GET', name: 'Health Check', auth: false },
        { path: '/api/bios/ping', method: 'GET', name: 'BIOS Ping', auth: false },
      ],
      'Auth': [
        { path: '/api/auth/profile', method: 'GET', name: 'Profile', auth: true },
      ],
      'Users & Employees': [
        { path: '/api/users', method: 'GET', name: 'Users List', auth: true },
        { path: '/api/employees', method: 'GET', name: 'Employees List', auth: true },
        { path: '/api/employees/basic', method: 'GET', name: 'Employees Basic', auth: true },
      ],
      'Attendance & Leaves': [
        { path: '/api/holidays', method: 'GET', name: 'Holidays', auth: true },
        { path: '/api/leaves/all', method: 'GET', name: 'All Leaves', auth: true },
      ],
      'Tasks': [
        { path: '/api/tasks', method: 'GET', name: 'Tasks List', auth: true },
      ],
      'Leads & CRM': [
        { path: '/api/leads', method: 'GET', name: 'Leads List', auth: true },
        { path: '/api/callers', method: 'GET', name: 'Callers List', auth: true },
      ],
      'Inventory': [
        { path: '/api/inventory/projects', method: 'GET', name: 'Projects', auth: true },
        { path: '/api/inventory/units', method: 'GET', name: 'Units', auth: true },
        { path: '/api/inventory/stats', method: 'GET', name: 'Inventory Stats', auth: true },
      ],
      'Communication': [
        { path: '/api/notifications', method: 'GET', name: 'Notifications', auth: true },
        { path: '/api/announcements', method: 'GET', name: 'Announcements', auth: true },
        { path: '/api/chat/chats', method: 'GET', name: 'Chat List', auth: true },
      ],
      'Calendar & Content': [
        { path: '/api/calendar/events', method: 'GET', name: 'Calendar Events', auth: true },
        { path: '/api/content', method: 'GET', name: 'Content', auth: true },
      ],
      'Notes & Reminders': [
        { path: '/api/personal-notes', method: 'GET', name: 'Personal Notes', auth: true },
        { path: '/api/reminders/today', method: 'GET', name: 'Today Reminders', auth: true },
      ],
      'Permissions': [
        { path: '/api/permissions/my-permissions', method: 'GET', name: 'My Permissions', auth: true },
      ],
      'Manager Analytics': [
        { path: '/api/manager-analytics/all', method: 'GET', name: 'All Analytics', auth: true },
        { path: '/api/manager-analytics/kpis', method: 'GET', name: 'KPIs', auth: true },
        { path: '/api/manager-analytics/alerts', method: 'GET', name: 'Alerts', auth: true },
      ],
      'Observability': [
        { path: '/api/admin/health', method: 'GET', name: 'Admin Health', auth: true },
        { path: '/api/admin/analytics', method: 'GET', name: 'Admin Analytics', auth: true },
        { path: '/api/admin/queue/stats', method: 'GET', name: 'Queue Stats', auth: true },
      ]
    };

    const results = {};
    let totalEndpoints = 0;
    let healthyEndpoints = 0;
    let failedEndpoints = 0;

    // Check all endpoints in parallel per group
    for (const [group, endpoints] of Object.entries(endpointGroups)) {
      const checks = await Promise.all(
        endpoints.map(ep => 
          checkEndpoint(port, ep.path, ep.method, ep.auth ? token : null)
            .then(result => ({ ...result, name: ep.name }))
        )
      );
      
      results[group] = checks.map(c => {
        totalEndpoints++;
        if (c.ok) healthyEndpoints++;
        else failedEndpoints++;
        return {
          name: c.name,
          path: c.path,
          method: c.method,
          status: c.status,
          responseTime: c.responseTime,
          ok: c.ok,
          error: c.error
        };
      });
    }

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        summary: {
          total: totalEndpoints,
          healthy: healthyEndpoints,
          failed: failedEndpoints,
          healthPercent: totalEndpoints > 0 ? ((healthyEndpoints / totalEndpoints) * 100).toFixed(1) : '0'
        },
        groups: results
      }
    });
  } catch (error) {
    console.error('[BiosController] getApiHealth error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get storage details
 */
exports.getStorageDetails = async (req, res) => {
  try {
    // Disk usage
    const diskUsage = getDiskUsage();

    // Project folder sizes
    const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
    const folders = [
      { name: 'backend', path: path.join(projectRoot, 'backend') },
      { name: 'frontend', path: path.join(projectRoot, 'frontend') },
      { name: 'admin', path: path.join(projectRoot, 'admin') },
      { name: 'website', path: path.join(projectRoot, 'website') },
      { name: 'uploads', path: path.join(projectRoot, 'uploads') },
      { name: 'bios', path: path.join(projectRoot, 'bios') },
    ];

    const folderSizeResults = await Promise.all(
      folders.map(f => getFolderSizeAsync(f.path).then(size => ({ name: f.name, size })))
    );
    const folderSizes = folderSizeResults.filter(f => f.size > 0);

    // Database storage
    let dbStorage = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const stats = await mongoose.connection.db.stats();
        dbStorage = {
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexSize: stats.indexSize,
          totalSize: (stats.dataSize || 0) + (stats.indexSize || 0),
          collections: stats.collections,
          objects: stats.objects
        };
      } catch (e) {
        dbStorage = { error: e.message };
      }
    }

    // Uploads folder breakdown
    let uploadsBreakdown = [];
    try {
      const uploadsPath = path.join(projectRoot, 'uploads');
      const fs = require('fs');
      if (fs.existsSync(uploadsPath)) {
        const dirs = fs.readdirSync(uploadsPath, { withFileTypes: true });
        const subDirs = dirs.filter(d => d.isDirectory());
        uploadsBreakdown = await Promise.all(
          subDirs.map(d => 
            getFolderSizeAsync(path.join(uploadsPath, d.name))
              .then(size => ({ name: d.name, size }))
          )
        );
      }
    } catch (e) { /* ignore */ }

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        diskUsage,
        folderSizes,
        dbStorage,
        uploadsBreakdown
      }
    });
  } catch (error) {
    console.error('[BiosController] getStorageDetails error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// SMART DIAGNOSTIC ENGINE
// =====================================

/**
 * Run full system diagnosis — checks 15+ areas and reports issues with severity
 */
exports.runDiagnosis = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const port = process.env.PORT || 5000;
    const issues = [];
    const checks = [];
    const startTime = Date.now();

    // Helper to add issue
    const addIssue = (severity, category, title, detail, suggestion) => {
      issues.push({ severity, category, title, detail, suggestion, timestamp: new Date().toISOString() });
    };
    const addCheck = (name, status, detail, duration) => {
      checks.push({ name, status, detail, duration });
    };

    // ======= 1. DATABASE CONNECTIVITY =======
    const dbStart = Date.now();
    try {
      if (mongoose.connection.readyState !== 1) {
        addIssue('CRITICAL', 'DATABASE', 'Database Disconnected', 
          `MongoDB connection state: ${['DISCONNECTED','CONNECTED','CONNECTING','DISCONNECTING'][mongoose.connection.readyState]}`,
          'Check MONGO_URI in .env file. Verify MongoDB Atlas cluster is running and IP whitelist is correct.');
        addCheck('Database Connection', 'FAIL', 'Not connected', Date.now() - dbStart);
      } else {
        // Check latency
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        if (pingTime > 1000) {
          addIssue('HIGH', 'DATABASE', 'High Database Latency',
            `Database ping time: ${pingTime}ms (threshold: 1000ms)`,
            'Check network connectivity to MongoDB Atlas. Consider upgrading cluster tier or checking for slow queries.');
        } else if (pingTime > 500) {
          addIssue('MEDIUM', 'DATABASE', 'Elevated Database Latency',
            `Database ping time: ${pingTime}ms (threshold: 500ms)`,
            'Monitor network performance. May be normal for cloud-hosted databases.');
        }
        addCheck('Database Connection', 'PASS', `Connected, ping: ${pingTime}ms`, Date.now() - dbStart);
      }
    } catch (e) {
      addIssue('CRITICAL', 'DATABASE', 'Database Check Failed', e.message, 'Check MongoDB connection string and network.');
      addCheck('Database Connection', 'FAIL', e.message, Date.now() - dbStart);
    }

    // ======= 2. MEMORY =======
    const memStart = Date.now();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPct = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    const processMemory = process.memoryUsage();
    const heapPct = ((processMemory.heapUsed / processMemory.heapTotal) * 100).toFixed(1);
    
    if (parseFloat(memUsedPct) > 90) {
      addIssue('CRITICAL', 'MEMORY', 'System Memory Critical',
        `RAM usage: ${memUsedPct}% (${((totalMem - freeMem) / 1073741824).toFixed(1)}GB / ${(totalMem / 1073741824).toFixed(1)}GB)`,
        'Close unnecessary applications. Consider increasing server RAM or restarting the backend process.');
    } else if (parseFloat(memUsedPct) > 80) {
      addIssue('MEDIUM', 'MEMORY', 'High System Memory Usage',
        `RAM usage: ${memUsedPct}%`,
        'Monitor memory usage. May need attention if it continues to increase.');
    }
    if (parseFloat(heapPct) > 85) {
      addIssue('HIGH', 'MEMORY', 'Node.js Heap Memory High',
        `Heap usage: ${heapPct}% (${(processMemory.heapUsed / 1048576).toFixed(1)}MB / ${(processMemory.heapTotal / 1048576).toFixed(1)}MB)`,
        'Possible memory leak. Restart backend process. Check for large in-memory caches or unclosed connections.');
    }
    if (processMemory.rss > 512 * 1024 * 1024) {
      addIssue('MEDIUM', 'MEMORY', 'High RSS Memory',
        `RSS: ${(processMemory.rss / 1048576).toFixed(1)}MB (threshold: 512MB)`,
        'Process is using significant memory. Consider profiling with --inspect or restarting.');
    }
    addCheck('Memory', 'PASS', `System: ${memUsedPct}%, Heap: ${heapPct}%`, Date.now() - memStart);

    // ======= 3. DISK SPACE =======
    const diskStart = Date.now();
    const diskUsage = getDiskUsage();
    for (const disk of diskUsage) {
      if (parseFloat(disk.usedPercent) > 95) {
        addIssue('CRITICAL', 'DISK', `Disk ${disk.drive} Almost Full`,
          `${disk.usedPercent}% used — only ${(disk.free / 1073741824).toFixed(1)}GB free`,
          `Free up space on ${disk.drive}. Delete old logs, temp files, or node_modules from unused projects.`);
      } else if (parseFloat(disk.usedPercent) > 85) {
        addIssue('MEDIUM', 'DISK', `Disk ${disk.drive} Getting Full`,
          `${disk.usedPercent}% used`,
          'Monitor disk usage. Clean up unnecessary files.');
      }
    }
    addCheck('Disk Space', diskUsage.some(d => parseFloat(d.usedPercent) > 95) ? 'WARN' : 'PASS', 
      diskUsage.map(d => `${d.drive} ${d.usedPercent}%`).join(', '), Date.now() - diskStart);

    // ======= 4. ENV VARIABLES =======
    const envStart = Date.now();
    const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingEnvVars.length > 0) {
      addIssue('CRITICAL', 'CONFIG', 'Missing Environment Variables',
        `Missing: ${missingEnvVars.join(', ')}`,
        'Create/update .env file in the backend folder with the required variables.');
    }
    addCheck('Environment Variables', missingEnvVars.length > 0 ? 'FAIL' : 'PASS',
      missingEnvVars.length > 0 ? `Missing: ${missingEnvVars.join(', ')}` : 'All required env vars present', Date.now() - envStart);

    // ======= 5. RECENT CRASHES =======
    const crashStart = Date.now();
    const recentCrashes = await CrashLog.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(20);
    if (recentCrashes.length > 0) {
      const criticalCrashes = recentCrashes.filter(c => c.severity === 'CRITICAL');
      if (criticalCrashes.length > 0) {
        addIssue('CRITICAL', 'CRASHES', `${criticalCrashes.length} Critical Crash(es) in Last 24h`,
          criticalCrashes.map(c => `[${c.crashType}] ${c.errorMessage}`).join('\n'),
          'Check crash logs tab for full stack traces. These may indicate unhandled exceptions or database failures.');
      } else {
        addIssue('MEDIUM', 'CRASHES', `${recentCrashes.length} Crash(es) in Last 24h`,
          recentCrashes.map(c => `[${c.severity}] ${c.errorMessage?.substring(0, 80)}`).join('\n'),
          'Review crash logs for patterns or recurring issues.');
      }
    }
    addCheck('Recent Crashes', recentCrashes.length > 0 ? 'WARN' : 'PASS',
      `${recentCrashes.length} crashes in last 24h`, Date.now() - crashStart);

    // ======= 6. API ERROR RATE =======
    const apiErrStart = Date.now();
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [totalApiCalls, errorApiCalls] = await Promise.all([
        ApiLog.countDocuments({ timestamp: { $gte: oneHourAgo } }),
        ApiLog.countDocuments({ timestamp: { $gte: oneHourAgo }, isError: true })
      ]);
      const errorRate = totalApiCalls > 0 ? ((errorApiCalls / totalApiCalls) * 100).toFixed(1) : 0;
      if (parseFloat(errorRate) > 10) {
        addIssue('HIGH', 'API', 'High API Error Rate',
          `${errorRate}% error rate in last hour (${errorApiCalls}/${totalApiCalls} requests failed)`,
          'Check error logs tab for details. Look for patterns in failing endpoints.');
      } else if (parseFloat(errorRate) > 5) {
        addIssue('MEDIUM', 'API', 'Elevated API Error Rate',
          `${errorRate}% error rate in last hour`,
          'Monitor API errors for trends.');
      }
      addCheck('API Error Rate', parseFloat(errorRate) > 10 ? 'WARN' : 'PASS',
        `${errorRate}% error rate (${errorApiCalls}/${totalApiCalls})`, Date.now() - apiErrStart);
    } catch (e) {
      addCheck('API Error Rate', 'SKIP', 'Could not query API logs', Date.now() - apiErrStart);
    }

    // ======= 7. SLOW API ENDPOINTS =======
    const slowStart = Date.now();
    try {
      const slowApis = await ApiLog.find({
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        duration: { $gt: 2000 }
      }).sort({ duration: -1 }).limit(10).select('endpoint method duration statusCode timestamp');
      if (slowApis.length > 0) {
        addIssue('MEDIUM', 'PERFORMANCE', `${slowApis.length} Slow API Calls (>2s) in Last Hour`,
          slowApis.map(a => `${a.method} ${a.endpoint} — ${a.duration}ms`).join('\n'),
          'Optimize slow endpoints. Check database queries, add indexes, or implement caching.');
      }
      addCheck('Slow APIs', slowApis.length > 0 ? 'WARN' : 'PASS',
        `${slowApis.length} slow calls (>2s) in last hour`, Date.now() - slowStart);
    } catch (e) {
      addCheck('Slow APIs', 'SKIP', 'Could not query', Date.now() - slowStart);
    }

    // ======= 8. FAILED AUTH ATTEMPTS =======
    const authStart = Date.now();
    try {
      const failedAuths = await ActivityLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        actionType: 'AUTH',
        'metadata.success': false
      });
      if (failedAuths > 10) {
        addIssue('HIGH', 'SECURITY', `${failedAuths} Failed Login Attempts in Last Hour`,
          `${failedAuths} unsuccessful authentication attempts detected`,
          'Possible brute force attack. Check failed auth IPs and consider rate limiting.');
      } else if (failedAuths > 5) {
        addIssue('MEDIUM', 'SECURITY', `${failedAuths} Failed Login Attempts`,
          'Multiple failed login attempts in the last hour',
          'Monitor for brute force patterns.');
      }
      addCheck('Auth Security', failedAuths > 10 ? 'WARN' : 'PASS',
        `${failedAuths} failed logins in last hour`, Date.now() - authStart);
    } catch (e) {
      addCheck('Auth Security', 'SKIP', 'Could not query', Date.now() - authStart);
    }

    // ======= 9. PERMISSION VIOLATIONS =======
    const permStart = Date.now();
    try {
      const permViolations = await ActivityLog.find({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        actionType: 'PERMISSION_CHANGE',
        category: 'CRITICAL'
      }).sort({ timestamp: -1 }).limit(10);
      if (permViolations.length > 0) {
        addIssue('HIGH', 'SECURITY', `${permViolations.length} Unauthorized Access Attempt(s)`,
          permViolations.map(p => `User ${p.username || p.userId} tried to access ${p.route || 'protected resource'}`).join('\n'),
          'Review user permissions. These may indicate role misconfiguration or unauthorized access attempts.');
      }
      addCheck('Permission Violations', permViolations.length > 0 ? 'WARN' : 'PASS',
        `${permViolations.length} violations in last 24h`, Date.now() - permStart);
    } catch (e) {
      addCheck('Permission Violations', 'SKIP', 'Could not query', Date.now() - permStart);
    }

    // ======= 10. HEALTH CHECK STATUS =======
    const hcStart = Date.now();
    try {
      const health = await systemHealthMonitor.getCurrentHealth();
      const redComponents = health.filter(h => h.status === 'RED');
      const yellowComponents = health.filter(h => h.status === 'YELLOW');
      if (redComponents.length > 0) {
        addIssue('CRITICAL', 'HEALTH', `${redComponents.length} Component(s) in RED State`,
          redComponents.map(c => `${c.component}: ${c.message || 'CRITICAL'}`).join('\n'),
          'Immediate attention required. Check component-specific logs.');
      }
      if (yellowComponents.length > 0) {
        addIssue('MEDIUM', 'HEALTH', `${yellowComponents.length} Component(s) in WARNING State`,
          yellowComponents.map(c => `${c.component}: ${c.message || 'WARNING'}`).join('\n'),
          'Monitor these components. May degrade further.');
      }
      addCheck('Health Monitors', redComponents.length > 0 ? 'FAIL' : yellowComponents.length > 0 ? 'WARN' : 'PASS',
        `${redComponents.length} red, ${yellowComponents.length} yellow`, Date.now() - hcStart);
    } catch (e) {
      addCheck('Health Monitors', 'SKIP', 'Could not check', Date.now() - hcStart);
    }

    // ======= 11. PROCESS UPTIME =======
    const uptimeStart = Date.now();
    const processUptime = process.uptime();
    if (processUptime < 60) {
      addIssue('MEDIUM', 'PROCESS', 'Server Recently Restarted',
        `Server uptime is only ${Math.floor(processUptime)} seconds`,
        'Server was recently restarted. Check if it crashed previously.');
    }
    addCheck('Process Uptime', 'PASS', `${Math.floor(processUptime / 3600)}h ${Math.floor((processUptime % 3600) / 60)}m`, Date.now() - uptimeStart);

    // ======= 12. DATABASE COLLECTIONS HEALTH =======
    const colStart = Date.now();
    try {
      if (mongoose.connection.readyState === 1) {
        const dbStats = await mongoose.connection.db.stats();
        if (dbStats.dataSize > 1073741824) {
          addIssue('MEDIUM', 'DATABASE', 'Large Database Size',
            `Database size: ${(dbStats.dataSize / 1073741824).toFixed(2)}GB`,
            'Consider archiving old data (api_logs, activity_logs, health_checks) to reduce database size.');
        }
        // Check for collections with high document counts
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const col of collections) {
          try {
            const count = await mongoose.connection.db.collection(col.name).estimatedDocumentCount();
            if (count > 100000) {
              addIssue('LOW', 'DATABASE', `Large Collection: ${col.name}`,
                `${col.name} has ${count.toLocaleString()} documents`,
                `Consider setting up TTL indexes or archiving old data from ${col.name}.`);
            }
          } catch (e) { /* skip */ }
        }
      }
      addCheck('Database Health', 'PASS', 'Collections checked', Date.now() - colStart);
    } catch (e) {
      addCheck('Database Health', 'SKIP', e.message, Date.now() - colStart);
    }

    // ======= 13. LIVE API ENDPOINT SPOT CHECK =======
    const spotStart = Date.now();
    const criticalEndpoints = [
      { path: '/health', name: 'Health', auth: false },
      { path: '/api/auth/profile', name: 'Auth', auth: true },
      { path: '/api/employees', name: 'Employees', auth: true },
      { path: '/api/leads', name: 'Leads', auth: true },
      { path: '/api/tasks', name: 'Tasks', auth: true },
    ];
    const spotResults = await Promise.all(
      criticalEndpoints.map(ep =>
        checkEndpoint(port, ep.path, 'GET', ep.auth ? token : null)
          .then(r => ({ ...r, name: ep.name }))
      )
    );
    const failedEndpoints = spotResults.filter(r => !r.ok);
    if (failedEndpoints.length > 0) {
      addIssue('CRITICAL', 'API', `${failedEndpoints.length} Critical API(s) Down`,
        failedEndpoints.map(e => `${e.name}: ${e.path} → ${e.status || 'NO RESPONSE'} ${e.error || ''}`).join('\n'),
        'Critical APIs are not responding. Check backend logs for errors.');
    }
    const slowEndpoints = spotResults.filter(r => r.ok && r.responseTime > 1000);
    if (slowEndpoints.length > 0) {
      addIssue('MEDIUM', 'PERFORMANCE', `${slowEndpoints.length} Slow Critical API(s)`,
        slowEndpoints.map(e => `${e.name}: ${e.responseTime}ms`).join('\n'),
        'Critical APIs are responding slowly. Check database queries and server load.');
    }
    addCheck('Critical APIs', failedEndpoints.length > 0 ? 'FAIL' : 'PASS',
      `${spotResults.filter(r => r.ok).length}/${spotResults.length} responding`, Date.now() - spotStart);

    // ======= 14. NODE.JS VERSION =======
    const nvStart = Date.now();
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion < 16) {
      addIssue('HIGH', 'CONFIG', 'Outdated Node.js Version',
        `Node.js ${nodeVersion} is EOL`,
        'Upgrade to Node.js 18 LTS or later for security patches and performance improvements.');
    }
    addCheck('Node.js Version', majorVersion < 16 ? 'WARN' : 'PASS', nodeVersion, Date.now() - nvStart);

    // ======= 15. RECENT 5XX ERRORS =======
    const errStart = Date.now();
    try {
      const recent5xx = await ApiLog.find({
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        statusCode: { $gte: 500 }
      }).sort({ timestamp: -1 }).limit(10).select('endpoint method statusCode error timestamp');
      if (recent5xx.length > 0) {
        addIssue('HIGH', 'API', `${recent5xx.length} Server Error(s) (5xx) in Last Hour`,
          recent5xx.map(e => `${e.method} ${e.endpoint} → ${e.statusCode} ${e.error || ''}`).join('\n'),
          'Internal server errors indicate bugs or infrastructure issues. Check backend logs.');
      }
      addCheck('5xx Errors', recent5xx.length > 0 ? 'WARN' : 'PASS',
        `${recent5xx.length} errors in last hour`, Date.now() - errStart);
    } catch (e) {
      addCheck('5xx Errors', 'SKIP', 'Could not query', Date.now() - errStart);
    }

    // Sort issues by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    issues.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    // Summary
    const critical = issues.filter(i => i.severity === 'CRITICAL').length;
    const high = issues.filter(i => i.severity === 'HIGH').length;
    const medium = issues.filter(i => i.severity === 'MEDIUM').length;
    const low = issues.filter(i => i.severity === 'LOW').length;
    const overallHealth = critical > 0 ? 'CRITICAL' : high > 0 ? 'WARNING' : medium > 0 ? 'ATTENTION' : 'HEALTHY';

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        overallHealth,
        summary: { total: issues.length, critical, high, medium, low },
        checks,
        issues
      }
    });
  } catch (error) {
    console.error('[BiosController] runDiagnosis error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get recent error logs from API logs and activity logs
 */
exports.getErrorLogs = async (req, res) => {
  try {
    const { hours = 24, limit = 50, type = 'all' } = req.query;
    const since = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    const logLimit = Math.min(parseInt(limit), 200);

    const results = { apiErrors: [], activityErrors: [], recentCrashes: [] };

    // API errors (4xx & 5xx)
    if (type === 'all' || type === 'api') {
      results.apiErrors = await ApiLog.find({
        timestamp: { $gte: since },
        statusCode: { $gte: 400 }
      }).sort({ timestamp: -1 }).limit(logLimit)
        .select('timestamp method endpoint statusCode error errorStack duration userId ip');
    }

    // Activity errors
    if (type === 'all' || type === 'activity') {
      results.activityErrors = await ActivityLog.find({
        timestamp: { $gte: since },
        $or: [
          { actionType: 'ERROR' },
          { category: 'CRITICAL' },
          { actionType: 'PERMISSION_CHANGE' }
        ]
      }).sort({ timestamp: -1 }).limit(logLimit)
        .select('timestamp userId username actionType route category errorMessage errorStack metadata');
    }

    // Recent crashes
    if (type === 'all' || type === 'crashes') {
      results.recentCrashes = await CrashLog.find({
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 }).limit(logLimit);
    }

    // Stats
    const stats = {
      totalApiErrors: results.apiErrors.length,
      total5xx: results.apiErrors.filter(e => e.statusCode >= 500).length,
      total4xx: results.apiErrors.filter(e => e.statusCode >= 400 && e.statusCode < 500).length,
      totalActivityErrors: results.activityErrors.length,
      totalCrashes: results.recentCrashes.length,
      timeRange: `Last ${hours}h`
    };

    res.json({ success: true, data: { ...results, stats } });
  } catch (error) {
    console.error('[BiosController] getErrorLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================
// DIAGNOSTIC REPORT GENERATOR
// =====================================

/**
 * Generate a comprehensive diagnostic report with solutions
 * This runs full diagnosis + generates a detailed report with step-by-step fix instructions
 */
exports.generateDiagnosticReport = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const port = process.env.PORT || 5000;
    const reportStartTime = Date.now();

    // ---- Run all diagnostic checks (same as runDiagnosis) ----
    const issues = [];
    const checks = [];

    const addIssue = (severity, category, title, detail, suggestion) => {
      issues.push({ severity, category, title, detail, suggestion, timestamp: new Date().toISOString() });
    };
    const addCheck = (name, status, detail, duration) => {
      checks.push({ name, status, detail, duration });
    };

    // 1. DATABASE
    const dbStart = Date.now();
    try {
      if (mongoose.connection.readyState !== 1) {
        addIssue('CRITICAL', 'DATABASE', 'Database Disconnected',
          `MongoDB connection state: ${['DISCONNECTED','CONNECTED','CONNECTING','DISCONNECTING'][mongoose.connection.readyState]}`,
          'Check MONGO_URI in .env file. Verify MongoDB Atlas cluster is running and IP whitelist is correct.');
        addCheck('Database Connection', 'FAIL', 'Not connected', Date.now() - dbStart);
      } else {
        const pingStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - pingStart;
        if (pingTime > 1000) {
          addIssue('HIGH', 'DATABASE', 'High Database Latency', `Ping: ${pingTime}ms`, 'Check network or upgrade cluster.');
        } else if (pingTime > 500) {
          addIssue('MEDIUM', 'DATABASE', 'Elevated Database Latency', `Ping: ${pingTime}ms`, 'Monitor network performance.');
        }
        addCheck('Database Connection', 'PASS', `Connected, ping: ${pingTime}ms`, Date.now() - dbStart);
      }
    } catch (e) {
      addIssue('CRITICAL', 'DATABASE', 'Database Check Failed', e.message, 'Check MongoDB connection.');
      addCheck('Database Connection', 'FAIL', e.message, Date.now() - dbStart);
    }

    // 2. MEMORY
    const memStart = Date.now();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsedPct = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    const processMemory = process.memoryUsage();
    const heapPct = ((processMemory.heapUsed / processMemory.heapTotal) * 100).toFixed(1);
    if (parseFloat(memUsedPct) > 90) {
      addIssue('CRITICAL', 'MEMORY', 'System Memory Critical', `RAM: ${memUsedPct}%`, 'Close apps or increase RAM.');
    } else if (parseFloat(memUsedPct) > 80) {
      addIssue('MEDIUM', 'MEMORY', 'High System Memory', `RAM: ${memUsedPct}%`, 'Monitor memory usage trends.');
    }
    if (parseFloat(heapPct) > 85) {
      addIssue('HIGH', 'MEMORY', 'Node.js Heap High', `Heap: ${heapPct}%`, 'Possible memory leak. Restart backend.');
    }
    addCheck('Memory', 'PASS', `System: ${memUsedPct}%, Heap: ${heapPct}%`, Date.now() - memStart);

    // 3. DISK
    const diskStart = Date.now();
    const diskUsage = getDiskUsage();
    for (const disk of diskUsage) {
      if (parseFloat(disk.usedPercent) > 95) {
        addIssue('CRITICAL', 'DISK', `Disk ${disk.drive} Almost Full`, `${disk.usedPercent}% used`, `Free up space on ${disk.drive}.`);
      } else if (parseFloat(disk.usedPercent) > 85) {
        addIssue('MEDIUM', 'DISK', `Disk ${disk.drive} Getting Full`, `${disk.usedPercent}% used`, 'Clean up unnecessary files.');
      }
    }
    addCheck('Disk Space', 'PASS', diskUsage.map(d => `${d.drive} ${d.usedPercent}%`).join(', '), Date.now() - diskStart);

    // 4. WebSocket
    const wsStart = Date.now();
    try {
      const { getIO } = require('../../config/socket');
      const io = getIO();
      const sockets = await io.fetchSockets();
      addCheck('WebSocket', 'PASS', `${sockets.length} connections`, Date.now() - wsStart);
    } catch (e) {
      addIssue('MEDIUM', 'WEBSOCKET', 'WebSocket Check Failed', e.message, 'Ensure Socket.IO is initialized properly.');
      addCheck('WebSocket', 'WARN', e.message, Date.now() - wsStart);
    }

    // 5. Health Check Status
    const hcStart = Date.now();
    try {
      const health = await systemHealthMonitor.getCurrentHealth();
      const redComponents = health.filter(h => h.status === 'RED');
      const yellowComponents = health.filter(h => h.status === 'YELLOW');
      if (redComponents.length > 0) {
        addIssue('CRITICAL', 'HEALTH', `${redComponents.length} Component(s) in RED`,
          redComponents.map(c => `${c.component}: ${c.message || 'CRITICAL'}`).join('\n'),
          'Immediate attention required.');
      }
      if (yellowComponents.length > 0) {
        addIssue('MEDIUM', 'HEALTH', `${yellowComponents.length} Component(s) in WARNING`,
          yellowComponents.map(c => `${c.component}: ${c.message || 'WARNING'}`).join('\n'),
          'Monitor these components.');
      }
      addCheck('Health Monitors', redComponents.length > 0 ? 'FAIL' : 'PASS',
        `${redComponents.length} red, ${yellowComponents.length} yellow`, Date.now() - hcStart);
    } catch (e) {
      addCheck('Health Monitors', 'SKIP', 'Could not check', Date.now() - hcStart);
    }

    // 6. Recent crashes
    const crashStart = Date.now();
    const recentCrashes = await CrashLog.find({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: -1 }).limit(20);
    if (recentCrashes.length > 0) {
      addIssue('HIGH', 'CRASHES', `${recentCrashes.length} Crash(es) in Last 24h`,
        recentCrashes.map(c => `[${c.severity}] ${c.errorMessage?.substring(0, 80)}`).join('\n'),
        'Review crash logs for patterns.');
    }
    addCheck('Recent Crashes', recentCrashes.length > 0 ? 'WARN' : 'PASS', `${recentCrashes.length} crashes`, Date.now() - crashStart);

    // 7. API Spot Check
    const spotStart = Date.now();
    const criticalEndpoints = [
      { path: '/health', name: 'Health', auth: false },
      { path: '/api/auth/profile', name: 'Auth', auth: true },
      { path: '/api/employees', name: 'Employees', auth: true },
    ];
    const spotResults = await Promise.all(
      criticalEndpoints.map(ep =>
        checkEndpoint(port, ep.path, 'GET', ep.auth ? token : null).then(r => ({ ...r, name: ep.name }))
      )
    );
    const failedEndpoints = spotResults.filter(r => !r.ok);
    if (failedEndpoints.length > 0) {
      addIssue('CRITICAL', 'API', `${failedEndpoints.length} Critical API(s) Down`,
        failedEndpoints.map(e => `${e.name}: ${e.status || 'NO RESPONSE'}`).join('\n'),
        'Check backend logs for errors.');
    }
    addCheck('Critical APIs', failedEndpoints.length > 0 ? 'FAIL' : 'PASS',
      `${spotResults.filter(r => r.ok).length}/${spotResults.length} responding`, Date.now() - spotStart);

    // Sort issues by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    issues.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    const critical = issues.filter(i => i.severity === 'CRITICAL').length;
    const high = issues.filter(i => i.severity === 'HIGH').length;
    const medium = issues.filter(i => i.severity === 'MEDIUM').length;
    const low = issues.filter(i => i.severity === 'LOW').length;
    const overallHealth = critical > 0 ? 'CRITICAL' : high > 0 ? 'WARNING' : medium > 0 ? 'ATTENTION' : 'HEALTHY';

    // ---- Generate Solution Report for each issue ----
    const solutionReport = issues.map((issue, index) => {
      const solutions = generateSolutionSteps(issue);
      return {
        issueNumber: index + 1,
        severity: issue.severity,
        category: issue.category,
        title: issue.title,
        detail: issue.detail,
        quickFix: issue.suggestion,
        solutionSteps: solutions.steps,
        estimatedTime: solutions.estimatedTime,
        riskLevel: solutions.riskLevel,
        requiresRestart: solutions.requiresRestart,
        preventionTips: solutions.preventionTips
      };
    });

    // ---- System Snapshot ----
    const systemSnapshot = {
      hostname: os.hostname(),
      platform: `${os.platform()} (${os.arch()})`,
      nodeVersion: process.version,
      cpus: `${os.cpus().length}x ${os.cpus()[0]?.model || 'Unknown'}`,
      totalMemory: totalMem,
      freeMemory: freeMem,
      memoryUsagePercent: memUsedPct,
      heapUsed: processMemory.heapUsed,
      heapTotal: processMemory.heapTotal,
      heapPercent: heapPct,
      rss: processMemory.rss,
      processUptime: Math.floor(process.uptime()),
      diskUsage: diskUsage,
      dbState: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    };

    // ---- Executive Summary ----
    const executiveSummary = {
      overallHealth,
      totalIssues: issues.length,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      immediateActionRequired: critical > 0,
      recommendation: critical > 0
        ? 'URGENT: Critical issues detected. Address critical items immediately to prevent system failure.'
        : high > 0
        ? 'WARNING: High-priority issues found. Schedule fixes within 24 hours.'
        : medium > 0
        ? 'NOTICE: Minor issues detected. Plan to address within the week.'
        : 'HEALTHY: No significant issues. System is operating normally.',
      topPriorities: issues.slice(0, 3).map(i => ({
        title: i.title,
        severity: i.severity,
        quickFix: i.suggestion
      }))
    };

    const reportDuration = Date.now() - reportStartTime;

    res.json({
      success: true,
      data: {
        reportId: `DIAG-${Date.now()}`,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.username || 'SYSTEM',
        duration: reportDuration,
        executiveSummary,
        systemSnapshot,
        diagnosticChecks: checks,
        issuesFound: issues,
        solutionReport,
        overallHealth,
        summary: { total: issues.length, critical, high, medium, low }
      }
    });
  } catch (error) {
    console.error('[BiosController] generateDiagnosticReport error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate step-by-step solution for a specific issue
 */
function generateSolutionSteps(issue) {
  const solutionMap = {
    'DATABASE': {
      'Database Disconnected': {
        steps: [
          '1. Check MongoDB connection string in backend/.env file (MONGO_URI)',
          '2. Verify MongoDB Atlas cluster is running at cloud.mongodb.com',
          '3. Check if your current IP is whitelisted in MongoDB Atlas → Network Access',
          '4. Test connection: Run "node -e \\"const m=require(\'mongoose\');m.connect(process.env.MONGO_URI).then(()=>console.log(\'OK\')).catch(e=>console.log(e))\\"" in backend/',
          '5. If using local MongoDB, ensure mongod service is running',
          '6. Restart the backend server after fixing: npm run dev'
        ],
        estimatedTime: '5-15 minutes',
        riskLevel: 'HIGH',
        requiresRestart: true,
        preventionTips: ['Set up MongoDB Atlas alerts for cluster health', 'Use connection pooling', 'Add IP 0.0.0.0/0 for development (remove in production)']
      },
      'High Database Latency': {
        steps: [
          '1. Check network connectivity to MongoDB Atlas',
          '2. Review slow queries: db.currentOp({"secs_running": {$gt: 1}})',
          '3. Add indexes for frequently queried fields',
          '4. Consider upgrading MongoDB Atlas cluster tier',
          '5. Check if heavy background operations are running'
        ],
        estimatedTime: '15-30 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: false,
        preventionTips: ['Set up performance alerts', 'Regular index optimization', 'Use MongoDB Profiler to identify slow queries']
      },
      'default': {
        steps: [
          '1. Check MongoDB connection and credentials',
          '2. Verify database server is accessible',
          '3. Review backend logs for database errors',
          '4. Restart backend if needed'
        ],
        estimatedTime: '10-20 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: false,
        preventionTips: ['Monitor database health regularly', 'Set up automated backups']
      }
    },
    'MEMORY': {
      'System Memory Critical': {
        steps: [
          '1. Open Task Manager (Ctrl+Shift+Esc) and check which processes use the most memory',
          '2. Close unnecessary applications (browsers with many tabs, IDEs, etc.)',
          '3. Check for memory leaks: Run "node --inspect backend/server.js" and use Chrome DevTools Memory tab',
          '4. Restart the backend process to free leaked memory: In terminal, stop and restart server',
          '5. If persistent, consider upgrading server RAM or moving to a cloud instance with more memory',
          '6. Clear Node.js cache: Delete node_modules/.cache if it exists'
        ],
        estimatedTime: '5-10 minutes',
        riskLevel: 'HIGH',
        requiresRestart: true,
        preventionTips: ['Set up memory usage alerts at 80% threshold', 'Implement memory leak detection', 'Use process manager like PM2 with max-memory-restart']
      },
      'High System Memory': {
        steps: [
          '1. Monitor memory usage trends over the next hour',
          '2. Close unnecessary background applications',
          '3. Check if any specific process is consuming excessive memory',
          '4. Consider scheduling a maintenance restart during low-traffic hours'
        ],
        estimatedTime: '5 minutes',
        riskLevel: 'LOW',
        requiresRestart: false,
        preventionTips: ['Regular monitoring', 'Set up automated alerts', 'Schedule periodic restarts']
      },
      'default': {
        steps: [
          '1. Check memory usage patterns',
          '2. Close unnecessary processes',
          '3. Restart backend if heap is too high',
          '4. Profile memory usage if issue persists'
        ],
        estimatedTime: '10 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: false,
        preventionTips: ['Monitor heap usage', 'Set memory limits for Node.js process']
      }
    },
    'DISK': {
      'default': {
        steps: [
          '1. Check large files: In terminal, run "Get-ChildItem -Path . -Recurse | Sort-Object Length -Descending | Select-Object -First 20 FullName, @{N=\'SizeMB\';E={$_.Length/1MB}}"',
          '2. Clean node_modules from unused projects',
          '3. Delete old log files from backend/logs/ if they exist',
          '4. Clean npm cache: npm cache clean --force',
          '5. Empty recycle bin and temp folders',
          '6. Consider moving uploads to cloud storage (S3/Cloudinary)'
        ],
        estimatedTime: '10-20 minutes',
        riskLevel: 'LOW',
        requiresRestart: false,
        preventionTips: ['Set up disk usage alerts', 'Implement log rotation', 'Use cloud storage for file uploads']
      }
    },
    'CRASHES': {
      'default': {
        steps: [
          '1. Go to BIOS Panel → Crashes tab to review recent crash details',
          '2. Check the stack traces to identify the root cause',
          '3. Look for patterns: Are crashes happening on specific endpoints or at specific times?',
          '4. Check backend/logs/ for additional error context',
          '5. Fix the code causing crashes and redeploy',
          '6. Add error handling (try-catch) around the crashing code'
        ],
        estimatedTime: '15-60 minutes',
        riskLevel: 'HIGH',
        requiresRestart: true,
        preventionTips: ['Add comprehensive error handling', 'Use process manager (PM2) for auto-restart', 'Set up error tracking (Sentry/LogRocket)']
      }
    },
    'SECURITY': {
      'default': {
        steps: [
          '1. Review failed login attempts in Activity Logs',
          '2. Check if attempts are from the same IP (potential brute force)',
          '3. Consider implementing rate limiting on auth endpoints',
          '4. Verify all user accounts have strong passwords',
          '5. Check for unauthorized permission changes',
          '6. Review and update CORS settings if needed'
        ],
        estimatedTime: '15-30 minutes',
        riskLevel: 'HIGH',
        requiresRestart: false,
        preventionTips: ['Implement rate limiting', 'Add login attempt monitoring', 'Use 2FA for admin accounts', 'Regular security audits']
      }
    },
    'API': {
      'default': {
        steps: [
          '1. Check which APIs are failing in the BIOS → API Health tab',
          '2. Review backend logs for error details',
          '3. Test failing endpoints manually using Postman or curl',
          '4. Check if database queries behind the APIs are working',
          '5. Verify authentication tokens are valid',
          '6. Restart backend server if needed'
        ],
        estimatedTime: '10-30 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: false,
        preventionTips: ['Monitor API error rates', 'Add health check endpoints', 'Implement request/response logging']
      }
    },
    'PERFORMANCE': {
      'default': {
        steps: [
          '1. Identify slow endpoints in BIOS → API Health tab',
          '2. Add database indexes for frequently queried fields',
          '3. Implement caching for heavy/repeated queries',
          '4. Check for N+1 query problems in mongoose populate calls',
          '5. Consider pagination for large data sets',
          '6. Profile with Node.js --inspect flag'
        ],
        estimatedTime: '30-60 minutes',
        riskLevel: 'LOW',
        requiresRestart: false,
        preventionTips: ['Set up performance monitoring', 'Regular load testing', 'Database query optimization']
      }
    },
    'CONFIG': {
      'default': {
        steps: [
          '1. Check backend/.env file exists and has all required variables',
          '2. Required: MONGO_URI, JWT_SECRET',
          '3. Optional but recommended: PORT, NODE_ENV, CLOUDINARY_*',
          '4. Copy from .env.example if available',
          '5. Restart backend after updating .env'
        ],
        estimatedTime: '5 minutes',
        riskLevel: 'LOW',
        requiresRestart: true,
        preventionTips: ['Use .env.example as template', 'Document all required env vars', 'Validate env vars at startup']
      }
    },
    'HEALTH': {
      'default': {
        steps: [
          '1. Check which components are in RED/YELLOW state in BIOS Overview',
          '2. Address each component based on its specific issue',
          '3. For DATABASE RED: Check MongoDB connection',
          '4. For SYSTEM RED: Check CPU/Memory usage',
          '5. For WEBSOCKET RED: Ensure Socket.IO is initialized properly',
          '6. Wait 30 seconds for health monitor to re-check after fixes'
        ],
        estimatedTime: '10-30 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: false,
        preventionTips: ['Monitor health dashboard regularly', 'Set up automated alerts for status changes']
      }
    },
    'WEBSOCKET': {
      'default': {
        steps: [
          '1. Check if Socket.IO is properly initialized in backend/server.js',
          '2. Verify CORS settings allow WebSocket connections',
          '3. Check if the backend server is running and accessible',
          '4. Test WebSocket connection from browser console: io("http://localhost:5000")',
          '5. Restart the backend server to reinitialize Socket.IO',
          '6. Check firewall settings for WebSocket port'
        ],
        estimatedTime: '5-15 minutes',
        riskLevel: 'MEDIUM',
        requiresRestart: true,
        preventionTips: ['Monitor WebSocket connection health', 'Implement reconnection logic', 'Use WebSocket heartbeat']
      }
    },
    'PROCESS': {
      'default': {
        steps: [
          '1. Check if server crashed recently by reviewing crash logs',
          '2. Review PM2 logs or terminal output for restart reasons',
          '3. Check system event logs for unexpected shutdowns',
          '4. Ensure auto-restart is configured (PM2 or similar)',
          '5. Monitor for recurring crash patterns'
        ],
        estimatedTime: '5-10 minutes',
        riskLevel: 'LOW',
        requiresRestart: false,
        preventionTips: ['Use PM2 for process management', 'Set up crash alerts', 'Enable core dumps for debugging']
      }
    }
  };

  const categorySolutions = solutionMap[issue.category] || solutionMap['API'];
  const specificSolution = categorySolutions[issue.title] || categorySolutions['default'] || {
    steps: [
      `1. Review the issue: ${issue.title}`,
      `2. Check details: ${issue.detail}`,
      `3. Apply suggested fix: ${issue.suggestion}`,
      '4. Verify the fix by running diagnosis again',
      '5. Monitor for recurrence'
    ],
    estimatedTime: '10-30 minutes',
    riskLevel: 'MEDIUM',
    requiresRestart: false,
    preventionTips: ['Regular monitoring', 'Proactive maintenance']
  };

  return specificSolution;
}

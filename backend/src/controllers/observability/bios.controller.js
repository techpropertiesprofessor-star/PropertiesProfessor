/**
 * BIOS CONTROLLER
 * Handles BIOS panel API requests for system health and crash diagnostics
 * Must work independently even if main app crashes
 */

const systemHealthMonitor = require('../../services/observability/systemHealthMonitor');
const HealthCheck = require('../../models/observability/HealthCheck');
const CrashLog = require('../../models/observability/CrashLog');
const os = require('os');
const mongoose = require('mongoose');

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
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
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

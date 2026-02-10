/**
 * REAL-TIME METRICS TRACKER
 * Auto-tracks system metrics and emits to admin-observability room
 * Runs every 5 seconds with sliding window calculations
 */

const os = require('os');

class MetricsTracker {
  constructor(io) {
    this.io = io;
    
    // Metrics storage (sliding window)
    this.requests = []; // { timestamp, duration, statusCode }
    this.errors = []; // { timestamp, statusCode }
    this.bandwidth = { in: 0, out: 0 }; // bytes
    this.activeSockets = 0;
    
    // Window sizes (milliseconds)
    this.windowSize = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    // Last emit time
    this.lastEmit = Date.now();
    
    // Start auto-emission
    this.startAutoEmit();
    
    console.log('[MetricsTracker] Started with 5s auto-emit');
  }
  
  /**
   * Track API request
   */
  trackRequest(duration, statusCode, bytesIn = 0, bytesOut = 0) {
    const timestamp = Date.now();
    
    // Add to requests
    this.requests.push({ timestamp, duration, statusCode });
    
    // Track errors
    if (statusCode >= 400) {
      this.errors.push({ timestamp, statusCode });
    }
    
    // Track bandwidth
    this.bandwidth.in += bytesIn;
    this.bandwidth.out += bytesOut;
    
    // Clean old data (keep only 7 days)
    this.cleanOldData();
  }
  
  /**
   * Track socket connection
   */
  trackSocket(action) {
    if (action === 'connect') {
      this.activeSockets++;
    } else if (action === 'disconnect') {
      this.activeSockets--;
    }
    
    // Emit active users update
    this.emitActiveUsers();
  }
  
  /**
   * Track bandwidth manually
   */
  trackBandwidth(bytesIn, bytesOut) {
    this.bandwidth.in += bytesIn || 0;
    this.bandwidth.out += bytesOut || 0;
  }
  
  /**
   * Clean old data outside 7d window
   */
  cleanOldData() {
    const cutoff = Date.now() - this.windowSize['7d'];
    
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }
  
  /**
   * Calculate metrics for time range
   */
  getMetrics(timeRange = '1h') {
    const windowMs = this.windowSize[timeRange] || this.windowSize['1h'];
    const cutoff = Date.now() - windowMs;
    
    // Filter data in window
    const recentRequests = this.requests.filter(r => r.timestamp > cutoff);
    const recentErrors = this.errors.filter(e => e.timestamp > cutoff);
    
    // Calculate API metrics
    const totalRequests = recentRequests.length;
    const totalErrors = recentErrors.length;
    const avgResponseTime = totalRequests > 0
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests
      : 0;
    const errorRate = totalRequests > 0
      ? (totalErrors / totalRequests) * 100
      : 0;
    
    // Calculate requests per second
    const windowSeconds = windowMs / 1000;
    const requestsPerSecond = totalRequests / windowSeconds;
    
    // System metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0]; // 1-minute load average
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    // Network metrics (based on active connections)
    const networkInterfaces = os.networkInterfaces();
    const activeInterfaces = Object.keys(networkInterfaces).length;
    const uptime = os.uptime();
    
    // Disk metrics (estimated based on system metrics)
    // Note: For accurate disk metrics, you'd need additional libraries like 'diskusage'
    // For now, we'll use heap usage as a proxy
    const diskUsagePercent = Math.min((memUsage.heapUsed / memUsage.heapTotal) * 100, 100);
    
    return {
      api: {
        totalRequests,
        requestsPerSecond: parseFloat(requestsPerSecond.toFixed(2)),
        avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(2)),
        totalErrors
      },
      system: {
        memoryUsageMB: parseFloat((memUsage.heapUsed / 1024 / 1024).toFixed(2)),
        memoryTotalMB: parseFloat((memUsage.heapTotal / 1024 / 1024).toFixed(2)),
        memoryUsagePercent: parseFloat(memUsagePercent.toFixed(2)),
        cpuLoad: parseFloat(cpuUsage.toFixed(2)),
        activeSockets: this.activeSockets,
        diskUsage: parseFloat(diskUsagePercent.toFixed(2)),
        activeConnections: this.activeSockets,
        networkInterfaces: activeInterfaces,
        uptime: uptime
      },
      bandwidth: {
        inMB: parseFloat((this.bandwidth.in / 1024 / 1024).toFixed(2)),
        outMB: parseFloat((this.bandwidth.out / 1024 / 1024).toFixed(2)),
        totalMB: parseFloat(((this.bandwidth.in + this.bandwidth.out) / 1024 / 1024).toFixed(2))
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Start auto-emit every 5 seconds
   */
  startAutoEmit() {
    this.emitInterval = setInterval(() => {
      this.emitMetrics();
    }, 5000);
  }
  
  /**
   * Emit all metrics to admin-observability room
   */
  emitMetrics(timeRange = '1h') {
    if (!this.io) return;
    
    try {
      const metrics = this.getMetrics(timeRange);
      
      // Emit system health
      this.io.to('admin-observability').emit('systemHealthUpdate', {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: metrics.timestamp,
        ...metrics.system
      });
      
      // Emit API metrics
      this.io.to('admin-observability').emit('apiMetricsUpdate', {
        ...metrics.api,
        timestamp: metrics.timestamp
      });
      
      // Emit error metrics
      if (metrics.api.totalErrors > 0) {
        this.io.to('admin-observability').emit('errorMetricsUpdate', {
          errorRate: metrics.api.errorRate,
          totalErrors: metrics.api.totalErrors,
          timestamp: metrics.timestamp
        });
      }
      
      // Emit bandwidth
      this.io.to('admin-observability').emit('bandwidthUpdate', {
        ...metrics.bandwidth,
        timestamp: metrics.timestamp
      });
      
      this.lastEmit = Date.now();
    } catch (error) {
      console.error('[MetricsTracker] Failed to emit metrics:', error.message);
    }
  }
  
  /**
   * Emit active users count
   */
  emitActiveUsers() {
    if (!this.io) return;
    
    this.io.to('admin-observability').emit('activeUsersUpdate', {
      count: this.activeSockets,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Emit crash detection
   */
  emitCrash(error) {
    if (!this.io) return;
    
    this.io.to('admin-observability').emit('crashDetected', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Emit activity log added
   */
  emitActivityLog(log) {
    if (!this.io) return;
    
    this.io.to('admin-observability').emit('activityLogAdded', {
      ...log,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Emit API log added
   */
  emitApiLog(log) {
    if (!this.io) return;
    
    this.io.to('admin-observability').emit('apiLogAdded', {
      ...log,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Stop tracker
   */
  stop() {
    if (this.emitInterval) {
      clearInterval(this.emitInterval);
      console.log('[MetricsTracker] Stopped');
    }
  }
}

module.exports = MetricsTracker;

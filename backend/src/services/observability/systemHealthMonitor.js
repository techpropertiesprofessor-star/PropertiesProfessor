/**
 * SYSTEM HEALTH MONITOR
 * Monitors system health for BIOS panel
 * Works independently even if main app crashes
 */

const os = require('os');
const mongoose = require('mongoose');
const loggingQueue = require('./loggingQueue');

class SystemHealthMonitor {
  constructor() {
    this.checkInterval = 30000; // 30 seconds
    this.isMonitoring = false;
    this.startTime = Date.now();
  }
  
  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[SystemHealthMonitor] Started');
    
    // Immediate first check
    this.performHealthChecks();
    
    // Schedule periodic checks
    this.monitorInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.checkInterval);
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.isMonitoring = false;
    console.log('[SystemHealthMonitor] Stopped');
  }
  
  /**
   * Perform all health checks
   */
  async performHealthChecks() {
    try {
      await Promise.all([
        this.checkDatabase(),
        this.checkBackend(),
        this.checkSystem()
      ]);
    } catch (error) {
      console.error('[SystemHealthMonitor] Health check error:', error.message);
    }
  }
  
  /**
   * Check database health
   */
  async checkDatabase() {
    const startTime = Date.now();
    let status = 'GREEN';
    let errorMessage = null;
    let metrics = {};
    
    try {
      // Check connection
      const connectionStatus = mongoose.connection.readyState;
      const connectionStates = {
        0: 'DISCONNECTED',
        1: 'CONNECTED',
        2: 'CONNECTING',
        3: 'DISCONNECTING'
      };
      
      metrics.connectionStatus = connectionStates[connectionStatus];
      
      if (connectionStatus !== 1) {
        status = 'RED';
        errorMessage = `Database ${metrics.connectionStatus}`;
      } else {
        // Test read latency
        const readStart = Date.now();
        await mongoose.connection.db.admin().ping();
        metrics.dbReadLatency = Date.now() - readStart;
        
        // Get database stats
        const stats = await mongoose.connection.db.stats();
        metrics.dbStorageUsed = stats.dataSize;
        metrics.dbStorageTotal = stats.storageSize;
        
        // Determine status based on latency
        if (metrics.dbReadLatency > 1000) {
          status = 'RED';
          errorMessage = 'High database latency';
        } else if (metrics.dbReadLatency > 500) {
          status = 'YELLOW';
        }
      }
    } catch (error) {
      status = 'RED';
      errorMessage = error.message;
    }
    
    const responseTime = Date.now() - startTime;
    
    // Queue health check log
    loggingQueue.enqueue('health', {
      timestamp: new Date(),
      component: 'DATABASE',
      status,
      responseTime,
      message: status === 'GREEN' ? 'Database healthy' : errorMessage,
      errorMessage: status !== 'GREEN' ? errorMessage : null,
      metrics
    });
  }
  
  /**
   * Check backend health
   */
  async checkBackend() {
    const startTime = Date.now();
    let status = 'GREEN';
    let errorMessage = null;
    
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const responseTime = Date.now() - startTime;
    
    const metrics = {
      apiUptime: uptime,
      apiAvgLatency: responseTime
    };
    
    // Queue health check log
    loggingQueue.enqueue('health', {
      timestamp: new Date(),
      component: 'BACKEND',
      status,
      responseTime,
      uptime,
      message: 'Backend healthy',
      metrics
    });
  }
  
  /**
   * Check system resources
   */
  async checkSystem() {
    const startTime = Date.now();
    let status = 'GREEN';
    let errorMessage = null;
    
    try {
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const cpuUsage = 100 - (100 * totalIdle / totalTick);
      
      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      
      const metrics = {
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        memoryTotal: totalMemory,
        diskUsage: 0, // Would need additional library for accurate disk stats
        diskTotal: 0
      };
      
      // Determine status
      if (cpuUsage > 90 || memoryUsage > 90) {
        status = 'RED';
        errorMessage = 'High resource usage';
      } else if (cpuUsage > 70 || memoryUsage > 70) {
        status = 'YELLOW';
      }
      
      const responseTime = Date.now() - startTime;
      
      // Queue health check log
      loggingQueue.enqueue('health', {
        timestamp: new Date(),
        component: 'SYSTEM',
        status,
        responseTime,
        message: status === 'GREEN' ? 'System healthy' : errorMessage,
        errorMessage: status !== 'GREEN' ? errorMessage : null,
        metrics
      });
      
      // Emit real-time system metrics via Socket.IO
      this.emitSystemMetrics({ cpuUsage, memoryUsage, status });
      
    } catch (error) {
      console.error('[SystemHealthMonitor] System check error:', error.message);
    }
  }
  
  /**
   * Emit real-time system metrics to connected clients
   */
  emitSystemMetrics(systemData) {
    try {
      const { getIO } = require('../../config/socket');
      const io = getIO();
      
      const metricsData = {
        timestamp: new Date(),
        cpu: systemData.cpuUsage,
        memory: systemData.memoryUsage,
        status: systemData.status
      };
      
      // Emit to admin clients
      io.emit('system:metrics:update', metricsData);
    } catch (error) {
      // Socket.IO might not be initialized yet, silently fail
    }
  }
  
  /**
   * Get current health status
   */
  async getCurrentHealth() {
    try {
      const HealthCheck = require('../../models/observability/HealthCheck');
      
      // Get latest health check for each component
      const components = ['DATABASE', 'BACKEND', 'SYSTEM', 'WEBSOCKET'];
      const healthChecks = await Promise.all(
        components.map(component =>
          HealthCheck.findOne({ component })
            .sort({ timestamp: -1 })
            .limit(1)
        )
      );
      
      return healthChecks.filter(h => h !== null);
    } catch (error) {
      console.error('[SystemHealthMonitor] Failed to get health:', error.message);
      return [];
    }
  }
  
  /**
   * Log crash event
   */
  logCrash(crashType, component, errorMessage, errorStack, metadata = {}) {
    try {
      loggingQueue.enqueue('crash', {
        timestamp: new Date(),
        crashType,
        component,
        severity: 'CRITICAL',
        errorMessage,
        errorStack,
        metadata,
        recovered: false
      });
    } catch (error) {
      console.error('[SystemHealthMonitor] Failed to log crash:', error.message);
    }
  }
}

// Singleton instance
const systemHealthMonitor = new SystemHealthMonitor();

module.exports = systemHealthMonitor;

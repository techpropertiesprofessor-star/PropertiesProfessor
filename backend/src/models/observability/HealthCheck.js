const mongoose = require('mongoose');

/**
 * HEALTH CHECK MODEL
 * Stores system health check results for BIOS panel
 */
const healthCheckSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  
  // Component being checked
  component: {
    type: String,
    enum: ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET', 'REDIS', 'DISK', 'NETWORK'],
    required: true,
    index: true
  },
  
  // Health status
  status: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
    required: true
  },
  
  // Response time
  responseTime: Number, // milliseconds
  
  // Uptime
  uptime: Number, // seconds
  
  // Details
  message: String,
  errorMessage: String,
  
  // Component-specific metrics
  metrics: {
    // Database
    connectionStatus: String,
    dbReadLatency: Number,
    dbWriteLatency: Number,
    dbStorageUsed: Number,
    dbStorageTotal: Number,
    
    // WebSocket
    activeConnections: Number,
    
    // Backend
    apiUptime: Number,
    apiErrorRate: Number,
    apiAvgLatency: Number,
    
    // Frontend
    jsErrors: Number,
    buildVersion: String,
    
    // System
    cpuUsage: Number,
    memoryUsage: Number,
    memoryTotal: Number,
    diskUsage: Number,
    diskTotal: Number,
    networkThroughput: Number
  },
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: false,
  collection: 'observability_health_checks'
});

// Indexes
healthCheckSchema.index({ timestamp: -1 });
healthCheckSchema.index({ component: 1, timestamp: -1 });
healthCheckSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('HealthCheck', healthCheckSchema);

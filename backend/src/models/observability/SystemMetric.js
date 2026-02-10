const mongoose = require('mongoose');

/**
 * SYSTEM METRICS MODEL
 * Stores system health metrics (CPU, memory, disk, network)
 * Time-series data for monitoring
 */
const systemMetricSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  
  // Metric type
  metricType: {
    type: String,
    enum: ['CPU', 'MEMORY', 'DISK', 'NETWORK', 'DATABASE', 'WEBSOCKET', 'PROCESS', 'CUSTOM'],
    required: true,
    index: true
  },
  
  // Metric name
  name: {
    type: String,
    required: true
  },
  
  // Metric value
  value: {
    type: Number,
    required: true
  },
  
  // Unit of measurement
  unit: {
    type: String,
    enum: ['PERCENT', 'BYTES', 'MB', 'GB', 'MS', 'COUNT', 'REQUESTS_PER_SEC', 'OTHER'],
    required: true
  },
  
  // Health status
  status: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
    default: 'GREEN'
  },
  
  // Component (frontend, backend, database, etc.)
  component: {
    type: String,
    enum: ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET', 'SYSTEM'],
    required: true,
    index: true
  },
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Aggregation level (raw, 1min, 5min, 1hour, 1day)
  aggregation: {
    type: String,
    enum: ['RAW', '1MIN', '5MIN', '1HOUR', '1DAY'],
    default: 'RAW'
  },
  
  // Retention tier
  retentionTier: {
    type: String,
    enum: ['HOT', 'WARM', 'COLD'],
    default: 'HOT'
  }
}, {
  timestamps: false,
  collection: 'observability_system_metrics'
});

// Indexes
systemMetricSchema.index({ timestamp: -1 });
systemMetricSchema.index({ metricType: 1, timestamp: -1 });
systemMetricSchema.index({ component: 1, timestamp: -1 });
systemMetricSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('SystemMetric', systemMetricSchema);

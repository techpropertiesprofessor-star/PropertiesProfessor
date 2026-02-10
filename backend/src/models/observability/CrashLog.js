const mongoose = require('mongoose');

/**
 * CRASH LOG MODEL
 * Records system crashes, errors, and recovery events
 */
const crashLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  
  // Crash type
  crashType: {
    type: String,
    enum: ['FRONTEND_CRASH', 'BACKEND_CRASH', 'DATABASE_FAILURE', 'WEBSOCKET_FAILURE', 'PROCESS_EXIT', 'MEMORY_LEAK', 'TIMEOUT', 'UNKNOWN'],
    required: true,
    index: true
  },
  
  // Component
  component: {
    type: String,
    enum: ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET', 'SYSTEM'],
    required: true
  },
  
  // Severity
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'CRITICAL'
  },
  
  // Error details
  errorMessage: String,
  errorStack: String,
  errorCode: String,
  
  // Context at time of crash
  lastRoute: String,
  lastApiCall: String,
  activeUsers: Number,
  
  // State snapshot
  stateSnapshot: mongoose.Schema.Types.Mixed,
  
  // Recovery info
  recovered: {
    type: Boolean,
    default: false
  },
  recoveryTime: Date,
  recoveryMethod: String,
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // User impact
  affectedUsers: [mongoose.Schema.Types.ObjectId],
  affectedSessions: Number
}, {
  timestamps: false,
  collection: 'observability_crash_logs'
});

// Indexes
crashLogSchema.index({ timestamp: -1 });
crashLogSchema.index({ crashType: 1, timestamp: -1 });
crashLogSchema.index({ severity: 1, timestamp: -1 });
crashLogSchema.index({ recovered: 1 });

module.exports = mongoose.model('CrashLog', crashLogSchema);

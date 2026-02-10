const mongoose = require('mongoose');

/**
 * API LOG MODEL
 * Captures all API requests, responses, timing, errors
 * Immutable - INSERT ONLY
 */
const apiLogSchema = new mongoose.Schema({
  // Timestamp with millisecond precision
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  
  // Request details
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  fullUrl: String,
  
  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userRole: String,
  
  // Request metadata
  ipAddress: String,
  userAgent: String,
  requestHeaders: mongoose.Schema.Types.Mixed,
  
  // Request body info (not full body, just size and summary)
  requestSize: Number, // bytes
  requestBodySummary: String,
  queryParams: mongoose.Schema.Types.Mixed,
  
  // Response details
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  responseSize: Number, // bytes
  responseTime: {
    type: Number, // milliseconds
    required: true
  },
  
  // Bandwidth tracking
  bandwidthIn: Number, // bytes in
  bandwidthOut: Number, // bytes out
  
  // Error details
  error: String,
  errorStack: String,
  isError: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Performance categorization
  performanceCategory: {
    type: String,
    enum: ['FAST', 'NORMAL', 'SLOW', 'CRITICAL'],
    default: 'NORMAL'
  },
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Log categorization
  category: {
    type: String,
    enum: ['CRITICAL', 'ACTIVITY', 'SYSTEM'],
    default: 'SYSTEM'
  },
  
  // Retention tier
  retentionTier: {
    type: String,
    enum: ['HOT', 'WARM', 'COLD'],
    default: 'HOT'
  }
}, {
  timestamps: false,
  collection: 'observability_api_logs'
});

// Indexes for efficient querying
apiLogSchema.index({ timestamp: -1 });
apiLogSchema.index({ endpoint: 1, timestamp: -1 });
apiLogSchema.index({ userId: 1, timestamp: -1 });
apiLogSchema.index({ statusCode: 1, timestamp: -1 });
apiLogSchema.index({ isError: 1, timestamp: -1 });
apiLogSchema.index({ performanceCategory: 1, timestamp: -1 });

// Prevent updates and deletes
apiLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('API logs are immutable'));
});

apiLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('API logs cannot be deleted'));
});

module.exports = mongoose.model('ApiLog', apiLogSchema);

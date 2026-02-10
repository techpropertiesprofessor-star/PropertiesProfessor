const mongoose = require('mongoose');

/**
 * ACTIVITY LOG MODEL
 * Black box logging for all user actions (clicks, navigation, form submits)
 * Immutable - INSERT ONLY, never update/delete
 */
const activityLogSchema = new mongoose.Schema({
  // Timestamp with millisecond precision
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  
  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userRole: String,
  username: String,
  
  // Action details
  actionType: {
    type: String,
    enum: ['CLICK', 'NAVIGATION', 'FORM_SUBMIT', 'API_CALL', 'ERROR', 'PERMISSION_CHANGE', 'AUTH', 'CHAT', 'TASK', 'LEAD', 'CALENDAR', 'OTHER'],
    required: true,
    index: true
  },
  
  // Page/Route context
  route: String,
  previousRoute: String,
  
  // Action metadata
  elementId: String,
  elementType: String,
  elementText: String,
  entityType: String, // 'task', 'lead', 'chat', etc.
  entityId: String,
  
  // Payload info (not full payload, just size and summary)
  payloadSize: Number,
  payloadSummary: String,
  
  // Request details
  ipAddress: String,
  userAgent: String,
  deviceType: String, // mobile, tablet, desktop
  browser: String,
  os: String,
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Log categorization
  category: {
    type: String,
    enum: ['CRITICAL', 'ACTIVITY', 'SYSTEM'],
    default: 'ACTIVITY'
  },
  
  // Session tracking
  sessionId: String,
  
  // Error info if actionType is ERROR
  errorMessage: String,
  errorStack: String,
  
  // Retention tier (hot/warm/cold)
  retentionTier: {
    type: String,
    enum: ['HOT', 'WARM', 'COLD'],
    default: 'HOT'
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'observability_activity_logs'
});

// Indexes for efficient querying
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ actionType: 1, timestamp: -1 });
activityLogSchema.index({ category: 1, timestamp: -1 });
activityLogSchema.index({ retentionTier: 1, timestamp: -1 });

// Prevent updates and deletes
activityLogSchema.pre('findOneAndUpdate', function(next) {
  next(new Error('Activity logs are immutable'));
});

activityLogSchema.pre('findOneAndDelete', function(next) {
  next(new Error('Activity logs cannot be deleted'));
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);

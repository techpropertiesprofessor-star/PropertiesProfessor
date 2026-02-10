const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['personal', 'published'],
    default: 'personal'
  },
  // Creator of the event
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For published events (manager only)
  isPublished: {
    type: Boolean,
    default: false
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  // Tags for categorization (scalable for future features)
  tags: [{
    type: String,
    trim: true
  }],
  // Color coding for visual differentiation
  color: {
    type: String,
    default: '#3B82F6' // Blue
  },
  // For future features: attachments, links, etc.
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for efficient querying
calendarEventSchema.index({ date: 1, createdBy: 1 });
calendarEventSchema.index({ isPublished: 1 });
calendarEventSchema.index({ type: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);

const mongoose = require('mongoose');

const OwnerAccessRequestSchema = new mongoose.Schema({
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryUnit',
    required: true
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  requesterName: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
    default: 'PENDING'
  },
  approvedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedByName: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  durationMinutes: {
    type: Number,
    default: 120
  },
  rejectionReason: {
    type: String
  },
  rejectedAt: {
    type: Date
  },
  rejectedByName: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

OwnerAccessRequestSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for fast lookups
OwnerAccessRequestSchema.index({ unitId: 1, requesterId: 1, status: 1 });
OwnerAccessRequestSchema.index({ status: 1, createdAt: -1 });
OwnerAccessRequestSchema.index({ expiresAt: 1 }, { sparse: true });

module.exports = mongoose.model('OwnerAccessRequest', OwnerAccessRequestSchema);

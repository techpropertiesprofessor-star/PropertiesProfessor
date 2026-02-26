const mongoose = require('mongoose');

const InventoryLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'UNIT_CREATED',
      'UNIT_UPDATED',
      'UNIT_VIEWED',
      'UNIT_DELETED',
      'STATUS_AVAILABLE',
      'STATUS_BOOKED',
      'STATUS_HOLD',
      'STATUS_SOLD',
      'MEDIA_UPLOADED',
      'MEDIA_DELETED',
      'PROJECT_CREATED',
      'TOWER_CREATED'
    ]
  },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryUnit' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  towerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tower' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeName: { type: String, required: true },
  unitNumber: { type: String },
  projectName: { type: String },
  towerName: { type: String },
  details: { type: String },
  oldStatus: { type: String },
  newStatus: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

// Index for fast queries
InventoryLogSchema.index({ createdAt: -1 });
InventoryLogSchema.index({ employeeId: 1, createdAt: -1 });
InventoryLogSchema.index({ unitId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', InventoryLogSchema);

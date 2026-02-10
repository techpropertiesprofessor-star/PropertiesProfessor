const mongoose = require('mongoose');

const UploadHistorySchema = new mongoose.Schema({
  filename: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  uploadedAt: { type: Date, default: Date.now },
  totalLeads: { type: Number, default: 0 },
  duplicateLeads: { type: Number, default: 0 }
});

module.exports = mongoose.model('UploadHistory', UploadHistorySchema);

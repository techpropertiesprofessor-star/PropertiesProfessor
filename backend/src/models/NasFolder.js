const mongoose = require('mongoose');

const NasFileSchema = new mongoose.Schema({
  key: { type: String, required: true },          // full key in DO Spaces
  originalName: { type: String, required: true },  // original filename
  type: { type: String, enum: ['image', 'video', 'file'], default: 'file' },
  size: { type: Number, default: 0 },
  contentType: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedByName: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const NasFolderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String },
  files: [NasFileSchema],
}, {
  timestamps: true, // adds createdAt and updatedAt
});

// Index for fast lookups
NasFolderSchema.index({ createdBy: 1 });
NasFolderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('NasFolder', NasFolderSchema);

const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'EMPLOYEE', 'CALLER'], default: 'EMPLOYEE' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  permissions: [{ type: String }],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date },
  socketId: { type: String },
  documents: [{
    filename: String,
    originalname: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EmployeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Employee', EmployeeSchema);

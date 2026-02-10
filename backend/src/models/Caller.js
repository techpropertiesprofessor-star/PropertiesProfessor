const mongoose = require('mongoose');

const CallerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  company: { type: String },
  lastResponse: { type: String },
  action: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Caller', CallerSchema);

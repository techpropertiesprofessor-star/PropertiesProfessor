const mongoose = require('mongoose');

const LeadCommentSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeadComment', LeadCommentSchema);

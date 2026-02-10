const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const { emitToAll } = require('../utils/socket.util');

// Get all announcements
exports.getAll = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.json(announcements.map(a => ({
      id: a._id,
      text: a.text,
      date: a.date || a.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// Create a new announcement
exports.create = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const date = new Date().toLocaleString();
    const announcement = await Announcement.create({ text, date });
    
    // Get all employees to send notifications
    const employees = await Employee.find({}).select('_id');
    
    // Create notification for each employee
    const notificationPromises = employees.map(employee => 
      Notification.create({
        userId: employee._id,
        type: 'ANNOUNCEMENT',
        title: 'New Announcement',
        message: text.length > 100 ? text.substring(0, 100) + '...' : text,
        relatedId: announcement._id,
        relatedModel: 'Announcement',
        data: { announcementId: announcement._id, fullText: text }
      })
    );
    
    await Promise.all(notificationPromises);
    
    // Emit via Socket.IO to all users
    if (req.app.get('io')) {
      req.app.get('io').emit('new-announcement', {
        id: announcement._id,
        text: announcement.text,
        date: announcement.date,
        createdBy: req.user?.id || req.user?._id || null,
      });
      
      // Also emit notification event to all users
      emitToAll('new-notification', {
        type: 'ANNOUNCEMENT',
        title: 'New Announcement',
        message: text.length > 100 ? text.substring(0, 100) + '...' : text,
        announcementId: announcement._id,
        createdAt: announcement.createdAt,
        createdBy: req.user?.id || req.user?._id || null,
      });
    }
    
    res.status(201).json({
      id: announcement._id,
      text: announcement.text,
      date: announcement.date,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
};

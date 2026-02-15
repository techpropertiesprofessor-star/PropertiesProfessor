const Notification = require('../models/Notification');

exports.getNotifications = async (req, res, next) => {
  try {
    // Fetch notifications only for current user
    const userId = req.user.employeeId || req.user._id || req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.employeeId || req.user._id || req.user.id;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    // Count unread notifications for current user
    const userId = req.user.employeeId || req.user._id || req.user.id;
    const count = await Notification.countDocuments({ userId, read: false });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

exports.getCountsByType = async (req, res, next) => {
  try {
    const userId = req.user.employeeId || req.user._id || req.user.id;
    
    // Count unread notifications by type
    const counts = {
      leads: await Notification.countDocuments({ userId, read: false, type: 'lead-assigned' }),
      tasks: await Notification.countDocuments({ 
        userId, 
        read: false, 
        type: { $in: ['TASK_ASSIGNED', 'TASK_STATUS_UPDATE'] } 
      }),
      teamChat: await Notification.countDocuments({ 
        userId, 
        read: false, 
        type: { $in: ['TEAM_CHAT', 'PRIVATE_MESSAGE'] } 
      }),
      callers: await Notification.countDocuments({ 
        userId, 
        read: false, 
        type: 'CALLER_ASSIGNED' 
      }),
      calendar: await Notification.countDocuments({ 
        userId, 
        read: false, 
        type: 'calendar-event' 
      }),
      announcements: await Notification.countDocuments({ 
        userId, 
        read: false, 
        type: 'ANNOUNCEMENT' 
      }),
      total: await Notification.countDocuments({ userId, read: false })
    };
    
    res.json(counts);
  } catch (err) {
    next(err);
  }
};

// Mark all team chat notifications as read
exports.markTeamChatAsRead = async (req, res, next) => {
  try {
    const userId = req.user.employeeId || req.user._id || req.user.id;
    
    // Mark all TEAM_CHAT notifications as read for this user
    const result = await Notification.updateMany(
      { 
        userId, 
        type: 'TEAM_CHAT', 
        read: false 
      },
      { read: true }
    );
    
    res.json({ 
      success: true, 
      markedCount: result.modifiedCount,
      message: `${result.modifiedCount} team chat notifications marked as read`
    });
  } catch (err) {
    next(err);
  }
};

// Mark all notifications of a specific section/type as read
exports.markSectionAsRead = async (req, res, next) => {
  try {
    const userId = req.user.employeeId || req.user._id || req.user.id;
    const { section } = req.params;
    
    // Map section names to notification types
    const sectionTypeMap = {
      leads: ['lead-assigned', 'LEAD_ASSIGNED'],
      tasks: ['TASK_ASSIGNED', 'TASK_STATUS_UPDATE'],
      teamChat: ['TEAM_CHAT', 'PRIVATE_MESSAGE'],
      callers: ['CALLER_ASSIGNED'],
      calendar: ['calendar-event'],
      announcements: ['ANNOUNCEMENT']
    };
    
    const types = sectionTypeMap[section];
    if (!types) {
      return res.status(400).json({ message: 'Invalid section type' });
    }
    
    const result = await Notification.updateMany(
      { userId, type: { $in: types }, read: false },
      { read: true }
    );
    
    res.json({ 
      success: true, 
      markedCount: result.modifiedCount,
      message: `${result.modifiedCount} ${section} notifications marked as read`
    });
  } catch (err) {
    next(err);
  }
};


const CalendarEvent = require('../models/CalendarEvent');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const { getIO } = require('../config/socket');

// Get calendar events for a specific month
exports.getEvents = async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month are required' });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Build query based on user role
    let query = {
      date: { $gte: startDate, $lte: endDate }
    };

    // Employees see only their own events + published events
    // Managers see their own events + published events (they can see all published, not just their own)
    if (userRole === 'EMPLOYEE') {
      query.$or = [
        { createdBy: userId, isPublished: false },
        { isPublished: true }
      ];
    } else if (userRole === 'MANAGER' || userRole === 'ADMIN') {
      // Managers and admins see all their events + all published events
      query.$or = [
        { createdBy: userId },
        { isPublished: true }
      ];
    }

    const events = await CalendarEvent.find(query)
      .populate('createdBy', 'name email role')
      .sort({ date: 1, createdAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({ message: 'Failed to fetch calendar events' });
  }
};

// Create a new calendar event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, priority, status, tags, color, isPublished } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }

    // Only managers can create published events
    const canPublish = userRole === 'MANAGER' || userRole === 'ADMIN';
    const shouldPublish = isPublished && canPublish;

    const eventData = {
      title,
      description,
      date: new Date(date),
      priority: priority || 'medium',
      status: status || 'pending',
      tags: tags || [],
      color: color || '#3B82F6',
      createdBy: userId,
      isPublished: shouldPublish,
      type: shouldPublish ? 'published' : 'personal'
    };

    const event = new CalendarEvent(eventData);
    await event.save();

    const populatedEvent = await CalendarEvent.findById(event._id)
      .populate('createdBy', 'name email role');

    // If event is published, send notifications to all employees
    if (shouldPublish) {
      try {
        // Get all employees except the creator
        const employees = await Employee.find({ 
          _id: { $ne: userId },
          role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
          status: 'active'
        });

        // Create notifications for all employees
        const notifications = employees.map(employee => ({
          userId: employee._id,
          type: 'calendar-event',
          title: 'New Calendar Event',
          message: `${populatedEvent.createdBy.name} published a new event: ${title}`,
          relatedId: event._id,
          relatedModel: 'CalendarEvent',
          data: {
            eventTitle: title,
            eventDate: date,
            priority: priority || 'medium',
            createdBy: populatedEvent.createdBy.name
          },
          read: false,
          createdAt: new Date()
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications via Socket.IO
        const io = getIO();
        employees.forEach(employee => {
          if (employee.socketId) {
            io.to(employee.socketId).emit('new-notification', {
              type: 'calendar-event',
              title: 'New Calendar Event',
              message: `${populatedEvent.createdBy.name} published a new event: ${title}`,
              data: notifications.find(n => n.userId.toString() === employee._id.toString())
            });
          }
        });

        console.log(`📅 Sent calendar event notifications to ${employees.length} employees`);
      } catch (notifError) {
        console.error('Error sending calendar event notifications:', notifError);
        // Don't fail the request if notification sending fails
      }
    }

    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({ message: 'Failed to create calendar event' });
  }
};

// Update a calendar event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, priority, status, tags, color, isPublished } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions: only creator can edit their own events
    if (event.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    // Update fields
    const wasPublished = event.isPublished;
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (date) event.date = new Date(date);
    if (priority) event.priority = priority;
    if (status) event.status = status;
    if (tags) event.tags = tags;
    if (color) event.color = color;

    // Only managers can toggle publish status
    if (isPublished !== undefined && (userRole === 'MANAGER' || userRole === 'ADMIN')) {
      event.isPublished = isPublished;
      event.type = isPublished ? 'published' : 'personal';
    }

    await event.save();

    const updatedEvent = await CalendarEvent.findById(event._id)
      .populate('createdBy', 'name email role');

    // If event was just published (changed from unpublished to published), send notifications
    if (!wasPublished && event.isPublished) {
      try {
        // Get all employees except the creator
        const employees = await Employee.find({ 
          _id: { $ne: userId },
          role: { $in: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
          status: 'active'
        });

        // Create notifications for all employees
        const notifications = employees.map(employee => ({
          userId: employee._id,
          type: 'calendar-event',
          title: 'New Calendar Event',
          message: `${updatedEvent.createdBy.name} published a new event: ${event.title}`,
          relatedId: event._id,
          relatedModel: 'CalendarEvent',
          data: {
            eventTitle: event.title,
            eventDate: event.date,
            priority: event.priority,
            createdBy: updatedEvent.createdBy.name
          },
          read: false,
          createdAt: new Date()
        }));

        await Notification.insertMany(notifications);

        // Send real-time notifications via Socket.IO
        const io = getIO();
        employees.forEach(employee => {
          if (employee.socketId) {
            io.to(employee.socketId).emit('new-notification', {
              type: 'calendar-event',
              title: 'New Calendar Event',
              message: `${updatedEvent.createdBy.name} published a new event: ${event.title}`,
              data: notifications.find(n => n.userId.toString() === employee._id.toString())
            });
          }
        });

        console.log(`📅 Sent calendar event notifications to ${employees.length} employees`);
      } catch (notifError) {
        console.error('Error sending calendar event notifications:', notifError);
        // Don't fail the request if notification sending fails
      }
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ message: 'Failed to update calendar event' });
  }
};

// Delete a calendar event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await CalendarEvent.findById(id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check permissions: only creator can delete their own events
    if (event.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }

    await CalendarEvent.findByIdAndDelete(id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ message: 'Failed to delete calendar event' });
  }
};

// Get events for a specific date
exports.getEventsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    let query = {
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    // Apply role-based filtering
    if (userRole === 'EMPLOYEE') {
      query.$or = [
        { createdBy: userId, isPublished: false },
        { isPublished: true }
      ];
    } else if (userRole === 'MANAGER' || userRole === 'ADMIN') {
      query.$or = [
        { createdBy: userId },
        { isPublished: true }
      ];
    }

    const events = await CalendarEvent.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('Error fetching events by date:', error);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

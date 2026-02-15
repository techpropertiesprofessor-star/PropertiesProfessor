const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const CalendarEvent = require('../models/CalendarEvent');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Caller = require('../models/Caller');

// All routes require authentication
router.use(authMiddleware);

// GET /api/reminders/today - Get all today's reminders for the logged-in user
router.get('/today', async (req, res) => {
  try {
    const userId = req.user._id;
    const employeeId = req.user.employeeId || req.user._id;
    const userRole = req.user.role;

    // Today's date range (start of day to end of day)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const reminders = [];

    // ========== 1. CALENDAR EVENTS ==========
    try {
      // Get events created by this user OR published events, for today
      const calendarFilter = {
        date: { $gte: todayStart, $lte: todayEnd },
        status: { $ne: 'completed' },
        $or: [
          { createdBy: userId },
          { isPublished: true }
        ]
      };
      const events = await CalendarEvent.find(calendarFilter)
        .select('title description date priority status type color')
        .sort({ date: 1 })
        .limit(10);

      events.forEach(event => {
        reminders.push({
          _id: event._id,
          category: 'calendar',
          title: event.title,
          description: event.description || '',
          date: event.date,
          priority: event.priority || 'medium',
          status: event.status || 'pending',
          icon: '📅',
          color: event.color || '#3B82F6',
          link: '/calendar'
        });
      });
    } catch (err) {
      console.error('Reminder: Calendar events error:', err.message);
    }

    // ========== 2. TASKS ==========
    try {
      const taskFilter = {
        status: { $in: ['PENDING', 'IN_PROGRESS'] }
      };
      // EMPLOYEE sees only assigned tasks, MANAGER sees all
      if (userRole === 'EMPLOYEE') {
        taskFilter.assignedTo = employeeId;
      }
      // Tasks due today or overdue
      taskFilter.$or = [
        { dueDate: { $gte: todayStart, $lte: todayEnd } }, // Due today
        { dueDate: { $lt: todayStart } } // Overdue
      ];

      const tasks = await Task.find(taskFilter)
        .populate('assignedTo', 'name')
        .select('title description dueDate priority status assignedTo')
        .sort({ dueDate: 1 })
        .limit(10);

      tasks.forEach(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < todayStart;
        reminders.push({
          _id: task._id,
          category: 'task',
          title: task.title,
          description: task.description || '',
          date: task.dueDate,
          priority: isOverdue ? 'high' : (task.priority || 'medium'),
          status: task.status,
          assignedTo: task.assignedTo?.name || '',
          isOverdue,
          icon: isOverdue ? '🔴' : '📋',
          link: `/tasks/${task._id}`
        });
      });
    } catch (err) {
      console.error('Reminder: Tasks error:', err.message);
    }

    // ========== 3. LEADS (assigned, pending action only) ==========
    try {
      const leadFilter = {
        status: { $in: ['new', 'assigned'] } // Only show actionable/pending leads
      };
      // EMPLOYEE sees only assigned leads
      if (userRole === 'EMPLOYEE') {
        leadFilter.assignedTo = employeeId;
      }
      // Leads assigned today or with no remark yet
      leadFilter.$or = [
        { createdAt: { $gte: todayStart, $lte: todayEnd } }, // Created today
        { remarks: { $in: ['', null] }, assignedTo: { $ne: null } } // Assigned but no remark
      ];

      const leads = await Lead.find(leadFilter)
        .populate('assignedTo', 'name')
        .select('name phone source status remarks assignedTo createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      leads.forEach(lead => {
        const noRemark = !lead.remarks || lead.remarks === '';
        reminders.push({
          _id: lead._id,
          category: 'lead',
          title: `Lead: ${lead.name || lead.phone}`,
          description: noRemark ? 'No remark added yet - please follow up!' : `Remark: ${lead.remarks}`,
          date: lead.createdAt,
          priority: noRemark ? 'high' : 'medium',
          status: lead.status,
          assignedTo: lead.assignedTo?.name || 'Unassigned',
          icon: noRemark ? '⚠️' : '📞',
          link: '/leads'
        });
      });
    } catch (err) {
      console.error('Reminder: Leads error:', err.message);
    }

    // ========== 4. CALLERS (assigned, pending action) ==========
    try {
      const callerFilter = {};
      // EMPLOYEE sees only assigned callers
      if (userRole === 'EMPLOYEE') {
        callerFilter.assignedTo = employeeId;
      } else {
        // MANAGER sees callers assigned to someone
        callerFilter.assignedTo = { $ne: null };
      }
      // Callers with no response or action pending
      callerFilter.$or = [
        { lastResponse: { $in: ['', null] } },
        { action: { $in: ['', null] } }
      ];

      const callers = await Caller.find(callerFilter)
        .populate('assignedTo', 'name')
        .select('name phone company lastResponse action assignedTo createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      callers.forEach(caller => {
        reminders.push({
          _id: caller._id,
          category: 'caller',
          title: `Caller: ${caller.name || caller.phone}`,
          description: caller.company ? `Company: ${caller.company}` : 'Pending response',
          date: caller.createdAt,
          priority: 'medium',
          status: 'pending',
          assignedTo: caller.assignedTo?.name || 'Unassigned',
          icon: '📱',
          link: '/callers'
        });
      });
    } catch (err) {
      console.error('Reminder: Callers error:', err.message);
    }

    res.json({
      success: true,
      count: reminders.length,
      reminders,
      fetchedAt: new Date()
    });
  } catch (err) {
    console.error('Reminders API error:', err);
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
});

module.exports = router;

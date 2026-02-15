// Employee can update only their own assigned task status
exports.updateTaskStatusByEmployee = async (req, res, next) => {
  try {
    const { status } = req.body;
    const employeeId = (req.user.employeeId || req.user._id).toString();
    const task = await Task.findById(req.params.id).populate('createdBy assignedTo');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo && task.assignedTo._id.toString() !== employeeId) {
      return res.status(403).json({ message: 'You are not allowed to update this task.' });
    }
    
    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = Date.now();
    await task.save();
    
    // Send real-time notification to manager/creator
    if (task.createdBy && oldStatus !== status) {
      const employeeName = task.assignedTo ? (task.assignedTo.first_name ? `${task.assignedTo.first_name} ${task.assignedTo.last_name}` : task.assignedTo.name || task.assignedTo.email) : 'Employee';
      
      // Create notification for manager
      const notification = new Notification({
        userId: task.createdBy._id,
        type: 'TASK_STATUS_UPDATE',
        title: 'Task Status Updated',
        message: `${employeeName} changed task "${task.title}" status from ${oldStatus} to ${status}`,
        relatedId: task._id,
        relatedModel: 'Task'
      });
      await notification.save();
      
      // Emit socket event to manager
      emitToUser(task.createdBy._id.toString(), 'taskStatusUpdated', {
        task: task.toObject(),
        oldStatus,
        newStatus: status,
        employeeName,
        notification: notification.toObject()
      });
    }
    
    // Broadcast task update to all clients for real-time updates
    emitToAll('task-updated', { task: task.toObject(), timestamp: Date.now() });

    res.json(task);
  } catch (err) {
    next(err);
  }
};
const Employee = require('../models/Employee');
// Get manager name for a task
exports.getManagerNameForTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (!task.createdBy) return res.status(404).json({ message: 'Task creator not found' });
    // Find the creator in Employee collection and check role
    const manager = await Employee.findOne({ _id: task.createdBy, role: 'MANAGER' });
    if (!manager) return res.status(404).json({ message: 'Manager not found' });
    res.json({ name: manager.name, id: manager._id });
  } catch (err) {
    next(err);
  }
};
// Pin/unpin by manager
exports.pinByManager = async (req, res, next) => {
  try {
    // Only managers can pin any task
    const task = await Task.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.unpinByManager = async (req, res, next) => {
  try {
    // Only managers can unpin any task
    const task = await Task.findByIdAndUpdate(req.params.id, { pinned: false }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// Pin/unpin by employee (only their own assigned tasks)
exports.pinByEmployee = async (req, res, next) => {
  try {
    const employeeId = (req.user.employeeId || req.user._id).toString();
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo && task.assignedTo.toString() !== employeeId) {
      return res.status(403).json({ message: 'You are not allowed to pin this task' });
    }
    task.pinned = true;
    await task.save();
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.unpinByEmployee = async (req, res, next) => {
  try {
    const employeeId = (req.user.employeeId || req.user._id).toString();
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo && task.assignedTo.toString() !== employeeId) {
      return res.status(403).json({ message: 'You are not allowed to unpin this task' });
    }
    task.pinned = false;
    await task.save();
    res.json(task);
  } catch (err) {
    next(err);
  }
};
const Task = require('../models/Task');
const TaskComment = require('../models/TaskComment');

const Notification = require('../models/Notification');
const { emitToUser, emitToAll } = require('../utils/socket.util');

exports.createTask = async (req, res, next) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const task = new Task({
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      createdBy: req.user.id
    });
    await task.save();

    // Emit real-time event and create notification if assignedTo exists (only to assigned employee)
    if (assignedTo) {
      const notification = await Notification.create({
        userId: assignedTo,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: `A new task has been assigned to you: ${task.title}`,
        relatedId: task._id,
        relatedModel: 'Task',
        data: { taskId: task._id }
      });
      
      // Emit socket notification to assigned employee only
      emitToUser(assignedTo, 'new-notification', {
        id: notification._id,
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: notification.message,
        taskId: task._id,
        createdAt: notification.createdAt
      });
    }

    // Broadcast task creation to all connected clients for real-time updates
    emitToAll('task-created', { task: task.toObject(), timestamp: Date.now() });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

exports.getTasks = async (req, res, next) => {
  try {
    const { status, pinned, assignedTo } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (pinned) filter.pinned = pinned === 'true';
    if (assignedTo) filter.assignedTo = assignedTo;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, status, pinned, dueDate, assignedTo } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, status, pinned, dueDate, assignedTo, updatedAt: Date.now() },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Broadcast task update to all connected clients for real-time updates
    emitToAll('task-updated', { task: task.toObject(), timestamp: Date.now() });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.pinTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.unpinTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { pinned: false }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.archiveTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, { status: 'ARCHIVED', archivedAt: Date.now() }, { new: true });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.getBacklog = async (req, res, next) => {
  try {
    const { empId } = req.params;
    const tasks = await Task.find({ assignedTo: empId, status: { $in: ['PENDING', 'IN_PROGRESS'] } }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const { empId } = req.params;
    const mongoose = require('mongoose');
    const stats = await Task.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(empId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

exports.getTasksByDate = async (req, res, next) => {
  try {
    const { empId, date } = req.params;
    // Parse date and get start/end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    const tasks = await Task.find({
      assignedTo: empId,
      $or: [
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

// Task Comments
exports.addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ message: 'Comment is required' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const newComment = new TaskComment({
      task: req.params.id,
      author: req.user.id,
      comment
    });
    await newComment.save();
    res.status(201).json(newComment);
  } catch (err) {
    next(err);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const comments = await TaskComment.find({ task: req.params.id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    next(err);
  }
};

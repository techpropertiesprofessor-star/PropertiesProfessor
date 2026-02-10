const Employee = require('../models/Employee');
const Task = require('../models/Task');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

// Get basic info for all employees (for chat member count)
exports.getEmployeesBasic = async (req, res, next) => {
  try {
    const employees = await Employee.find({}, '_id name status');
    res.json(employees);
  } catch (err) {
    next(err);
  }
};
const path = require('path');
const { getIO } = require('../config/socket');

exports.createEmployee = async (req, res, next) => {
  try {
    let { first_name, last_name, name, email, phone, role } = req.body;
    if ((!first_name || !last_name) && name) {
      // Split name if only name is provided (backward compatibility)
      const parts = name.trim().split(' ');
      first_name = parts[0];
      last_name = parts.slice(1).join(' ') || '-';
    }
    if (!first_name || !last_name || !email) return res.status(400).json({ message: 'First name, last name, and email are required' });
    const exists = await Employee.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already exists' });
    const employee = new Employee({ first_name, last_name, email, phone, role });
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
};

exports.getEmployees = async (req, res, next) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeById = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid or missing employee ID' });
    }
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid or missing employee ID' });
    }
    let { first_name, last_name, name, phone, role, permissions } = req.body;
    if ((!first_name || !last_name) && name) {
      const parts = name.trim().split(' ');
      first_name = parts[0];
      last_name = parts.slice(1).join(' ') || '-';
    }
    const updateFields = { first_name, last_name, phone, role, updatedAt: Date.now() };
    if (permissions !== undefined) updateFields.permissions = permissions;
    const employee = await Employee.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    // Emit real-time update via Socket.IO
    try {
      const io = getIO();
      console.log('📡 Emitting Socket.IO events for employee:', employee._id);
      
      // Emit to the specific employee if they're online
      if (employee.socketId) {
        console.log('  → Sending permissions-updated to socketId:', employee.socketId);
        io.to(employee.socketId).emit('permissions-updated', {
          employeeId: employee._id,
          permissions: employee.permissions,
          updatedAt: employee.updatedAt
        });
      } else {
        console.log('  ⚠️  No socketId found for employee');
      }
      
      // Emit to all managers for dashboard updates
      console.log('  → Broadcasting employee-updated to all clients');
      io.emit('employee-updated', {
        employeeId: employee._id,
        employee: employee,
        updatedBy: req.user.id,
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.error('❌ Socket emission error:', socketErr);
    }
    
    res.json(employee);
  } catch (err) {
    next(err);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid or missing employee ID' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    employee.documents.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date()
    });
    await employee.save();
    res.status(201).json({ message: 'Document uploaded', document: req.file });
  } catch (err) {
    next(err);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid or missing employee ID' });
    }
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee.documents);
  } catch (err) {
    next(err);
  }
};

// Update employee online status
exports.updateOnlineStatus = async (req, res, next) => {
  try {
    const { employeeId, isOnline, socketId } = req.body;
    const updateData = {
      isOnline,
      lastSeen: new Date(),
      updatedAt: Date.now()
    };
    if (socketId) updateData.socketId = socketId;
    
    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      updateData,
      { new: true }
    );
    
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    // Emit status change to all managers
    try {
      const io = getIO();
      io.emit('employee-status-changed', {
        employeeId: employee._id,
        isOnline: employee.isOnline,
        lastSeen: employee.lastSeen,
        timestamp: new Date()
      });
    } catch (socketErr) {
      console.error('Socket emission error:', socketErr);
    }
    
    res.json({ message: 'Status updated', employee });
  } catch (err) {
    next(err);
  }
};

// Get employee with real-time status
exports.getEmployeeWithStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid or missing employee ID' });
    }
    
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    // Calculate online status (consider online if last seen within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isCurrentlyOnline = employee.isOnline && employee.lastSeen && employee.lastSeen > fiveMinutesAgo;
    
    res.json({
      ...employee.toObject(),
      isCurrentlyOnline,
      statusText: isCurrentlyOnline ? 'Online' : 
                  employee.lastSeen ? `Last seen ${formatTimeDiff(employee.lastSeen)}` : 'Offline'
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to format time difference
function formatTimeDiff(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

// Get comprehensive statistics for all employees (Manager Dashboard)
exports.getEmployeesStatistics = async (req, res, next) => {
  try {
    const employees = await Employee.find().select('-documents -__v');
    
    // Get statistics for all employees in parallel
    const employeesWithStats = await Promise.all(
      employees.map(async (employee) => {
        try {
          // Find the user for this employee
          const user = await User.findOne({ employeeId: employee._id }).select('_id');

          // Task Statistics
          const [totalTasks, completedTasks, pendingTasks, inProgressTasks] = await Promise.all([
            Task.countDocuments({ assignedTo: employee._id }),
            Task.countDocuments({ assignedTo: employee._id, status: 'COMPLETED' }),
            Task.countDocuments({ assignedTo: employee._id, status: 'PENDING' }),
            Task.countDocuments({ assignedTo: employee._id, status: 'IN_PROGRESS' })
          ]);

          // Attendance Statistics (current month)
          const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
          
          const [presentDays, absentDays] = await Promise.all([
            Attendance.countDocuments({
              employee: employee._id,
              status: 'PRESENT',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            Attendance.countDocuments({
              employee: employee._id,
              status: 'ABSENT',
              date: { $gte: startOfMonth, $lte: endOfMonth }
            })
          ]);

          // Leave Statistics (current month)
          const leaveDays = await LeaveRequest.aggregate([
            {
              $match: {
                userId: employee._id,
                status: 'APPROVED',
                $or: [
                  { fromDate: { $gte: startOfMonth, $lte: endOfMonth } },
                  { toDate: { $gte: startOfMonth, $lte: endOfMonth } }
                ]
              }
            },
            {
              $project: {
                days: {
                  $divide: [
                    { $subtract: ['$toDate', '$fromDate'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalLeaveDays: { $sum: { $add: ['$days', 1] } }
              }
            }
          ]);

          const totalLeaveDays = leaveDays.length > 0 ? Math.round(leaveDays[0].totalLeaveDays) : 0;

          // Online/Offline Status
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const isOnline = employee.isOnline && employee.lastSeen && employee.lastSeen > fiveMinutesAgo;

          // Parse name - split into first and last name
          const nameParts = employee.name ? employee.name.trim().split(' ') : ['Unknown', ''];
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';

          return {
            _id: employee._id,
            userId: user ? user._id : null,
            name: employee.name,
            first_name: firstName,
            last_name: lastName,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            permissions: employee.permissions,
            isOnline: isOnline,
            lastSeen: employee.lastSeen,
            statusText: isOnline ? 'Online' : 
                       employee.lastSeen ? `Last seen ${formatTimeDiff(employee.lastSeen)}` : 'Offline',
            statistics: {
              tasks: {
                total: totalTasks,
                completed: completedTasks,
                pending: pendingTasks,
                inProgress: inProgressTasks
              },
              attendance: {
                presentDays: presentDays,
                absentDays: absentDays,
                leaveDays: totalLeaveDays,
                totalWorkingDays: presentDays + absentDays + totalLeaveDays
              }
            }
          };
        } catch (err) {
          console.error(`Error fetching stats for employee ${employee._id}:`, err);
          const nameParts = employee.name ? employee.name.trim().split(' ') : ['Unknown', ''];
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || '';
          return {
            _id: employee._id,
            userId: null,
            name: employee.name,
            first_name: firstName,
            last_name: lastName,
            email: employee.email,
            error: 'Failed to fetch statistics'
          };
        }
      })
    );

    res.json(employeesWithStats);
  } catch (err) {
    next(err);
  }
};

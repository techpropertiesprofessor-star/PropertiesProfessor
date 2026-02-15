const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const { getIO } = require('../config/socket');
const { emitToAll } = require('../utils/socket.util');

exports.checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.user.id;
    const today = new Date();
    today.setHours(0,0,0,0);
    let attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (attendance && attendance.checkIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }
    if (!attendance) {
      attendance = new Attendance({ employee: employeeId, date: today, checkIn: new Date() });
    } else {
      attendance.checkIn = new Date();
    }
    await attendance.save();
    
    // Populate employee details for socket broadcast
    await attendance.populate('employee', 'name email');
    
    // Emit socket event for real-time update
    try {
      const io = getIO();
      // Emit to user's room
      io.to(employeeId.toString()).emit('attendance-updated', {
        type: 'checkIn',
        attendance,
        employeeId
      });
      
      // Emit to all managers for team attendance update
      io.emit('team-attendance-updated', {
        type: 'checkIn',
        attendance: {
          _id: attendance._id,
          employee: attendance.employee._id,
          employeeName: attendance.employee?.name || attendance.employee?.email || 'Unknown',
          date: attendance.date,
          checkIn: attendance.checkIn,
          check_in: attendance.checkIn,
          checkOut: attendance.checkOut,
          check_out: attendance.checkOut,
          status: attendance.status
        }
      });
    } catch (socketErr) {
      console.error('Socket emit error:', socketErr);
    }
    
    res.json({ message: 'Checked in', attendance });
  } catch (err) {
    next(err);
  }
};

exports.checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.user.id;
    const today = new Date();
    today.setHours(0,0,0,0);
    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'Check-in required before check-out' });
    }
    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }
    attendance.checkOut = new Date();
    await attendance.save();

    // Broadcast attendance update for real-time
    emitToAll('attendance-updated', { type: 'checkOut', attendance: attendance.toObject(), employeeId, timestamp: Date.now() });

    res.json({ message: 'Checked out', attendance });
  } catch (err) {
    next(err);
  }
};

exports.myHistory = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.user.id;
    const history = await Attendance.find({ employee: employeeId }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    next(err);
  }
};

exports.employeeHistory = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const history = await Attendance.find({ employee: employeeId }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    next(err);
  }
};

exports.monthlySummary = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId || req.user.id;
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const summary = await Attendance.find({
      employee: employeeId,
      date: { $gte: start, $lte: end }
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

exports.leaveRequest = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { from, to, reason, leave_type } = req.body;
    if (!from || !to || !reason || !leave_type) return res.status(400).json({ message: 'All fields required' });
    try {
      const leave = new LeaveRequest({
        userId,
        fromDate: from,
        toDate: to,
        reason,
        leaveType: leave_type,
        status: 'PENDING',
      });
      await leave.save();
      res.status(201).json({ message: 'Leave request submitted', leave });
    } catch (err) {
      console.error('LeaveRequest save error:', err);
      return res.status(500).json({ message: 'Failed to submit leave request', error: err.message });
    }
  } catch (err) {
    next(err);
  }
};

exports.myLeaveRequests = async (req, res, next) => {
  try {
    const employeeId = req.user.id;
    const leaves = await LeaveRequest.find({ employee: employeeId }).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
};

exports.approveLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    leave.status = 'APPROVED';
    await leave.save();
    res.json({ message: 'Leave approved', leave });
  } catch (err) {
    next(err);
  }
};

exports.rejectLeave = async (req, res, next) => {
  try {
    const { id } = req.params;
    const leave = await LeaveRequest.findById(id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    leave.status = 'REJECTED';
    await leave.save();
    res.json({ message: 'Leave rejected', leave });
  } catch (err) {
    next(err);
  }
};

// Get all leave requests (for managers/admins)
exports.allLeaveRequests = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find().populate('employee').sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
};

// Get team attendance (for managers)
exports.getTeamAttendance = async (req, res, next) => {
  try {
    // Get all attendance records for all employees
    const attendance = await Attendance.find({})
      .populate('employee', 'name email')
      .sort({ date: -1 });
    
    // Map to include employee ID
    const mapped = attendance.map(a => ({
      _id: a._id,
      employee: a.employee?._id || a.employee,
      employeeName: a.employee?.name || a.employee?.email || 'Unknown',
      date: a.date,
      checkIn: a.checkIn,
      check_in: a.checkIn,
      checkOut: a.checkOut,
      check_out: a.checkOut,
      status: a.status
    }));
    
    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

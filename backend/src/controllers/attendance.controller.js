const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Employee = require('../models/Employee');
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

// Manager view: complete daily attendance timeline for one employee in a month
exports.getEmployeeMonthlyTimeline = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const now = new Date();
    const queryMonth = Number(req.query.month) || (now.getMonth() + 1);
    const queryYear = Number(req.query.year) || now.getFullYear();

    if (!employeeId || !employeeId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid employeeId' });
    }
    if (!Number.isInteger(queryMonth) || queryMonth < 1 || queryMonth > 12) {
      return res.status(400).json({ message: 'month must be between 1 and 12' });
    }
    if (!Number.isInteger(queryYear) || queryYear < 2000 || queryYear > 2100) {
      return res.status(400).json({ message: 'year is invalid' });
    }

    const employee = await Employee.findById(employeeId).select('name email joiningDate createdAt');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const monthStart = new Date(queryYear, queryMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);

    const [attendanceRows, holidays, user] = await Promise.all([
      Attendance.find({
        employee: employee._id,
        date: { $gte: monthStart, $lte: monthEnd }
      }).sort({ date: 1 }).lean(),
      Holiday.find({ date: { $gte: monthStart, $lte: monthEnd } }).select('date name').lean(),
      User.findOne({ $or: [{ employeeId: employee._id }, { email: employee.email }] }).select('_id').lean()
    ]);

    let approvedLeaves = [];
    if (user?._id) {
      approvedLeaves = await LeaveRequest.find({
        userId: user._id,
        status: 'APPROVED',
        fromDate: { $lte: monthEnd },
        toDate: { $gte: monthStart }
      }).select('fromDate toDate').lean();
    }

    const holidayMap = new Map();
    holidays.forEach((h) => {
      holidayMap.set(new Date(h.date).toDateString(), h.name || 'Holiday');
    });

    const leaveDaySet = new Set();
    approvedLeaves.forEach((leave) => {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      const start = from < monthStart ? new Date(monthStart) : new Date(from);
      const end = to > monthEnd ? new Date(monthEnd) : new Date(to);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        leaveDaySet.add(new Date(d).toDateString());
      }
    });

    const attendanceMap = new Map();
    attendanceRows.forEach((row) => {
      attendanceMap.set(new Date(row.date).toDateString(), row);
    });

    const joiningBase = employee.joiningDate || employee.createdAt || monthStart;
    const joiningDate = new Date(joiningBase);
    joiningDate.setHours(0, 0, 0, 0);
    const startDate = joiningDate > monthStart ? joiningDate : monthStart;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      weekOff: 0,
      holiday: 0,
      totalDaysInRange: 0
    };

    for (let d = new Date(startDate); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dayDate = new Date(d);
      const key = dayDate.toDateString();
      const record = attendanceMap.get(key);
      const holidayName = holidayMap.get(key);
      const isLeaveDay = leaveDaySet.has(key);
      const dayOfWeek = dayDate.getDay();
      const isFutureDay = dayDate > today;

      let status = 'ABSENT';
      if (isFutureDay) {
        status = 'FUTURE';
      } else if (record) {
        if (record.status === 'LEAVE') status = 'LEAVE';
        else if (record.status === 'HALF_DAY') status = 'HALF_DAY';
        else status = 'PRESENT';
      } else if (holidayName) {
        status = 'HOLIDAY';
      } else if (isLeaveDay) {
        status = 'LEAVE';
      } else if (dayOfWeek === 1) {
        status = 'WEEK_OFF';
      }

      if (!isFutureDay) {
        summary.totalDaysInRange += 1;
        if (status === 'PRESENT' || status === 'HALF_DAY') summary.present += 1;
        if (status === 'ABSENT') summary.absent += 1;
        if (status === 'LEAVE') summary.leave += 1;
        if (status === 'WEEK_OFF') summary.weekOff += 1;
        if (status === 'HOLIDAY') summary.holiday += 1;
      }

      days.push({
        date: dayDate,
        dayLabel: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
        status,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        punchInTime: record?.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) : null,
        punchOutTime: record?.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }) : null,
        holidayName: holidayName || null
      });
    }

    return res.json({
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email
      },
      month: queryMonth,
      year: queryYear,
      summary,
      days
    });
  } catch (err) {
    next(err);
  }
};

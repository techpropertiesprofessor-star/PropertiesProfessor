// POST /api/leaves
exports.createLeaveRequest = async (req, res, next) => {
  try {
    const { start_date, end_date, reason, leave_type } = req.body;
    // Support both camelCase and snake_case from frontend
    const fromDate = req.body.fromDate || start_date;
    const toDate = req.body.toDate || end_date;
    const leaveType = req.body.leaveType || leave_type;
    if (!fromDate || !toDate || !reason || !leaveType) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const leave = new LeaveRequest({
      userId: req.user._id || req.user.id,
      fromDate,
      toDate,
      reason,
      leaveType,
      status: 'PENDING',
    });
    await leave.save();
    res.status(201).json({ message: 'Leave request submitted', leave });
  } catch (err) {
    next(err);
  }
};

const LeaveRequest = require('../models/LeaveRequest');

// GET /api/leaves/all
exports.getAllLeaves = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find()
      .populate({
        path: 'userId',
        select: 'name email role'
      })
      .sort({ createdAt: -1 });

    // Clean response for frontend
    const response = leaves.map(lr => ({
      _id: lr._id,
      fromDate: lr.fromDate,
      toDate: lr.toDate,
      reason: lr.reason,
      leaveType: lr.leaveType,
      status: lr.status,
      createdAt: lr.createdAt,
      user: lr.userId ? {
        _id: lr.userId._id,
        name: lr.userId.name,
        email: lr.userId.email,
        role: lr.userId.role
      } : null
    }));

    res.json(response);
  } catch (err) {
    next(err);
  }
};

// GET /api/leaves/my
exports.getMyLeaves = async (req, res, next) => {
  try {
    console.log('getMyLeaves called for user:', req.user);
    const userId = req.user.id;
    const leaves = await LeaveRequest.find({ userId })
      .populate({
        path: 'userId',
        select: 'name'
      })
      .sort({ createdAt: -1 });

    console.log('Leaves found for user', userId, ':', leaves);
    // Only show limited fields for employee dashboard
    const response = leaves.map(lr => ({
      _id: lr._id,
      fromDate: lr.fromDate,
      toDate: lr.toDate,
      leaveType: lr.leaveType,
      status: lr.status,
      reason: lr.reason,
      employeeName: lr.userId ? lr.userId.name : '',
    }));

    res.json(response);
  } catch (err) {
    console.error('getMyLeaves error:', err);
    next(err);
  }
};

// PATCH /api/leaves/:id/approve
exports.approveLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED' },
      { new: true }
    ).populate('userId', 'name email');

    if (!leave) {
      console.error('Approve error: Leave request not found', req.params.id);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    if (io && leave.userId) {
      io.to(leave.userId._id.toString()).emit('notification', {
        message: `Your leave request from ${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()} has been approved.`
      });
    }

    res.json({ message: 'Leave approved', leave });
  } catch (err) {
    console.error('Approve error:', err);
    next(err);
  }
};

// PATCH /api/leaves/:id/reject
exports.rejectLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED' },
      { new: true }
    ).populate('userId', 'name email');

    if (!leave) {
      console.error('Reject error: Leave request not found', req.params.id);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    if (io && leave.userId) {
      io.to(leave.userId._id.toString()).emit('notification', {
        message: `Your leave request from ${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()} has been rejected.`
      });
    }

    res.json({ message: 'Leave rejected', leave });
  } catch (err) {
    console.error('Reject error:', err);
    next(err);
  }
};

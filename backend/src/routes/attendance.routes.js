const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');

// All routes require authentication
router.use(auth);

// Check-in / Check-out
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);

// Attendance history
router.get('/history/mine', attendanceController.myHistory);
// Team attendance must come before /:employeeId to avoid route conflict
router.get('/team', role(['ADMIN', 'MANAGER']), attendanceController.getTeamAttendance);
// Employee-specific history (this catches any /:employeeId pattern)
router.get('/:employeeId', role(['ADMIN', 'MANAGER']), attendanceController.employeeHistory);

// Monthly summary
router.get('/monthly-summary', attendanceController.monthlySummary);

// Leave requests
router.post('/leave-request', attendanceController.leaveRequest);
router.get('/leave-requests/mine', attendanceController.myLeaveRequests);
router.get('/leave-requests', role(['ADMIN', 'MANAGER']), attendanceController.allLeaveRequests);
router.put('/leave-requests/:id/approve', role(['ADMIN', 'MANAGER']), attendanceController.approveLeave);
router.put('/leave-requests/:id/reject', role(['ADMIN', 'MANAGER']), attendanceController.rejectLeave);

module.exports = router;

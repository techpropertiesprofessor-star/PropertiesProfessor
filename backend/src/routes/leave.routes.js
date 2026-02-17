const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const requirePermission = require('../middlewares/permission.middleware');

// Only Manager/Admin can access all leaves and approve/reject
router.get('/all', auth, role(['ADMIN', 'MANAGER']), leaveController.getAllLeaves);
router.patch('/:id/approve', auth, role(['ADMIN', 'MANAGER']), leaveController.approveLeave);
router.patch('/:id/reject', auth, role(['ADMIN', 'MANAGER']), leaveController.rejectLeave);


// Allow any authenticated user to submit leave request (basic employee right)
router.post('/', auth, leaveController.createLeaveRequest);

// Employee can view only their own leave requests
router.get('/my', auth, leaveController.getMyLeaves);

module.exports = router;

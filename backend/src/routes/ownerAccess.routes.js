const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const requirePermission = require('../middlewares/permission.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/ownerAccess.controller');

// All routes require authentication + Inventory permission
router.use(auth);
router.use(requirePermission('Inventory'));

// Employee endpoints
router.post('/request', ctrl.requestAccess);
router.get('/my-requests', ctrl.getMyRequests);
router.get('/check/:unitId', ctrl.checkAccess);
router.post('/check-batch', ctrl.checkAccessBatch);

// Manager/approver endpoints
router.get('/all', role(['ADMIN', 'MANAGER'], 'canApproveInventoryAccess'), ctrl.getAllRequests);
router.patch('/:id/approve', role(['ADMIN', 'MANAGER'], 'canApproveInventoryAccess'), ctrl.approveRequest);
router.patch('/:id/reject', role(['ADMIN', 'MANAGER'], 'canApproveInventoryAccess'), ctrl.rejectRequest);

module.exports = router;

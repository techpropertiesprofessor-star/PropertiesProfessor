const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('uploads', 'documents'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Allow EMPLOYEE to view employees list (for name display in dashboards)
router.get('/', auth, role(['ADMIN', 'MANAGER', 'EMPLOYEE']), employeeController.getEmployees);

// Get comprehensive employee statistics (Manager Dashboard) - also accessible by employees with "Employees" permission
router.get('/statistics/all', auth, role(['ADMIN', 'MANAGER'], 'Employees'), employeeController.getEmployeesStatistics);

// Get employee details (tasks, leads, callers) - accessible by employees with "Employees" permission
router.get('/:id/details', auth, role(['ADMIN', 'MANAGER'], 'Employees'), employeeController.getEmployeeDetails);

// Online status update (accessible by all authenticated users)
router.put('/status/online', auth, employeeController.updateOnlineStatus);
router.get('/:id/status', auth, employeeController.getEmployeeWithStatus);

// Public endpoint for basic member info (for chat @ tagging) - accessible by all authenticated users
router.get('/basic', auth, employeeController.getEmployeesBasic);

// Manager-only: reset employee password
router.post('/reset-password/:employeeId', auth, role(['MANAGER']), employeeController.resetPassword);

// Manager-only: toggle team attendance access
router.patch('/toggle-attendance-access/:employeeId', auth, role(['MANAGER']), employeeController.toggleAttendanceAccess);

// Only ADMIN or MANAGER can access other routes
router.use(auth, role(['ADMIN', 'MANAGER']));

router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.post('/:id/documents', upload.single('document'), employeeController.uploadDocument);
router.get('/:id/documents', employeeController.getDocuments);

module.exports = router;

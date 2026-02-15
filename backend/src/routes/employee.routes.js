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

// Get comprehensive employee statistics (Manager Dashboard)
router.get('/statistics/all', auth, role(['ADMIN', 'MANAGER']), employeeController.getEmployeesStatistics);

// Online status update (accessible by all authenticated users)
router.put('/status/online', auth, employeeController.updateOnlineStatus);
router.get('/:id/status', auth, employeeController.getEmployeeWithStatus);

// Public endpoint for basic member info (for chat @ tagging) - accessible by all authenticated users
router.get('/basic', auth, employeeController.getEmployeesBasic);

// Only ADMIN or MANAGER can access other routes
router.use(auth, role(['ADMIN', 'MANAGER']));

router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.post('/:id/documents', upload.single('document'), employeeController.uploadDocument);
router.get('/:id/documents', employeeController.getDocuments);

module.exports = router;

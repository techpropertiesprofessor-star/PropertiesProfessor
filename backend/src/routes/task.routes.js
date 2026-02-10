

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');

// All routes require authentication FIRST
router.use(auth);

// Employee can update their own assigned task status
router.put('/:id/update-status', role(['EMPLOYEE']), taskController.updateTaskStatusByEmployee);

// Get manager name for a task
router.get('/:id/manager-name', taskController.getManagerNameForTask);
// Task CRUD
router.post('/', role(['ADMIN', 'MANAGER']), taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', role(['ADMIN', 'MANAGER']), taskController.updateTask);


// Pin/unpin/archive
router.put('/:id/pin', taskController.pinTask);
router.put('/:id/unpin', taskController.unpinTask);
router.put('/:id/archive', role(['ADMIN', 'MANAGER']), taskController.archiveTask);

// Pin/unpin by manager/employee
router.post('/:id/pin-manager', role(['MANAGER']), taskController.pinByManager);
router.post('/:id/unpin-manager', role(['MANAGER']), taskController.unpinByManager);
router.post('/:id/pin-employee', role(['EMPLOYEE']), taskController.pinByEmployee);
router.post('/:id/unpin-employee', role(['EMPLOYEE']), taskController.unpinByEmployee);

// Backlog and stats
router.get('/employee/:empId/backlog', taskController.getBacklog);
router.get('/employee/:empId/stats', taskController.getStats);

// Get tasks by date for an employee
router.get('/employee/:empId/date/:date', taskController.getTasksByDate);

// Comments
router.post('/:id/comments', taskController.addComment);
router.get('/:id/comments', taskController.getComments);

module.exports = router;

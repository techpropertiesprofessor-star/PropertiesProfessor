const express = require('express');
const router = express.Router();

// Dummy permissions for demonstration
const defaultPermissions = [
  'view_dashboard',
  'view_attendance',
  'mark_attendance',
  'view_tasks',
  'create_tasks',
  'view_content',
];

// Grouped permissions example
const grouped = {
  dashboard: ['view_dashboard'],
  attendance: ['view_attendance', 'mark_attendance'],
  tasks: ['view_tasks', 'create_tasks'],
  content: ['view_content'],
};


const Employee = require('../models/Employee');
const auth = require('../middlewares/auth.middleware');

// GET /api/permissions/my-permissions
router.get('/my-permissions', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findById(userId);
    if (!employee) return res.status(404).json({ permissions: [], grouped });
    // If admin/manager, grant all permissions
    if (employee.role === 'ADMIN' || employee.role === 'MANAGER') {
      return res.json({ permissions: defaultPermissions, grouped });
    }
    // For employee/caller, use their permissions field
    res.json({ permissions: employee.permissions || [], grouped });
  } catch (err) {
    res.status(500).json({ permissions: [], grouped });
  }
});

module.exports = router;

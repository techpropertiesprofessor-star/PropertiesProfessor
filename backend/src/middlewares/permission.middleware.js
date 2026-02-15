/**
 * Permission middleware - checks if the logged-in user's employee record
 * includes the required permission string.
 *
 * ADMIN and MANAGER roles bypass the check (full access).
 * EMPLOYEE / CALLER roles are validated against their `permissions` array.
 *
 * Usage:
 *   router.get('/leads', auth, requirePermission('Leads'), controller.getAll);
 *
 * @param {string} permission - The permission key (e.g. 'Leads', 'Tasks', 'Attendance')
 */
const Employee = require('../models/Employee');

module.exports = (permission) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user found' });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // ADMIN and MANAGER have full access
    if (userRole === 'ADMIN' || userRole === 'MANAGER') {
      return next();
    }

    // For EMPLOYEE / CALLER, look up their employee record
    const employeeId = req.user.employeeId || req.user.id;
    const employee = await Employee.findById(employeeId).select('permissions').lean();

    if (!employee) {
      return res.status(403).json({ message: 'Access denied: Employee record not found' });
    }

    const userPermissions = employee.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        message: `Access denied: You do not have permission for "${permission}". Contact your manager.`
      });
    }

    next();
  } catch (err) {
    console.error('Permission middleware error:', err);
    return res.status(500).json({ message: 'Permission check failed' });
  }
};

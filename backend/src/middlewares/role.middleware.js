const Employee = require('../models/Employee');

/**
 * Role middleware with optional permission override for employees.
 * Usage:
 *   role(['ADMIN', 'MANAGER'])                       — only these roles
 *   role(['ADMIN', 'MANAGER'], 'Payroll Manage')     — also allows EMPLOYEE with that permission
 *   role(['ADMIN', 'MANAGER'], { field: 'teamAttendanceAccess' }) — also allows EMPLOYEE with that boolean flag
 */
module.exports = (roles = [], permissionOverride = null) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No user found' });
  }
  const userRole = (req.user.role || '').toUpperCase();
  const allowedRoles = roles.map(r => r.toUpperCase());

  // Direct role match
  if (allowedRoles.includes(userRole)) {
    return next();
  }

  // Permission override for EMPLOYEE
  if (permissionOverride && userRole === 'EMPLOYEE') {
    try {
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        // Support boolean field check: { field: 'teamAttendanceAccess' }
        if (typeof permissionOverride === 'object' && permissionOverride.field) {
          if (emp[permissionOverride.field] === true) {
            return next();
          }
        }
        // Support string permission check
        if (typeof permissionOverride === 'string' && Array.isArray(emp.permissions) && emp.permissions.includes(permissionOverride)) {
          return next();
        }
      }
    } catch (e) {
      // fall through to deny
    }
  }

  return res.status(403).json({ message: 'Access denied' });
};
/**
 * ADMIN OBSERVABILITY ROUTES
 * Routes for admin panel - isolated from existing API routes
 */

const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/observability/admin.controller');
const protect = require('../../middlewares/auth.middleware');

// Middleware to check admin/super admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const adminRoles = ['admin', 'super_admin', 'superadmin'];
  if (!adminRoles.includes(req.user.role?.toLowerCase())) {
    // Log unauthorized access attempt
    const activityLogger = require('../../services/observability/activityLogger');
    activityLogger.logActivity({
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      username: req.user.username,
      actionType: 'PERMISSION_CHANGE',
      route: req.path,
      category: 'CRITICAL',
      metadata: {
        attemptedAccess: 'admin_panel',
        denied: true
      }
    });
    
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  next();
};

// Middleware for read-only access (managers)
const requireReadAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const allowedRoles = ['admin', 'super_admin', 'superadmin', 'manager'];
  if (!allowedRoles.includes(req.user.role?.toLowerCase())) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  
  next();
};

// Activity logs
router.get('/logs/activity', protect, requireReadAccess, adminController.getActivityLogs);

// API logs
router.get('/logs/api', protect, requireReadAccess, adminController.getApiLogs);

// System metrics
router.get('/metrics/system', protect, requireReadAccess, adminController.getSystemMetrics);

// Health checks
router.get('/health', protect, requireReadAccess, adminController.getHealthChecks);

// Crash logs
router.get('/logs/crashes', protect, requireReadAccess, adminController.getCrashLogs);

// Analytics
router.get('/analytics', protect, requireReadAccess, adminController.getAnalytics);

// Bandwidth usage
router.get('/bandwidth/users', protect, requireReadAccess, adminController.getBandwidthByUser);

// Queue stats
router.get('/queue/stats', protect, requireAdmin, adminController.getQueueStats);

// Log activity from frontend (requires authentication but any role)
router.post('/log/activity', protect, adminController.logActivity);

module.exports = router;

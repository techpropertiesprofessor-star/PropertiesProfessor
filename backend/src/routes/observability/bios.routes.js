/**
 * BIOS ROUTES
 * Routes for BIOS panel - ultra-minimal, works even if app crashes
 */

const express = require('express');
const router = express.Router();
const biosController = require('../../controllers/observability/bios.controller');
const protect = require('../../middlewares/auth.middleware');

// Middleware to check super admin role only
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  const superAdminRoles = ['super_admin', 'superadmin'];
  if (!superAdminRoles.includes(req.user.role?.toLowerCase())) {
    // Log unauthorized BIOS access attempt
    const activityLogger = require('../../services/observability/activityLogger');
    activityLogger.logActivity({
      userId: req.user._id || req.user.id,
      userRole: req.user.role,
      username: req.user.username,
      actionType: 'PERMISSION_CHANGE',
      route: req.path,
      category: 'CRITICAL',
      metadata: {
        attemptedAccess: 'bios_panel',
        denied: true
      }
    });
    
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }
  
  next();
};

// Ping endpoint (no auth required for health monitoring)
router.get('/ping', biosController.ping);

// System status (requires super admin)
router.get('/status', protect, requireSuperAdmin, biosController.getSystemStatus);

// Component health
router.get('/health/:component', protect, requireSuperAdmin, biosController.getComponentHealth);

// Recent crashes
router.get('/crashes', protect, requireSuperAdmin, biosController.getRecentCrashes);

// Crash timeline
router.get('/crashes/timeline', protect, requireSuperAdmin, biosController.getCrashTimeline);

// Database diagnostics
router.get('/diagnostics/database', protect, requireSuperAdmin, biosController.getDatabaseDiagnostics);

// Process metrics
router.get('/diagnostics/process', protect, requireSuperAdmin, biosController.getProcessMetrics);

module.exports = router;

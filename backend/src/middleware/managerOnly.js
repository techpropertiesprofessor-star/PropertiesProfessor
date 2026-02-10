/**
 * Manager-Only Access Middleware
 * Protects analytics endpoints - only accessible to users with role === "manager"
 */

const managerOnly = (req, res, next) => {
  try {
    // Check if user is authenticated (assumes auth middleware runs first)
    if (!req.user) {
      console.warn('[MANAGER_ACCESS] Unauthorized access attempt - No user in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Log for debugging
    console.log('[MANAGER_ACCESS] User:', req.user.id || req.user._id, 'Role:', req.user.role);

    // Check if user has manager role (case-insensitive)
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole !== 'manager') {
      console.warn(`[MANAGER_ACCESS] Forbidden access attempt by user: ${req.user._id || req.user.id}, role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Manager privileges required.'
      });
    }

    // User is a manager, proceed
    console.log(`[MANAGER_ACCESS] Manager ${req.user._id || req.user.id} accessing analytics`);
    next();
  } catch (error) {
    console.error('[MANAGER_ACCESS] Error in managerOnly middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

module.exports = managerOnly;

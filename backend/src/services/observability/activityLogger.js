/**
 * ACTIVITY LOGGER SERVICE
 * Backend service for logging user activities from frontend
 */

const loggingQueue = require('./loggingQueue');

class ActivityLogger {
  /**
   * Log user activity
   */
  static logActivity({
    userId,
    userRole,
    username,
    actionType,
    route,
    previousRoute,
    elementId,
    elementType,
    elementText,
    entityType,
    entityId,
    payloadSize,
    payloadSummary,
    ipAddress,
    userAgent,
    deviceType,
    browser,
    os,
    metadata,
    category = 'ACTIVITY',
    sessionId,
    errorMessage,
    errorStack
  }) {
    try {
      const logData = {
        timestamp: new Date(),
        userId,
        userRole,
        username,
        actionType,
        route,
        previousRoute,
        elementId,
        elementType,
        elementText,
        entityType,
        entityId,
        payloadSize,
        payloadSummary,
        ipAddress,
        userAgent,
        deviceType,
        browser,
        os,
        metadata,
        category,
        sessionId,
        errorMessage,
        errorStack,
        retentionTier: category === 'CRITICAL' ? 'HOT' : 'HOT' // Start in HOT, move to WARM later
      };
      
      // Queue log asynchronously
      loggingQueue.enqueue('activity', logData);
      
      return true;
    } catch (error) {
      console.error('[ActivityLogger] Failed to log activity:', error.message);
      return false;
    }
  }
  
  /**
   * Log navigation event
   */
  static logNavigation(userId, userRole, username, fromRoute, toRoute, metadata = {}) {
    return this.logActivity({
      userId,
      userRole,
      username,
      actionType: 'NAVIGATION',
      route: toRoute,
      previousRoute: fromRoute,
      category: 'ACTIVITY',
      metadata
    });
  }
  
  /**
   * Log button click
   */
  static logClick(userId, userRole, username, route, elementId, elementText, metadata = {}) {
    return this.logActivity({
      userId,
      userRole,
      username,
      actionType: 'CLICK',
      route,
      elementId,
      elementType: 'button',
      elementText,
      category: 'ACTIVITY',
      metadata
    });
  }
  
  /**
   * Log form submission
   */
  static logFormSubmit(userId, userRole, username, route, formId, entityType, metadata = {}) {
    return this.logActivity({
      userId,
      userRole,
      username,
      actionType: 'FORM_SUBMIT',
      route,
      elementId: formId,
      elementType: 'form',
      entityType,
      category: 'ACTIVITY',
      metadata
    });
  }
  
  /**
   * Log permission change (critical)
   */
  static logPermissionChange(userId, userRole, username, targetUserId, oldPermissions, newPermissions, metadata = {}) {
    return this.logActivity({
      userId,
      userRole,
      username,
      actionType: 'PERMISSION_CHANGE',
      entityType: 'user',
      entityId: targetUserId,
      category: 'CRITICAL',
      metadata: {
        ...metadata,
        oldPermissions,
        newPermissions
      }
    });
  }
  
  /**
   * Log error
   */
  static logError(userId, userRole, username, route, errorMessage, errorStack, metadata = {}) {
    return this.logActivity({
      userId,
      userRole,
      username,
      actionType: 'ERROR',
      route,
      errorMessage,
      errorStack,
      category: 'CRITICAL',
      metadata
    });
  }
  
  /**
   * Log authentication event
   */
  static logAuth(userId, username, authType, success, metadata = {}) {
    return this.logActivity({
      userId,
      username,
      actionType: 'AUTH',
      category: 'CRITICAL',
      metadata: {
        ...metadata,
        authType,
        success
      }
    });
  }
}

module.exports = ActivityLogger;

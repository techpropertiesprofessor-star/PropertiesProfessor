/**
 * OBSERVABILITY MIDDLEWARE
 * Tracks all API requests and emits real-time events to admin panel
 * Non-intrusive: Does not affect normal request/response flow
 */

/**
 * Track API requests and emit metrics
 */
const trackApiRequest = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Calculate request size
  let requestSize = 0;
  if (req.headers['content-length']) {
    requestSize = parseInt(req.headers['content-length'], 10);
  } else if (req.body) {
    requestSize = Buffer.byteLength(JSON.stringify(req.body));
  }
  
  // Intercept response to calculate duration and size
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const responseSize = Buffer.byteLength(JSON.stringify(data || ''));
    const statusCode = res.statusCode;
    
    // Track in metrics tracker (non-blocking)
    setImmediate(() => {
      try {
        const metricsTracker = req.metricsTracker || req.app?.get('metricsTracker');
        if (metricsTracker) {
          metricsTracker.trackRequest(
            duration,
            statusCode,
            requestSize,
            responseSize
          );
        }
        
        // Save API log to database (async via queue)
        const loggingQueue = require('../services/observability/loggingQueue');
        const apiLogData = {
          timestamp: new Date(startTime),
          method: req.method,
          endpoint: req.path || req.url,
          fullUrl: req.originalUrl,
          userId: req.user?._id || req.user?.id || null,
          userRole: req.user?.role || null,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          requestSize,
          responseSize,
          responseTime: duration,
          statusCode,
          bandwidthIn: requestSize,
          bandwidthOut: responseSize,
          isError: statusCode >= 400,
          performanceCategory: duration < 100 ? 'FAST' : duration < 500 ? 'NORMAL' : duration < 2000 ? 'SLOW' : 'CRITICAL',
          category: statusCode >= 500 ? 'CRITICAL' : statusCode >= 400 ? 'ACTIVITY' : 'SYSTEM',
          retentionTier: 'HOT'
        };
        
        // Queue for async save
        loggingQueue.enqueue('api', apiLogData);
        
        // Emit API log event for real-time updates
        if (metricsTracker) {
          metricsTracker.emitApiLog(apiLogData);
        }
        
      } catch (err) {
        // Silent fail - don't break request
        console.error('[ObservabilityMiddleware] Tracking error:', err.message);
      }
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Admin-only access middleware for observability routes
 */
const adminOnlyObservability = (req, res, next) => {
  try {
    const userRole = req.user?.role;
    
    if (userRole !== 'admin') {
      console.warn(`⚠️  Non-admin tried to access observability: ${req.user?.username || 'unknown'}`);
      
      // Log unauthorized attempt
      const metricsTracker = req.metricsTracker || req.app?.get('metricsTracker');
      if (metricsTracker) {
        metricsTracker.trackRequest(0, 403, 0, 0);
      }
      
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required'
      });
    }
    
    next();
  } catch (err) {
    console.error('[AdminOnlyObservability] Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Emit activity log event when activity is logged
 */
const emitActivityLog = (log, req) => {
  try {
    const metricsTracker = req.metricsTracker || req.app?.get('metricsTracker');
    if (metricsTracker) {
      metricsTracker.emitActivityLog(log);
    }
  } catch (err) {
    console.error('[ObservabilityMiddleware] Failed to emit activity log:', err.message);
  }
};

/**
 * Emit API log event when API call is logged
 */
const emitApiLog = (log, req) => {
  try {
    const metricsTracker = req.metricsTracker || req.app?.get('metricsTracker');
    if (metricsTracker) {
      metricsTracker.emitApiLog(log);
    }
  } catch (err) {
    console.error('[ObservabilityMiddleware] Failed to emit API log:', err.message);
  }
};

module.exports = {
  trackApiRequest,
  adminOnlyObservability,
  emitActivityLog,
  emitApiLog
};

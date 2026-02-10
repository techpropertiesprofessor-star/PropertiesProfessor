/**
 * OBSERVABILITY MIDDLEWARE
 * Non-blocking API logging middleware
 * Captures all API requests without modifying existing functionality
 */

const loggingQueue = require('../services/observability/loggingQueue');

/**
 * Calculate performance category based on response time
 */
function getPerformanceCategory(responseTime) {
  if (responseTime < 100) return 'FAST';
  if (responseTime < 500) return 'NORMAL';
  if (responseTime < 2000) return 'SLOW';
  return 'CRITICAL';
}

/**
 * Parse user agent
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return {};
  
  const ua = userAgent.toLowerCase();
  
  let deviceType = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = 'mobile';
  }
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'ios';
  
  return { deviceType, browser, os };
}

/**
 * Get request size in bytes
 */
function getRequestSize(req) {
  let size = 0;
  
  // Headers
  if (req.headers) {
    size += JSON.stringify(req.headers).length;
  }
  
  // Body
  if (req.body) {
    size += JSON.stringify(req.body).length;
  }
  
  // Query params
  if (req.query) {
    size += JSON.stringify(req.query).length;
  }
  
  return size;
}

/**
 * Observability middleware
 */
const observabilityMiddleware = (req, res, next) => {
  // Skip observability endpoints to prevent infinite loops
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/bios')) {
    return next();
  }
  
  const startTime = Date.now();
  const startHrTime = process.hrtime();
  
  // Capture request data
  const requestData = {
    method: req.method,
    endpoint: req.path,
    fullUrl: req.originalUrl,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    requestSize: getRequestSize(req),
    queryParams: req.query
  };
  
  // Parse user agent
  const { deviceType, browser, os } = parseUserAgent(req.get('user-agent'));
  
  // Capture user context if authenticated
  if (req.user) {
    requestData.userId = req.user._id || req.user.id;
    requestData.userRole = req.user.role;
  }
  
  // Intercept response
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody;
  let responseSent = false;
  
  // Override res.send
  res.send = function(data) {
    if (!responseSent) {
      responseBody = data;
      responseSent = true;
      logApiCall();
    }
    return originalSend.call(this, data);
  };
  
  // Override res.json
  res.json = function(data) {
    if (!responseSent) {
      responseBody = data;
      responseSent = true;
      logApiCall();
    }
    return originalJson.call(this, data);
  };
  
  // Log API call (async, non-blocking)
  function logApiCall() {
    try {
      const hrDuration = process.hrtime(startHrTime);
      const responseTime = hrDuration[0] * 1000 + hrDuration[1] / 1000000; // Convert to milliseconds
      
      const responseSize = responseBody 
        ? (typeof responseBody === 'string' ? responseBody.length : JSON.stringify(responseBody).length)
        : 0;
      
      const isError = res.statusCode >= 400;
      
      const logData = {
        timestamp: new Date(startTime),
        ...requestData,
        statusCode: res.statusCode,
        responseSize,
        responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimals
        bandwidthIn: requestData.requestSize,
        bandwidthOut: responseSize,
        isError,
        performanceCategory: getPerformanceCategory(responseTime),
        category: isError ? 'CRITICAL' : 'SYSTEM'
      };
      
      // Add error details if applicable
      if (isError && responseBody) {
        try {
          const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
          if (parsed.message) {
            logData.error = parsed.message;
          }
          if (parsed.stack) {
            logData.errorStack = parsed.stack;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Queue log asynchronously (never blocks)
      loggingQueue.enqueue('api', logData);
      
    } catch (error) {
      // Never throw errors from logging
      console.error('[ObservabilityMiddleware] Logging error:', error.message);
    }
  }
  
  // Handle response finish event
  res.on('finish', () => {
    if (!responseSent) {
      responseSent = true;
      logApiCall();
    }
  });
  
  // Continue to next middleware
  next();
};

module.exports = observabilityMiddleware;

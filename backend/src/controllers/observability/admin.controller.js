/**
 * ADMIN OBSERVABILITY CONTROLLER
 * Handles admin panel API requests for logs, metrics, reports
 */

const ActivityLog = require('../../models/observability/ActivityLog');
const ApiLog = require('../../models/observability/ApiLog');
const SystemMetric = require('../../models/observability/SystemMetric');
const HealthCheck = require('../../models/observability/HealthCheck');
const CrashLog = require('../../models/observability/CrashLog');
const loggingQueue = require('../../services/observability/loggingQueue');

/**
 * Get activity logs with pagination and filtering
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      userId,
      actionType,
      category,
      startDate,
      endDate,
      search
    } = req.query;
    
    const query = {};
    
    // Filters
    if (userId) query.userId = userId;
    if (actionType) query.actionType = actionType;
    if (category) query.category = category;
    
    // Date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Search
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } },
        { elementText: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username email role'),
      ActivityLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[AdminController] getActivityLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get API logs with pagination and filtering
 */
exports.getApiLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      endpoint,
      method,
      statusCode,
      isError,
      startDate,
      endDate
    } = req.query;
    
    const query = {};
    
    // Filters
    if (endpoint) query.endpoint = { $regex: endpoint, $options: 'i' };
    if (method) query.method = method;
    if (statusCode) query.statusCode = parseInt(statusCode);
    if (isError !== undefined) query.isError = isError === 'true';
    
    // Date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      ApiLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'username email role'),
      ApiLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[AdminController] getApiLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get system metrics
 */
exports.getSystemMetrics = async (req, res) => {
  try {
    const {
      metricType,
      component,
      startDate,
      endDate,
      aggregation = 'RAW'
    } = req.query;
    
    const query = {};
    
    if (metricType) query.metricType = metricType;
    if (component) query.component = component;
    if (aggregation) query.aggregation = aggregation;
    
    // Date range (default to last 24 hours)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    
    query.timestamp = { $gte: start, $lte: end };
    
    const metrics = await SystemMetric.find(query)
      .sort({ timestamp: -1 })
      .limit(1000);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('[AdminController] getSystemMetrics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get health checks
 */
exports.getHealthChecks = async (req, res) => {
  try {
    const { component } = req.query;
    
    const query = {};
    if (component) query.component = component;
    
    // Get latest health check for each component
    const components = component 
      ? [component] 
      : ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET', 'SYSTEM'];
    
    const healthChecks = await Promise.all(
      components.map(comp =>
        HealthCheck.findOne({ component: comp })
          .sort({ timestamp: -1 })
      )
    );
    
    res.json({
      success: true,
      data: healthChecks.filter(h => h !== null)
    });
  } catch (error) {
    console.error('[AdminController] getHealthChecks error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get crash logs
 */
exports.getCrashLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      crashType,
      component,
      severity,
      recovered
    } = req.query;
    
    const query = {};
    
    if (crashType) query.crashType = crashType;
    if (component) query.component = component;
    if (severity) query.severity = severity;
    if (recovered !== undefined) query.recovered = recovered === 'true';
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      CrashLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CrashLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[AdminController] getCrashLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get analytics dashboard data
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Get aggregated data
    const [
      totalApiCalls,
      apiErrors,
      avgResponseTime,
      totalBandwidth,
      activeUsers,
      topEndpoints
    ] = await Promise.all([
      // Total API calls
      ApiLog.countDocuments({ timestamp: { $gte: startDate } }),
      
      // API errors
      ApiLog.countDocuments({ timestamp: { $gte: startDate }, isError: true }),
      
      // Average response time
      ApiLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: null, avg: { $avg: '$responseTime' } } }
      ]),
      
      // Total bandwidth
      ApiLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { 
          _id: null, 
          totalIn: { $sum: '$bandwidthIn' },
          totalOut: { $sum: '$bandwidthOut' }
        }}
      ]),
      
      // Active users
      ActivityLog.distinct('userId', { timestamp: { $gte: startDate } }),
      
      // Top endpoints
      ApiLog.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { 
          _id: '$endpoint',
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          errors: { $sum: { $cond: ['$isError', 1, 0] } }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        timeRange,
        totalApiCalls,
        apiErrors,
        errorRate: totalApiCalls > 0 ? (apiErrors / totalApiCalls * 100).toFixed(2) : 0,
        avgResponseTime: avgResponseTime[0]?.avg?.toFixed(2) || 0,
        totalBandwidth: {
          in: totalBandwidth[0]?.totalIn || 0,
          out: totalBandwidth[0]?.totalOut || 0,
          total: (totalBandwidth[0]?.totalIn || 0) + (totalBandwidth[0]?.totalOut || 0)
        },
        activeUsers: activeUsers.length,
        topEndpoints
      }
    });
  } catch (error) {
    console.error('[AdminController] getAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get bandwidth usage per user
 */
exports.getBandwidthByUser = async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const bandwidthByUser = await ApiLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: {
        _id: { $ifNull: ['$userId', 'unknown'] },
        totalIn: { $sum: { $ifNull: ['$bandwidthIn', 0] } },
        totalOut: { $sum: { $ifNull: ['$bandwidthOut', 0] } },
        requests: { $sum: 1 },
        ipAddress: { $first: '$ipAddress' },
        userAgent: { $first: '$userAgent' }
      }},
      { $sort: { totalOut: -1 } },
      { $limit: 50 },
      { $addFields: {
        userIdObj: {
          $cond: {
            if: { $and: [
              { $ne: ['$_id', 'unknown'] },
              { $ne: ['$_id', null] }
            ]},
            then: { $toObjectId: '$_id' },
            else: null
          }
        }
      }},
      { $lookup: {
        from: 'users',
        localField: 'userIdObj',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: {
        userId: '$_id',
        username: { 
          $ifNull: [
            '$user.username', 
            { $cond: [
              { $eq: ['$_id', 'unknown'] },
              'Anonymous',
              { $concat: ['User_', { $toString: '$_id' }] }
            ]}
          ]
        },
        email: { $ifNull: ['$user.email', ''] },
        role: { $ifNull: ['$user.role', 'guest'] },
        totalIn: 1,
        totalOut: 1,
        total: { $add: ['$totalIn', '$totalOut'] },
        requests: 1,
        ipAddress: 1,
        userAgent: 1
      }}
    ]);
    
    res.json({
      success: true,
      data: bandwidthByUser
    });
  } catch (error) {
    console.error('[AdminController] getBandwidthByUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get queue stats
 */
exports.getQueueStats = async (req, res) => {
  try {
    const stats = loggingQueue.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[AdminController] getQueueStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Log activity from frontend
 */
exports.logActivity = async (req, res) => {
  try {
    const activityLogger = require('../../services/observability/activityLogger');
    
    const {
      actionType,
      route,
      previousRoute,
      elementId,
      elementType,
      elementText,
      entityType,
      entityId,
      metadata,
      category,
      sessionId,
      errorMessage,
      errorStack
    } = req.body;
    
    // Get user context
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;
    const username = req.user?.username;
    
    // Get request context
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    const logData = {
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
      ipAddress,
      userAgent,
      metadata,
      category,
      sessionId,
      errorMessage,
      errorStack
    };
    
    activityLogger.logActivity(logData);
    
    // Emit to admin observability room
    const { emitActivityLog } = require('../../middlewares/observabilityEmitter.middleware');
    emitActivityLog(logData, req);
    
    // Return immediately (don't wait for logging)
    res.json({ success: true });
  } catch (error) {
    // Never fail on logging errors
    console.error('[AdminController] logActivity error:', error);
    res.json({ success: true }); // Still return success
  }
};

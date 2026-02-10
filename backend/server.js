require('dotenv').config();

let systemHealthMonitor;
let metricsTracker;

// Global error handlers for debugging and logging
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  
  // Emit crash to admin panel
  if (metricsTracker) {
    metricsTracker.emitCrash({
      message: reason?.message || String(reason),
      stack: reason?.stack || '',
      type: 'UNHANDLED_REJECTION'
    });
  }
  
  // Log to database if systemHealthMonitor is initialized
  if (systemHealthMonitor) {
    systemHealthMonitor.logCrash(
      'UNHANDLED_REJECTION',
      'BACKEND',
      reason?.message || String(reason),
      reason?.stack || '',
      { promise: String(promise) }
    );
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  
  // Emit crash to admin panel
  if (metricsTracker) {
    metricsTracker.emitCrash({
      message: err.message,
      stack: err.stack,
      type: 'UNCAUGHT_EXCEPTION'
    });
  }
  
  // Log to database if systemHealthMonitor is initialized
  if (systemHealthMonitor) {
    systemHealthMonitor.logCrash(
      'UNCAUGHT_EXCEPTION',
      'BACKEND',
      err.message,
      err.stack,
      { code: err.code, errno: err.errno }
    );
  }
});

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/config/socket');

// ❌ NOTE:
// leadRoutes yahan require/use nahi karenge
// kyunki routes already src/app.js me loaded hain
// warna path error aata hai

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // ======================
    // Database Connection
    // ======================
    await connectDB();

    // ======================
    // Start Observability System (Non-intrusive)
    // ======================
    systemHealthMonitor = require('./src/services/observability/systemHealthMonitor');
    systemHealthMonitor.start();
    console.log('📊 Observability system started');

    // ======================
    // Server + Socket
    // ======================
    const server = http.createServer(app);
    const io = initSocket(server);

    // Make io available everywhere
    app.set('io', io);

    // Attach io to request
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // ======================
    // Real-Time Metrics Tracker
    // ======================
    const MetricsTracker = require('./src/services/observability/metricsTracker');
    metricsTracker = new MetricsTracker(io);
    
    // Make metricsTracker globally available
    app.set('metricsTracker', metricsTracker);
    app.use((req, res, next) => {
      req.metricsTracker = metricsTracker;
      next();
    });
      
    console.log('📊 Real-time metrics tracker initialized');

    // ======================
    // Manager Analytics Socket Handler
    // ======================
    const managerAnalyticsSocket = require('./src/sockets/manager.analytics.socket');
    managerAnalyticsSocket.initialize(io);
    console.log('📊 Manager Analytics socket handler initialized');

    // ======================
    // Socket Events
    // ======================
    io.on('connection', (socket) => {
      console.log('🟢 Socket connected:', socket.id);
      
      // Track connection in metrics
      metricsTracker.trackSocket('connect');

      // Handle admin-observability room join
      socket.on('join-admin-observability', (data) => {
        try {
          // Security: Only admin/manager can join observability room
          const adminRoles = ['admin', 'super_admin', 'superadmin', 'manager'];
          const userRole = data?.role?.toLowerCase();
          
          if (userRole && adminRoles.includes(userRole)) {
            socket.join('admin-observability');
            console.log(`📊 Admin joined observability room: ${socket.id} (role: ${data.role})`);
            
            // Send current metrics immediately
            metricsTracker.emitMetrics(data.timeRange || '1h');
          } else {
            console.warn(`⚠️  Non-admin tried to join observability room: ${socket.id} (role: ${data?.role})`);
            socket.emit('error', { message: 'Unauthorized' });
          }
        } catch (err) {
          console.error('Error joining admin-observability:', err);
        }
      });
      
      // Handle time range change
      socket.on('change-time-range', (data) => {
        try {
          const adminRoles = ['admin', 'super_admin', 'superadmin', 'manager'];
          const userRole = data?.role?.toLowerCase();
          
          if (userRole && adminRoles.includes(userRole) && data?.timeRange) {
            metricsTracker.emitMetrics(data.timeRange);
          }
        } catch (err) {
          console.error('Error changing time range:', err);
        }
      });

      // Handle user identification and set online status
      socket.on('user-online', async (data) => {
        try {
          const { userId, employeeId } = data;
          if (employeeId) {
            await require('./src/models/Employee').findByIdAndUpdate(employeeId, {
              isOnline: true,
              lastSeen: new Date(),
              socketId: socket.id
            });
            socket.employeeId = employeeId;
            console.log(`✅ Employee ${employeeId} is now online`);
          }
        } catch (err) {
          console.error('Error setting user online:', err);
        }
      });

      // Handle user identification (for notifications)
      socket.on('identify', async (userId) => {
        try {
          if (userId) {
            await require('./src/models/Employee').findByIdAndUpdate(userId, {
              isOnline: true,
              lastSeen: new Date(),
              socketId: socket.id
            });
            socket.employeeId = userId;
            console.log(`🔔 User identified for notifications: ${userId}`);
          }
        } catch (err) {
          console.error('Error identifying user for notifications:', err);
        }
      });

      socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
      });

      socket.on('stop-typing', () => {
        socket.broadcast.emit('stop-typing');
      });

      socket.on('disconnect', async () => {
        console.log('🔴 Socket disconnected:', socket.id);
        
        // Track disconnection in metrics
        metricsTracker.trackSocket('disconnect');
        
        // Set employee offline on disconnect
        try {
          if (socket.employeeId) {
            await require('./src/models/Employee').findByIdAndUpdate(socket.employeeId, {
              isOnline: false,
              lastSeen: new Date()
            });
            console.log(`❌ Employee ${socket.employeeId} is now offline`);
          }
        } catch (err) {
          console.error('Error setting user offline:', err);
        }
      });
    });

    // ======================
    // Start Server
    // ======================
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // ======================
    // Graceful Shutdown for Observability
    // ======================
    const loggingQueue = require('./src/services/observability/loggingQueue');
    
    process.on('SIGTERM', async () => {
      console.log('⚠️  SIGTERM received, shutting down gracefully...');
      systemHealthMonitor.stop();
      if (metricsTracker) metricsTracker.stop();
      await loggingQueue.shutdown();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      console.log('⚠️  SIGINT received, shutting down gracefully...');
      systemHealthMonitor.stop();
      if (metricsTracker) metricsTracker.stop();
      await loggingQueue.shutdown();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Server start failed:', err);
    process.exit(1);
  }
};

startServer();

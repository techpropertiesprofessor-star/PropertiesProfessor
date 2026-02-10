/**
 * Seed observability data for testing
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const ActivityLog = require('./src/models/observability/ActivityLog');
const ApiLog = require('./src/models/observability/ApiLog');
const SystemMetric = require('./src/models/observability/SystemMetric');
const HealthCheck = require('./src/models/observability/HealthCheck');
const CrashLog = require('./src/models/observability/CrashLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

async function seedData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
    
    // Clear existing test data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      ActivityLog.deleteMany({}),
      ApiLog.deleteMany({}),
      SystemMetric.deleteMany({}),
      HealthCheck.deleteMany({}),
      CrashLog.deleteMany({})
    ]);
    
    // Create sample API logs
    console.log('📝 Creating API logs...');
    const apiLogs = [];
    const endpoints = ['/api/leads', '/api/employees', '/api/auth/login', '/api/tasks', '/api/inventory'];
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const statusCodes = [200, 201, 400, 401, 404, 500];
    
    for (let i = 0; i < 50; i++) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];
      const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
      const responseTime = Math.floor(Math.random() * 1000) + 50;
      
      apiLogs.push({
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        endpoint,
        method,
        statusCode,
        responseTime,
        isError: statusCode >= 400,
        performanceCategory: responseTime < 100 ? 'FAST' : responseTime < 500 ? 'NORMAL' : 'SLOW',
        bandwidthIn: Math.floor(Math.random() * 10000),
        bandwidthOut: Math.floor(Math.random() * 50000),
        userId: null,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        deviceInfo: {
          deviceType: 'desktop',
          browser: 'chrome',
          os: 'windows'
        }
      });
    }
    await ApiLog.insertMany(apiLogs);
    console.log(`✅ Created ${apiLogs.length} API logs`);
    
    // Create Activity Logs
    console.log('👤 Creating activity logs...');
    const activityLogs = [];
    const actions = ['CLICK', 'NAVIGATION', 'FORM_SUBMIT', 'API_CALL', 'ERROR', 'AUTH', 'CHAT', 'TASK', 'LEAD'];
    const categories = ['CRITICAL', 'ACTIVITY', 'SYSTEM'];
    const routes = ['/api/auth/login', '/api/leads', '/api/employees', '/api/tasks', '/api/inventory'];
    
    for (let i = 0; i < 30; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      activityLogs.push({
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        userId: null,
        username: `user${Math.floor(Math.random() * 5) + 1}`,
        actionType: action,
        category: category,
        route: routes[Math.floor(Math.random() * routes.length)],
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        elementText: `${action} button`,
        deviceType: 'desktop',
        browser: 'chrome',
        os: 'windows',
        metadata: {
          duration: Math.floor(Math.random() * 500) + 50,
          success: Math.random() > 0.1
        }
      });
    }
    await ActivityLog.insertMany(activityLogs);
    console.log(`✅ Created ${activityLogs.length} activity logs`);
    
    // Create system metrics
    console.log('📊 Creating system metrics...');
    const metrics = [];
    const metricTypes = ['CPU', 'MEMORY', 'DISK', 'NETWORK'];
    const metricNames = {
      'CPU': ['usage', 'load_avg', 'temperature'],
      'MEMORY': ['used', 'free', 'cache'],
      'DISK': ['used', 'free', 'read_speed', 'write_speed'],
      'NETWORK': ['bandwidth_in', 'bandwidth_out', 'latency']
    };
    
    for (let i = 0; i < 48; i++) {
      const type = metricTypes[Math.floor(Math.random() * metricTypes.length)];
      const names = metricNames[type];
      const name = names[Math.floor(Math.random() * names.length)];
      
      let value, unit;
      if (type === 'CPU' || type === 'MEMORY' || type === 'DISK') {
        value = Math.random() * 100;
        unit = 'PERCENT';
      } else {
        value = Math.random() * 1000 + 100;
        unit = 'MB';
      }
      
      metrics.push({
        timestamp: new Date(Date.now() - i * 30 * 60 * 1000),
        metricType: type,
        name: name,
        value: value,
        unit: unit,
        status: value > 80 ? 'RED' : value > 60 ? 'YELLOW' : 'GREEN',
        component: 'BACKEND',
        tags: { environment: 'production', region: 'us-east-1' }
      });
    }
    await SystemMetric.insertMany(metrics);
    console.log(`✅ Created ${metrics.length} system metrics`);
    
    // Create health checks
    console.log('❤️  Creating health checks...');
    const healthChecks = [];
    const components = ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET'];
    
    for (let i = 0; i < 10; i++) {
      for (const component of components) {
        const responseTime = Math.random() * 200 + 20;
        const cpuUsage = Math.floor(Math.random() * 100);
        healthChecks.push({
          timestamp: new Date(Date.now() - i * 5 * 60 * 1000),
          component: component,
          status: responseTime > 150 ? 'RED' : cpuUsage > 80 ? 'YELLOW' : 'GREEN',
          responseTime: responseTime,
          uptime: Math.floor(Math.random() * 1000000),
          message: `${component} health check completed`,
          metrics: {
            cpuUsage: cpuUsage,
            memoryUsage: Math.floor(Math.random() * 80) + 20,
            memoryTotal: 16384,
            activeConnections: component === 'WEBSOCKET' ? Math.floor(Math.random() * 100) : undefined,
            apiUptime: component === 'BACKEND' ? Math.floor(Math.random() * 604800) : undefined
          }
        });
      }
    }
    await HealthCheck.insertMany(healthChecks);
    console.log(`✅ Created ${healthChecks.length} health checks`);
    
    // Create Crash Logs
    console.log('💥 Creating crash logs...');
    const crashLogs = [];
    const crashTypes = ['FRONTEND_CRASH', 'BACKEND_CRASH', 'DATABASE_FAILURE', 'WEBSOCKET_FAILURE', 'PROCESS_EXIT'];
    const crashComponents = ['FRONTEND', 'BACKEND', 'DATABASE', 'WEBSOCKET', 'SYSTEM'];
    const crashSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    
    for (let i = 0; i < 5; i++) {
      const crashType = crashTypes[Math.floor(Math.random() * crashTypes.length)];
      const component = crashComponents[Math.floor(Math.random() * crashComponents.length)];
      const severity = crashSeverities[Math.floor(Math.random() * crashSeverities.length)];
      const recovered = Math.random() > 0.5;
      
      crashLogs.push({
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        crashType: crashType,
        component: component,
        severity: severity,
        errorMessage: `${crashType}: System encountered critical error`,
        errorStack: `at Object.getUser (D:\\pro_test\\backend\\src\\controllers\\user.controller.js:45:23)\nat Layer.handle (D:\\pro_test\\backend\\node_modules\\express\\lib\\router\\layer.js:95:5)`,
        errorCode: `ERR_${crashType}_${Math.floor(Math.random() * 1000)}`,
        lastRoute: '/api/users/profile',
        lastApiCall: 'GET /api/users/profile',
        activeUsers: Math.floor(Math.random() * 50) + 10,
        recovered: recovered,
        recoveryTime: recovered ? new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000) : null,
        recoveryMethod: recovered ? 'Auto-restart' : null,
        affectedSessions: Math.floor(Math.random() * 20),
        metadata: {
          nodeVersion: 'v18.16.0',
          platform: 'win32',
          memory: '8GB'
        }
      });
    }
    await CrashLog.insertMany(crashLogs);
    console.log(`✅ Created ${crashLogs.length} crash logs`);
    
    console.log('\n✅ Seed data created successfully!');
    console.log('📊 Summary:');
    console.log(`   - API Logs: ${apiLogs.length}`);
    console.log(`   - Activity Logs: ${activityLogs.length}`);
    console.log(`   - System Metrics: ${metrics.length}`);
    console.log(`   - Health Checks: ${healthChecks.length}`);
    console.log(`   - Crash Logs: ${crashLogs.length}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

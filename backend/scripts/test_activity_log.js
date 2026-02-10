// Test script to manually create activity log
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/observability/ActivityLog');

const MONGODB_URI = 'mongodb+srv://realestatecrm:RJAqqqGu7zaEUDrh@cluster0.zqrcf.mongodb.net/realestate_crm?retryWrites=true&w=majority';

async function testActivityLog() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test activity log
    const testLog = new ActivityLog({
      timestamp: new Date(),
      userId: new mongoose.Types.ObjectId('6968fbd87ab0338bd118ca50'), // Shivam's ID
      username: 'Shivam Kumar',
      actionType: 'NAVIGATION',
      route: '/dashboard',
      previousRoute: '/login',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script',
      category: 'ACTIVITY',
      sessionId: 'test-session-' + Date.now()
    });

    await testLog.save();
    console.log('✅ Test activity log created:', testLog._id);

    // Verify it was saved
    const count = await ActivityLog.countDocuments();
    console.log('📊 Total activity logs in database:', count);

    // Fetch and display
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(5);
    console.log('\n📋 Latest 5 logs:');
    logs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.actionType} by ${log.username} on ${log.route} at ${log.timestamp}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testActivityLog();

/**
 * CLEAN FAKE ACTIVITY LOGS
 * Removes activity logs with generic "user1-5" usernames and null userIds
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/observability/ActivityLog');
const { mongoUri } = require('../src/config/env');

async function cleanFakeActivityLogs() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find logs with generic usernames and null userId
    const fakeUsernames = ['user1', 'user2', 'user3', 'user4', 'user5'];
    
    const fakeLogsCount = await ActivityLog.countDocuments({
      username: { $in: fakeUsernames },
      userId: null
    });
    
    console.log(`\n📋 Found ${fakeLogsCount} fake activity logs (user1-5 with null userId)`);
    
    if (fakeLogsCount === 0) {
      console.log('✅ No fake logs found!');
      process.exit(0);
    }
    
    // Show sample before deletion
    console.log('\n📊 Sample of logs to be deleted:');
    const samples = await ActivityLog.find({
      username: { $in: fakeUsernames },
      userId: null
    }).limit(5);
    
    samples.forEach((log, idx) => {
      console.log(`  ${idx + 1}. ${log.username} - ${log.actionType} - ${log.route} (${log.timestamp})`);
    });
    
    console.log(`\n⚠️  About to delete ${fakeLogsCount} fake activity logs...`);
    console.log('These are test logs with generic usernames (user1-5) and no userId.\n');
    
    // Delete fake logs
    const result = await ActivityLog.deleteMany({
      username: { $in: fakeUsernames },
      userId: null
    });
    
    console.log(`✅ Deleted ${result.deletedCount} fake activity logs`);
    
    // Show what's left
    const remainingCount = await ActivityLog.countDocuments();
    console.log(`📊 Remaining activity logs: ${remainingCount}`);
    
    if (remainingCount > 0) {
      console.log('\n📋 Sample of remaining logs:');
      const remaining = await ActivityLog.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .select('username actionType route userId timestamp');
      
      remaining.forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.username || 'No username'} - ${log.actionType} - UserId: ${log.userId || 'null'}`);
      });
    }
    
    console.log('\n✅ Done! Fake activity logs have been removed.');
    console.log('\n📌 Next steps:');
    console.log('   1. Restart the backend server');
    console.log('   2. Have users LOG OUT and LOG BACK IN to get new JWT tokens with usernames');
    console.log('   3. New activity logs will now have real usernames!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanFakeActivityLogs();

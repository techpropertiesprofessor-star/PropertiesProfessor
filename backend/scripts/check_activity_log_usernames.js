/**
 * CHECK ACTIVITY LOG USERNAMES
 * Checks what usernames are in the ActivityLog collection
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/observability/ActivityLog');
const { mongoUri } = require('../src/config/env');

async function checkActivityLogs() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get distinct usernames
    const usernames = await ActivityLog.distinct('username');
    console.log('\n📊 Distinct usernames in ActivityLog:');
    usernames.forEach((name, idx) => {
      console.log(`  ${idx + 1}. "${name}"`);
    });
    
    // Get sample logs
    console.log('\n📋 Sample of recent activity logs:');
    const samples = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .select('username actionType route userId timestamp');
    
    samples.forEach((log, idx) => {
      console.log(`  ${idx + 1}. Username: "${log.username}" | Action: ${log.actionType} | UserId: ${log.userId} | Time: ${log.timestamp.toISOString()}`);
    });
    
    // Count logs by username
    console.log('\n📈 Log count by username:');
    const counts = await ActivityLog.aggregate([
      { $group: { _id: '$username', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    counts.forEach((item, idx) => {
      console.log(`  ${idx + 1}. "${item._id}": ${item.count} logs`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkActivityLogs();

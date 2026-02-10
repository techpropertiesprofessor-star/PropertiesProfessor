/**
 * FIX ACTIVITY LOG USERNAMES
 * Updates existing ActivityLog records to have real usernames from User collection
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ActivityLog = require('../src/models/observability/ActivityLog');
const User = require('../src/models/User');
const { mongoUri } = require('../src/config/env');

async function fixActivityLogUsernames() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get all activity logs with userId but no username or generic username
    const logsToFix = await ActivityLog.find({
      userId: { $exists: true, $ne: null },
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' },
        { username: /^user\d+$/ }  // Match user1, user2, user3, etc.
      ]
    }).select('_id userId username');
    
    console.log(`\n📋 Found ${logsToFix.length} activity logs to fix`);
    
    if (logsToFix.length === 0) {
      console.log('✅ All activity logs already have correct usernames!');
      process.exit(0);
    }
    
    // Get all users for lookup
    const users = await User.find({}).select('_id name');
    const userMap = new Map(users.map(u => [u._id.toString(), u.name]));
    
    console.log(`\n👥 Found ${users.size} users in database`);
    console.log('\nUser Map:');
    users.forEach(user => {
      console.log(`  - ${user._id}: ${user.name}`);
    });
    
    // Update logs in batches
    let updated = 0;
    let notFound = 0;
    const batchSize = 500;
    
    for (let i = 0; i < logsToFix.length; i += batchSize) {
      const batch = logsToFix.slice(i, i + batchSize);
      
      const bulkOps = batch.map(log => {
        const userName = userMap.get(log.userId.toString());
        
        if (userName) {
          updated++;
          return {
            updateOne: {
              filter: { _id: log._id },
              update: { $set: { username: userName } }
            }
          };
        } else {
          notFound++;
          // Mark as "Unknown User" if user not found
          return {
            updateOne: {
              filter: { _id: log._id },
              update: { $set: { username: 'Unknown User' } }
            }
          };
        }
      });
      
      if (bulkOps.length > 0) {
        await ActivityLog.bulkWrite(bulkOps);
      }
      
      console.log(`\n📝 Processed batch ${Math.floor(i / batchSize) + 1}: ${batch.length} logs`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total Logs Fixed:     ${logsToFix.length}`);
    console.log(`Updated with Name:    ${updated}`);
    console.log(`User Not Found:       ${notFound}`);
    console.log('='.repeat(50));
    
    // Show sample of updated logs
    console.log('\n📊 Sample of updated activity logs:');
    const samples = await ActivityLog.find({ username: { $exists: true } })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('username actionType route timestamp');
    
    samples.forEach((log, idx) => {
      console.log(`  ${idx + 1}. ${log.username} - ${log.actionType} - ${log.route} (${log.timestamp.toISOString()})`);
    });
    
    console.log('\n✅ Done! Activity log usernames have been fixed.');
    console.log('\n⚠️  Important: Users must LOG OUT and LOG BACK IN to get new JWT tokens with usernames.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixActivityLogUsernames();

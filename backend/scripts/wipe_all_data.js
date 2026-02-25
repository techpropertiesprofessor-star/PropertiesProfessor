/**
 * PRODUCTION FRESH START - Wipe All Demo/Test Data
 * 
 * This script deletes ALL data from ALL collections in the database.
 * Run this ONCE before going live to get a clean slate.
 * 
 * Usage: node scripts/wipe_all_data.js
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA permanently!
 *     Make sure you have a backup if needed.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import all models so their collections are registered
const models = [
  require('../src/models/Announcement'),
  require('../src/models/Attendance'),
  require('../src/models/CalendarEvent'),
  require('../src/models/Caller'),
  require('../src/models/Chat'),
  require('../src/models/Contact'),
  require('../src/models/Employee'),
  require('../src/models/Holiday'),
  require('../src/models/InventoryPriceHistory'),
  require('../src/models/InventoryUnit'),
  require('../src/models/Lead'),
  require('../src/models/LeadActivity'),
  require('../src/models/LeadComment'),
  require('../src/models/LeaveRequest'),
  require('../src/models/Message'),
  require('../src/models/Notification'),
  require('../src/models/PersonalNote'),
  require('../src/models/Project'),
  require('../src/models/Task'),
  require('../src/models/TaskComment'),
  require('../src/models/Tower'),
  require('../src/models/UploadHistory'),
  require('../src/models/User'),
  // Observability models
  require('../src/models/observability/ActivityLog'),
  require('../src/models/observability/ApiLog'),
  require('../src/models/observability/CrashLog'),
  require('../src/models/observability/HealthCheck'),
  require('../src/models/observability/SystemMetric'),
];

async function wipeAllData() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
      console.error('❌ MONGO_URI not found in .env');
      process.exit(1);
    }

    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═══════════════════════════════════════════');
    console.log('  ⚠️  WIPING ALL DATA FROM ALL COLLECTIONS');
    console.log('═══════════════════════════════════════════\n');

    let totalDeleted = 0;

    // Get all registered model names
    const modelNames = mongoose.modelNames();

    for (const modelName of modelNames) {
      const Model = mongoose.model(modelName);
      const count = await Model.countDocuments();
      if (count > 0) {
        const result = await Model.deleteMany({});
        console.log(`  🗑️  ${modelName}: deleted ${result.deletedCount} documents`);
        totalDeleted += result.deletedCount;
      } else {
        console.log(`  ✅ ${modelName}: already empty`);
      }
    }

    // Also drop any collections that might not be registered as models
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const registeredCollections = modelNames.map(name => {
      const Model = mongoose.model(name);
      return Model.collection.collectionName;
    });

    for (const col of collections) {
      if (!registeredCollections.includes(col.name) && col.name !== 'system.profile') {
        const count = await db.collection(col.name).countDocuments();
        if (count > 0) {
          const result = await db.collection(col.name).deleteMany({});
          console.log(`  🗑️  ${col.name} (unregistered): deleted ${result.deletedCount} documents`);
          totalDeleted += result.deletedCount;
        }
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(`  ✅ TOTAL DELETED: ${totalDeleted} documents`);
    console.log('═══════════════════════════════════════════');
    console.log('\n🎉 Database is now clean and ready for production!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Safety prompt
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log('\n╔═══════════════════════════════════════════════╗');
console.log('║  ⚠️  DATABASE WIPE - PRODUCTION FRESH START   ║');
console.log('║                                               ║');
console.log('║  This will DELETE ALL data from ALL tables.   ║');
console.log('║  This action CANNOT be undone.                ║');
console.log('╚═══════════════════════════════════════════════╝\n');

rl.question('Type "DELETE ALL" to confirm: ', (answer) => {
  rl.close();
  if (answer === 'DELETE ALL') {
    wipeAllData();
  } else {
    console.log('\n❌ Cancelled. No data was deleted.\n');
    process.exit(0);
  }
});

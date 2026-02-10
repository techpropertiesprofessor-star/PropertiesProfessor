/**
 * Remove Sample Analytics Test Data
 * Deletes all test data added by seed_analytics_test_data.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI;

async function removeTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define collections
    const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
    const Lead = mongoose.model('Lead', new mongoose.Schema({}, { strict: false }), 'leads');
    const Inventory = mongoose.model('Inventory', new mongoose.Schema({}, { strict: false }), 'inventories');
    const Call = mongoose.model('Call', new mongoose.Schema({}, { strict: false }), 'calls');
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');

    console.log('\n🗑️ Removing test data...');

    // Remove test tasks (last 5 added)
    const taskResult = await Task.deleteMany({
      title: {
        $in: [
          'Follow up with potential buyers',
          'Update property listings',
          'Prepare monthly sales report',
          'Schedule property viewings',
          'Update CRM database'
        ]
      }
    });
    console.log(`✅ Removed ${taskResult.deletedCount} test tasks`);

    // Remove test leads
    const leadResult = await Lead.deleteMany({
      email: {
        $in: [
          'rajesh.k@email.com',
          'priya.sharma@email.com',
          'amit.p@email.com',
          'sunita.r@email.com',
          'vikram.s@email.com',
          'neha.g@email.com'
        ]
      }
    });
    console.log(`✅ Removed ${leadResult.deletedCount} test leads`);

    // Remove test inventory
    const inventoryResult = await Inventory.deleteMany({
      name: {
        $in: [
          'A4 Paper',
          'Printer Ink Cartridges',
          'Marketing Brochures',
          'Property Photos - Professional',
          'Signage Boards'
        ]
      }
    });
    console.log(`✅ Removed ${inventoryResult.deletedCount} test inventory items`);

    // Remove test calls (all calls added in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const callResult = await Call.deleteMany({
      createdAt: { $gte: oneHourAgo }
    });
    console.log(`✅ Removed ${callResult.deletedCount} test call records`);

    console.log('\n📊 === TEST DATA REMOVAL COMPLETE ===');
    console.log(`Tasks remaining: ${await Task.countDocuments()}`);
    console.log(`Leads remaining: ${await Lead.countDocuments()}`);
    console.log(`Inventory remaining: ${await Inventory.countDocuments()}`);
    console.log(`Calls remaining: ${await Call.countDocuments()}`);
    console.log(`Attendance remaining: ${await Attendance.countDocuments()}`);
    console.log('\n✅ Test data removed successfully!');
    console.log('🔄 Dashboard will now show only actual data\n');

  } catch (error) {
    console.error('❌ Error removing data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

removeTestData();

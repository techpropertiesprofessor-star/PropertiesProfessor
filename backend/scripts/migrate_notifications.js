// Migration script to update old notifications from 'user' field to 'userId'
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realestate';

async function migrateNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const notificationsCollection = db.collection('notifications');

    // Find all notifications with 'user' field but no 'userId' field
    const result = await notificationsCollection.updateMany(
      { user: { $exists: true }, userId: { $exists: false } },
      [{ $set: { userId: '$user' } }]
    );

    console.log(`Migration complete: ${result.modifiedCount} notifications updated`);

    // Optional: Remove old 'user' field
    const cleanupResult = await notificationsCollection.updateMany(
      { user: { $exists: true } },
      { $unset: { user: '' } }
    );

    console.log(`Cleanup complete: ${cleanupResult.modifiedCount} old 'user' fields removed`);

    await mongoose.connection.close();
    console.log('Migration finished successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateNotifications();

// scripts/fix_lead_status.js
// Run this script ONCE to fix all leads that are assigned but still have status 'new'.
// Usage: node scripts/fix_lead_status.js

const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_db_name'; // <-- Change this if needed

const leadSchema = new mongoose.Schema({}, { strict: false });
const Lead = mongoose.model('Lead', leadSchema, 'leads');

async function fixAssignedLeads() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await Lead.updateMany(
    { assignedTo: { $ne: null }, status: 'new' },
    { $set: { status: 'assigned' } }
  );
  console.log(`Updated ${result.modifiedCount} leads to status 'assigned'.`);
  await mongoose.disconnect();
}

fixAssignedLeads().catch(err => {
  console.error('Error updating leads:', err);
  process.exit(1);
});

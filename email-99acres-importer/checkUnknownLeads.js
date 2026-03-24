/**
 * Check Unknown Leads in Database
 * Shows all leads with "Unknown" as name
 */

const mongoose = require('mongoose');

// MongoDB connection string from backend
const MONGO_URI = "mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor";

// Lead schema (simplified)
const leadSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  source: String,
  message: String,
  createdAt: Date
}, { timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);

async function checkUnknownLeads() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find all leads with "Unknown" name
    const unknownLeads = await Lead.find({
      name: { $regex: /^unknown$/i }
    }).select('name phone email source message createdAt').sort({ createdAt: -1 });

    console.log(`Found ${unknownLeads.length} leads with "Unknown" as name:\n`);

    unknownLeads.forEach((lead, idx) => {
      console.log(`${idx + 1}. Phone: ${lead.phone}`);
      console.log(`   Source: ${lead.source}`);
      console.log(`   Message: ${lead.message}`);
      console.log(`   Created: ${lead.createdAt}`);
      console.log('');
    });

    // Count by source
    const websiteCount = unknownLeads.filter(l => l.source === 'website').length;
    const acres99Count = unknownLeads.filter(l => l.source === '99acres').length;

    console.log(`\nBreakdown by source:`);
    console.log(`  website: ${websiteCount}`);
    console.log(`  99acres: ${acres99Count}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUnknownLeads();

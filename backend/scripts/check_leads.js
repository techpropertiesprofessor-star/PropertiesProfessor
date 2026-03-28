const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function checkLeads() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');

    // Count total leads
    const totalLeads = await leadsCollection.countDocuments();
    console.log('\n=== LEAD COUNTS ===');
    console.log('Total leads in database:', totalLeads);

    // Count by source
    const sourceStats = await leadsCollection.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\nLeads by source:');
    sourceStats.forEach(s => console.log(`  ${s._id}: ${s.count}`));

    // Count 99acres leads specifically
    const ninetynineAcresCount = await leadsCollection.countDocuments({ source: '99acres' });
    console.log('\n99acres leads:', ninetynineAcresCount);

    // Show last 10 99acres leads
    const recentLeads = await leadsCollection.find({ source: '99acres' })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log('\nLast 10 99acres leads:');
    recentLeads.forEach((lead, i) => {
      console.log(`${i + 1}. ${lead.name || 'Unknown'} - ${lead.phone} - ${lead.createdAt}`);
    });

    // Check if there's any date filtering issue
    const oldestLead = await leadsCollection.findOne(
      { source: '99acres' },
      { sort: { createdAt: 1 } }
    );
    
    const newestLead = await leadsCollection.findOne(
      { source: '99acres' },
      { sort: { createdAt: -1 } }
    );

    console.log('\nDate range of 99acres leads:');
    console.log('Oldest:', oldestLead?.createdAt);
    console.log('Newest:', newestLead?.createdAt);

    await mongoose.disconnect();
    console.log('\nDone.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkLeads();

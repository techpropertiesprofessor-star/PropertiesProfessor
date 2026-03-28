/**
 * Merge duplicate leads and fix Unknown names
 * 
 * This script:
 * 1. Finds leads with same phone number
 * 2. Keeps the one with real name (not "Unknown")
 * 3. Deletes duplicates
 * 
 * Usage: node scripts/mergeDuplicateLeads.js
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function mergeDuplicates() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');

    // Find all duplicate phone numbers with their leads
    console.log('Finding duplicate leads...\n');
    
    const duplicates = await leadsCollection.aggregate([
      {
        $addFields: {
          normalizedPhone: {
            $trim: {
              input: {
                $replaceAll: {
                  input: { $toString: { $ifNull: ['$phone', ''] } },
                  find: ' ',
                  replacement: ''
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$normalizedPhone',
          count: { $sum: 1 },
          leads: { 
            $push: { 
              id: '$_id', 
              name: '$name', 
              phone: '$phone',
              source: '$source',
              createdAt: '$createdAt'
            } 
          }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    console.log(`Found ${duplicates.length} phone numbers with duplicates\n`);

    if (duplicates.length === 0) {
      console.log('No duplicates to merge.');
      await mongoose.disconnect();
      return;
    }

    let merged = 0;
    let deleted = 0;

    for (const dup of duplicates) {
      const leads = dup.leads;
      
      // Sort leads: real names first, then by createdAt (newest first)
      leads.sort((a, b) => {
        const aIsUnknown = !a.name || a.name.toLowerCase() === 'unknown' || a.name.toLowerCase() === 'unknoen';
        const bIsUnknown = !b.name || b.name.toLowerCase() === 'unknown' || b.name.toLowerCase() === 'unknoen';
        
        if (aIsUnknown && !bIsUnknown) return 1;  // b has real name, keep b first
        if (!aIsUnknown && bIsUnknown) return -1; // a has real name, keep a first
        
        // Both have same name quality, keep newest
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const keepLead = leads[0];
      const deleteLeads = leads.slice(1);

      console.log(`Phone ${dup._id}: Keeping "${keepLead.name}" (${keepLead.id}), deleting ${deleteLeads.length} duplicates`);

      // If the kept lead has "Unknown" name but others have real names, update it
      if (keepLead.name?.toLowerCase() === 'unknown' || !keepLead.name) {
        const leadWithName = leads.find(l => l.name && l.name.toLowerCase() !== 'unknown' && l.name.toLowerCase() !== 'unknoen');
        if (leadWithName) {
          await leadsCollection.updateOne(
            { _id: keepLead.id },
            { $set: { name: leadWithName.name } }
          );
          console.log(`  Updated name to: ${leadWithName.name}`);
        }
      }

      // Delete duplicates
      const deleteIds = deleteLeads.map(l => l.id);
      if (deleteIds.length > 0) {
        await leadsCollection.deleteMany({ _id: { $in: deleteIds } });
        deleted += deleteIds.length;
      }
      
      merged++;
    }

    console.log('\n===========================================');
    console.log('  Merge Complete!');
    console.log('===========================================');
    console.log(`  Duplicate groups processed: ${merged}`);
    console.log(`  Duplicate leads deleted: ${deleted}`);
    
    // Show final count
    const finalCount = await leadsCollection.countDocuments({ source: '99acres' });
    console.log(`  99acres leads remaining: ${finalCount}`);
    console.log('===========================================\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

mergeDuplicates();

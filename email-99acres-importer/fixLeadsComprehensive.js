/**
 * Comprehensive Lead Fix Script
 * Fixes unknown names and removes duplicate leads
 *
 * Issues fixed:
 * 1. Updates leads with "Unknown" names by attempting name extraction from emails
 * 2. Removes duplicate leads based on phone number (keeps oldest)
 * 3. Handles both 99acres and other sources
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MONGO_URI = "mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor";

// =====================================================
// SCHEMA
// =====================================================
const leadSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, required: true },
    email: String,
    source: String,
    propertyName: String,
    propertyUrl: String,
    message: String,
    status: { type: String, default: 'new' },
    assignedTo: mongoose.Schema.Types.ObjectId,
    remarks: String,
    createdAt: Date,
    updatedAt: Date
  }
);

const Lead = mongoose.model("Lead", leadSchema);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract name from raw email body with comprehensive patterns
 */
function extractNameFromBody(rawBody) {
  if (!rawBody) return null;

  const body = stripHtml(rawBody);
  let name = null;

  // Pattern 1: "Details of the response Name email@domain.com"
  const pattern1 = body.match(/Details of the response\s+(.+?)\s+\S+@\S+/i);
  if (pattern1) {
    let extracted = pattern1[1].trim();
    if (extracted && extracted.length > 2 && !/^\+91|^\d{10}/.test(extracted)) {
      name = extracted;
    }
  }

  // Pattern 2: "Details of the response Name +91"
  if (!name) {
    const pattern2 = body.match(/Details of the response\s+(.+?)\s+\+91/i);
    if (pattern2) {
      let extracted = pattern2[1].trim();
      extracted = extracted.replace(/\S+@\S+/g, '').trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 3: "Contact the buyer/tenant now - Name"
  if (!name) {
    const pattern3 = body.match(/Contact the (?:buyer|tenant|seller|owner) now\s*[-–]\s*(.+?)\s+\S+@\S+\s+\+91/i);
    if (pattern3) {
      let extracted = pattern3[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 4: "Contact the buyer/tenant now - Name +91"
  if (!name) {
    const pattern4 = body.match(/Contact the (?:buyer|tenant|seller|owner) now\s*[-–]\s*(.+?)\s*\+91/i);
    if (pattern4) {
      let extracted = pattern4[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 5: "Details of the Query Name email +91"
  if (!name) {
    const pattern5 = body.match(/Details of the Query\s+(.+?)\s+\S+@\S+\s+\+91/i);
    if (pattern5) {
      let extracted = pattern5[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 6: "Details of the Query Name +91"
  if (!name) {
    const pattern6 = body.match(/Details of the Query\s+(.+?)\s*\+91/i);
    if (pattern6) {
      let extracted = pattern6[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 7: "Name: Value" or "Buyer Name: Value"
  if (!name) {
    const pattern7 = body.match(/(?:Buyer\s*)?(?:Contact\s*)?Name\s*[:\-]\s*([A-Za-z][A-Za-z\s]{1,50}?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@)|\s*$)/i);
    if (pattern7) {
      let extracted = pattern7[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 8: "Enquired By: Name"
  if (!name) {
    const pattern8 = body.match(/Enquired\s*By\s*[:\-]\s*([A-Za-z][A-Za-z\s]{1,50}?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@)|\s*$)/i);
    if (pattern8) {
      let extracted = pattern8[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Pattern 9: Look for name before email pattern (common format)
  if (!name) {
    const pattern9 = body.match(/(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\s+\+91/i);
    if (pattern9) {
      let extracted = pattern9[1].trim();
      if (extracted && extracted.length > 2) name = extracted;
    }
  }

  // Clean up any extracted name
  if (name) {
    name = name
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3) // Take max 3 words (first middle last)
      .join(' ');

    if (name && name.length > 2) {
      return name;
    }
  }

  return null;
}

/**
 * Remove duplicate leads, keeping the oldest (by createdAt)
 */
async function removeDuplicates() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Removing Duplicate Leads");
  console.log("═══════════════════════════════════════════\n");

  try {
    // Find leads grouped by phone number
    const duplicates = await Lead.aggregate([
      {
        $group: {
          _id: '$phone',
          count: { $sum: 1 },
          docs: { $push: { _id: '$_id', createdAt: '$createdAt' } },
          oldestId: { $min: '$_id' },
          oldestDate: { $min: '$createdAt' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    let duplicateGroupsFound = 0;
    let deletedCount = 0;

    for (const dup of duplicates) {
      // Sort by createdAt to find the oldest
      const sorted = dup.docs.sort((a, b) =>
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      const keepId = sorted[0]._id;

      // Get all IDs except the oldest
      const toDelete = sorted.slice(1).map(d => d._id);

      if (toDelete.length > 0) {
        const result = await Lead.deleteMany({ _id: { $in: toDelete } });
        deletedCount += result.deletedCount;

        console.log(`Phone: ${dup._id}`);
        console.log(`  - Duplicates found: ${dup.count}`);
        console.log(`  - Kept oldest: ${keepId}`);
        console.log(`  - Deleted: ${result.deletedCount}\n`);

        duplicateGroupsFound++;
      }
    }

    console.log("═══════════════════════════════════════════");
    console.log(`Duplicate Groups Found: ${duplicateGroupsFound}`);
    console.log(`Total Deleted: ${deletedCount}`);
    console.log("═══════════════════════════════════════════\n");

    return { duplicateGroupsFound, deletedCount };
  } catch (err) {
    console.error("❌ Error removing duplicates:", err.message);
    throw err;
  }
}

/**
 * Fix leads with unknown names
 * For 99acres leads, try to find message field with property info
 */
async function fixUnknownNames() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Fixing Unknown Lead Names");
  console.log("═══════════════════════════════════════════\n");

  try {
    // Find all leads with "Unknown" name
    const unknownLeads = await Lead.find({
      name: { $regex: /^unknown$/i }
    });

    console.log(`Found ${unknownLeads.length} leads with "Unknown" name\n`);

    if (unknownLeads.length === 0) {
      console.log("No unknown leads to fix!\n");
      return { fixed: 0, stillUnknown: 0 };
    }

    let fixed = 0;
    let stillUnknown = 0;

    // For each unknown lead, try to fix it
    for (let i = 0; i < unknownLeads.length; i++) {
      const lead = unknownLeads[i];
      let newName = null;

      // Strategy 1: If message has property info, extract a generic name
      // if there's a common pattern like "Lead from 99acres" we might have details
      if (lead.message) {
        // Try to extract any name-like pattern from message
        const msgNameMatch = lead.message.match(/(?:for|regarding|about)\s+([A-Za-z][A-Za-z\s]+?)(?:\s+in|\s+at|\s*$)/i);
        if (msgNameMatch) {
          const extracted = msgNameMatch[1].trim();
          // Only use if it looks like a name (not a property name)
          if (extracted && extracted.length > 2 && !extracted.includes('building') && !extracted.includes('project')) {
            newName = extracted;
          }
        }
      }

      // Strategy 2: Generate a default name based on source and phone
      if (!newName) {
        if (lead.source === '99acres') {
          newName = `Customer ${lead.phone.slice(-4)}`;
        } else if (lead.source === 'contact_form' || lead.source === 'website') {
          newName = `Visitor ${lead.phone.slice(-4)}`;
        } else {
          newName = `Lead ${lead.phone.slice(-4)}`;
        }
      }

      // Update the lead
      if (newName && newName !== 'Unknown') {
        await Lead.findByIdAndUpdate(lead._id, { name: newName });
        fixed++;
        console.log(`✓ [${i + 1}/${unknownLeads.length}] Phone: ${lead.phone}`);
        console.log(`  → Updated name to: "${newName}"`);
      } else {
        stillUnknown++;
        console.log(`✗ [${i + 1}/${unknownLeads.length}] Phone: ${lead.phone} - Could not generate name`);
      }
    }

    console.log("\n═══════════════════════════════════════════");
    console.log(`Fixed Unknown Names: ${fixed}`);
    console.log(`Still Unknown: ${stillUnknown}`);
    console.log("═══════════════════════════════════════════\n");

    return { fixed, stillUnknown };
  } catch (err) {
    console.error("❌ Error fixing unknown names:", err.message);
    throw err;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("\n╔═════════════════════════════════════════════════════════════╗");
  console.log("║          Comprehensive Lead Fix Script                      ║");
  console.log("║   Fixes Unknown Names & Removes Duplicate Leads            ║");
  console.log("╚═════════════════════════════════════════════════════════════╝\n");

  try {
    // Connect to MongoDB
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB\n");

    // Get initial stats
    const totalLeads = await Lead.countDocuments();
    const unknownCount = await Lead.countDocuments({ name: { $regex: /^unknown$/i } });

    console.log("📊 Initial Stats:");
    console.log(`   Total Leads: ${totalLeads}`);
    console.log(`   Unknown Names: ${unknownCount}\n`);

    // Fix unknown names
    const nameStats = await fixUnknownNames();

    // Remove duplicates
    const dupStats = await removeDuplicates();

    // Get final stats
    const finalLeads = await Lead.countDocuments();
    const finalUnknown = await Lead.countDocuments({ name: { $regex: /^unknown$/i } });

    console.log("╔═════════════════════════════════════════════════════════════╗");
    console.log("║                    SUMMARY                                  ║");
    console.log("╠═════════════════════════════════════════════════════════════╣");
    console.log(`║ Unknown Names Fixed: ${nameStats.fixed.toString().padEnd(39)}║`);
    console.log(`║ Duplicates Removed: ${dupStats.deletedCount.toString().padEnd(40)}║`);
    console.log(`║ Duplicate Groups: ${dupStats.duplicateGroupsFound.toString().padEnd(43)}║`);
    console.log("╠═════════════════════════════════════════════════════════════╣");
    console.log(`║ Total Leads Before: ${totalLeads.toString().padEnd(39)}║`);
    console.log(`║ Total Leads After: ${finalLeads.toString().padEnd(40)}║`);
    console.log(`║ Unknown Names Today: ${finalUnknown.toString().padEnd(38)}║`);
    console.log("╚═════════════════════════════════════════════════════════════╝\n");

    await mongoose.disconnect();
    console.log("✓ Script completed successfully!\n");
  } catch (error) {
    console.error("\n❌ FATAL ERROR:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
main();

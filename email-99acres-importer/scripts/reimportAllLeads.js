/**
 * Reimport ALL 99acres emails (read + unread) to local CRM.
 * 
 * This script connects to the email server and imports ALL 99acres emails
 * into the local database, not just unread ones.
 * 
 * Usage: node scripts/reimportAllLeads.js
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const mongoose = require('mongoose');
const path = require('path');

// Load environment from parent .env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SENDER_FILTER = 'nnacres-services@99acres.com';

// MongoDB connection string from backend
const MONGO_URI = 'mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor';

/**
 * Create IMAP connection
 */
function createImapConnection() {
  return new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT, 10) || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 30000,
    authTimeout: 15000
  });
}

/**
 * Parse lead data from email
 */
function parseLeadEmail(parsed) {
  const body = parsed.text || parsed.html || '';
  const textBody = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract phone
  const phoneMatch = textBody.match(/\+91[-\s]?(\d{10})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  if (!phone) return null;

  // Extract name
  let name = 'Unknown';
  const namePatterns = [
    /Details of the response\s+(.+?)\s+\S+@\S+/i,
    /Details of the response\s+(.+?)\s+\+91/i,
    /Contact the buyer\/tenant now\s*-?\s*(.+?)\s+\S+@\S+/i,
    /Dear .+?,\s*(.+?)\s+is interested/i
  ];

  for (const pattern of namePatterns) {
    const match = textBody.match(pattern);
    if (match && match[1]) {
      let extracted = match[1].replace(/\S+@\S+/g, '').trim();
      if (extracted && extracted.length > 1 && extracted.length < 100) {
        name = extracted;
        break;
      }
    }
  }

  // Extract email
  const emailMatch = textBody.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
  const email = emailMatch ? emailMatch[1] : null;

  // Extract property
  let property = '';
  const propertyPatterns = [
    /(?:BHK|RK)\s+(?:Apartment|Flat|Villa|House|Plot|Land|Shop|Office|Space).+?(?:in|at)\s+([^,\n]+)/i,
    /Property:\s*([^\n]+)/i,
    /Interested in[:\s]+([^\n]+)/i
  ];

  for (const pattern of propertyPatterns) {
    const match = textBody.match(pattern);
    if (match && match[1]) {
      property = match[1].trim();
      break;
    }
  }

  // Extract property URL from HTML
  let propertyUrl = '';
  if (parsed.html) {
    const urlMatch = parsed.html.match(/href="(https?:\/\/www\.99acres\.com\/[^"]+)"/);
    if (urlMatch) propertyUrl = urlMatch[1];
  }

  return {
    name,
    phone,
    email,
    property,
    propertyUrl,
    receivedAt: parsed.date || new Date()
  };
}

/**
 * Fetch a single message by UID
 */
function fetchMessage(imap, uid) {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], {
      bodies: '',
      struct: true,
      markSeen: false  // Don't mark as read
    });

    let rawData = '';

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          rawData += chunk.toString('utf8');
        });
      });
    });

    fetch.on('error', reject);

    fetch.on('end', async () => {
      try {
        const parsed = await simpleParser(rawData);
        const lead = parseLeadEmail(parsed);
        resolve(lead);
      } catch (err) {
        resolve(null);
      }
    });
  });
}

/**
 * Read ALL 99acres emails (read + unread)
 */
function readAllEmails() {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();
    const leads = [];

    imap.once('ready', () => {
      console.log('[Import] IMAP connected');

      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        console.log(`[Import] INBOX has ${box.messages.total} total messages`);

        // Search for ALL emails from 99acres (not just unseen)
        const searchCriteria = [['FROM', SENDER_FILTER]];

        imap.search(searchCriteria, async (err, uids) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (!uids || uids.length === 0) {
            console.log('[Import] No 99acres emails found');
            imap.end();
            return resolve([]);
          }

          console.log(`[Import] Found ${uids.length} 99acres email(s)`);

          // Process in batches of 10
          const batchSize = 10;
          for (let i = 0; i < uids.length; i += batchSize) {
            const batch = uids.slice(i, i + batchSize);
            
            for (const uid of batch) {
              try {
                const lead = await fetchMessage(imap, uid);
                if (lead) {
                  leads.push(lead);
                  process.stdout.write(`\r[Import] Parsed ${leads.length}/${uids.length} leads`);
                }
              } catch (err) {
                console.error(`\n[Import] Error fetching UID ${uid}:`, err.message);
              }
            }
          }

          console.log('');
          imap.end();
          resolve(leads);
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

/**
 * Main function
 */
async function main() {
  console.log('===========================================');
  console.log('  99acres Lead Re-Import Tool');
  console.log('===========================================');

  try {
    // Connect to MongoDB
    console.log('\n[1/3] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('      MongoDB connected');

    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');

    // Get existing lead count
    const existingCount = await leadsCollection.countDocuments({ source: '99acres' });
    console.log(`      Existing 99acres leads: ${existingCount}`);

    // Read all emails
    console.log('\n[2/3] Reading emails from server...');
    const leads = await readAllEmails();
    console.log(`      Found ${leads.length} leads in emails`);

    if (leads.length === 0) {
      console.log('\nNo leads to import.');
      await mongoose.disconnect();
      return;
    }

    // Import leads
    console.log('\n[3/3] Importing leads to database...');
    let imported = 0;
    let duplicates = 0;
    const seenPhones = new Set();

    for (const lead of leads) {
      // Normalize phone for comparison
      const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-10);
      
      // Skip if we already imported this phone in this run
      if (seenPhones.has(normalizedPhone)) {
        duplicates++;
        continue;
      }
      seenPhones.add(normalizedPhone);

      // Create new lead
      const newLead = {
        name: lead.name || 'Unknown',
        phone: lead.phone,
        email: lead.email || undefined,
        source: '99acres',
        status: 'new',
        propertyName: lead.property || undefined,
        propertyUrl: lead.propertyUrl || undefined,
        message: lead.property || '99acres lead',
        createdAt: lead.receivedAt || new Date(),
        updatedAt: new Date()
      };

      await leadsCollection.insertOne(newLead);
      imported++;
      process.stdout.write(`\r      Imported ${imported} new leads, ${duplicates} duplicates`);
    }

    console.log('\n');
    console.log('===========================================');
    console.log('  Import Complete!');
    console.log('===========================================');
    console.log(`  Total emails processed: ${leads.length}`);
    console.log(`  New leads imported: ${imported}`);
    console.log(`  Duplicates skipped: ${duplicates}`);
    console.log(`  Total 99acres leads now: ${existingCount + imported}`);
    console.log('===========================================\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();

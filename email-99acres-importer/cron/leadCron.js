/**
 * Cron job to periodically fetch 99acres leads from email
 * and push them to the CRM API.
 *
 * - Runs every 2 minutes (configurable via CRON_SCHEDULE)
 * - Prevents duplicate leads using phone-based dedup
 * - Sends parsed leads to POST /api/leads
 */

const cron = require('node-cron');
const axios = require('axios');
const { readUnreadLeads } = require('../services/emailReader');

// In-memory set of already-imported phone numbers to prevent duplicates
// Persists across cron runs within the same process lifetime
const importedPhones = new Set();

let isRunning = false;

/**
 * Send a single lead to the CRM API.
 */
async function sendLeadToCRM(lead) {
  const crmUrl = process.env.CRM_API_URL;

  // Build the message field with property + location for auto-matching
  const messageParts = [];
  if (lead.property) messageParts.push(lead.property);
  if (lead.location) messageParts.push(lead.location);

  const payload = {
    name: lead.name,
    phone: lead.phone,
    email: lead.email || undefined,
    source: 'website',         // Closest valid enum in Lead model
    message: messageParts.join(' - ') || '99acres lead'
  };

  const response = await axios.post(crmUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  });

  return response.data;
}

/**
 * Main job: fetch emails, parse leads, push to CRM.
 */
async function processLeads() {
  if (isRunning) {
    console.log('[LeadCron] Previous run still in progress, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`\n[LeadCron] ===== Starting lead import at ${new Date().toISOString()} =====`);

  try {
    const leads = await readUnreadLeads();

    if (leads.length === 0) {
      console.log('[LeadCron] No new leads to import');
      return;
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const lead of leads) {
      // Dedup check — skip if phone already imported
      if (importedPhones.has(lead.phone)) {
        console.log(`[LeadCron] Duplicate skipped: ${lead.phone} (${lead.name})`);
        duplicates++;
        continue;
      }

      try {
        const result = await sendLeadToCRM(lead);
        importedPhones.add(lead.phone);
        imported++;
        console.log(`[LeadCron] Imported: ${lead.name} — ${lead.phone} (ID: ${result.lead?._id || 'unknown'})`);
      } catch (err) {
        errors++;
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;

        // If CRM returns 400 with "already exists" type error, mark as known
        if (status === 400 && message.toLowerCase().includes('duplicate')) {
          importedPhones.add(lead.phone);
          console.log(`[LeadCron] CRM duplicate: ${lead.phone} (${lead.name})`);
        } else {
          console.error(`[LeadCron] Failed to import ${lead.name} (${lead.phone}): ${status || ''} ${message}`);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[LeadCron] Summary: ${imported} imported, ${duplicates} duplicates, ${errors} errors (${elapsed}s)`);
  } catch (err) {
    console.error('[LeadCron] Critical error during lead import:', err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron scheduler.
 */
function startCron() {
  const schedule = process.env.CRON_SCHEDULE || '*/2 * * * *';

  if (!cron.validate(schedule)) {
    console.error(`[LeadCron] Invalid cron schedule: ${schedule}`);
    process.exit(1);
  }

  console.log(`[LeadCron] Scheduler started — running every: ${schedule}`);

  // Run immediately on startup
  processLeads();

  // Then schedule recurring runs
  cron.schedule(schedule, processLeads);
}

module.exports = { startCron, processLeads };

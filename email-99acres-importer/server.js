/**
 * email-99acres-importer
 *
 * Standalone microservice to import leads from 99acres email notifications
 * into the PropertiesProfessor CRM system.
 *
 * - Connects to GoDaddy Titan mailbox via IMAP
 * - Reads unread emails from nnacres-services@99acres.com
 * - Parses buyer name, phone, email, property, location
 * - Sends leads to CRM via POST /api/leads
 * - Runs on a 2-minute cron schedule
 */

require('dotenv').config();

const { startCron } = require('./cron/leadCron');

// Validate required environment variables
const required = ['EMAIL_USER', 'EMAIL_PASS', 'IMAP_HOST', 'CRM_API_URL'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`[Server] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[Server] Please check your .env file');
  process.exit(1);
}

console.log('===========================================');
console.log('  99acres Email Lead Importer');
console.log('===========================================');
console.log(`  Mailbox : ${process.env.EMAIL_USER}`);
console.log(`  IMAP    : ${process.env.IMAP_HOST}:${process.env.IMAP_PORT || 993}`);
console.log(`  CRM API : ${process.env.CRM_API_URL}`);
console.log(`  Schedule: ${process.env.CRON_SCHEDULE || '*/2 * * * *'}`);
console.log('===========================================\n');

// Start the cron job
startCron();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('[Server] Unhandled rejection:', err.message);
});

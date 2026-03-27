/**
 * 99acres Email Lead Importer
 *
 * Reads 99acres lead notification emails from Gmail via OAuth,
 * deduplicates against CRM, and pushes new leads automatically.
 *
 * Cron schedule: configurable via CRON_SCHEDULE
 */

require('dotenv').config();
const { startCron } = require('./cron/emailCron');

const configuredSchedule = process.env.CRON_SCHEDULE || '*/2 * * * *';
const crmApiUrl = process.env.CRM_API_URL || 'http://localhost:5000/api/leads';

console.log("===========================================");
console.log("  99acres Email Lead Importer (Gmail API)");
console.log("===========================================");
console.log(`  Schedule: ${configuredSchedule}`);
console.log(`  API: ${crmApiUrl}`);
console.log("===========================================\n");

/*
Start cron scheduler
*/
startCron();

/*
Graceful shutdown
*/
process.on("SIGINT", () => {
  console.log("\n[Server] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[Server] Shutting down...");
  process.exit(0);
});

/*
Catch unexpected errors
*/
process.on("unhandledRejection", (err) => {
  console.error("[Server] Unhandled rejection:", err.message);
});
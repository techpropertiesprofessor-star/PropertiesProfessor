/**
 * 99acres Email Lead Importer
 *
 * Reads 99acres lead notification emails from Gmail via OAuth,
 * deduplicates against CRM, and pushes new leads automatically.
 *
 * Cron schedule: every 5 minutes
 */

const { startCron } = require("./cron/emailCron");

console.log("===========================================");
console.log("  99acres Email Lead Importer (Gmail API)");
console.log("===========================================");
console.log("  Schedule: every 5 minutes");
console.log("  API: https://dashboard.propertiesprofessor.com/api/leads");
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
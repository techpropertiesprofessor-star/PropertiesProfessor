/**
 * Email Cron Job
 *
 * Fetch 99acres leads from Gmail automatically.
 * Runs every 5 minutes.
 */

const cron = require("node-cron");
const { readAndProcessEmails } = require("../gmailReader");

let isRunning = false;

/*
Main processing function
*/
async function processLeads() {
  if (isRunning) {
    console.log("[EmailCron] Previous run still running, skipping...");
    return;
  }

  isRunning = true;

  try {
    console.log("[EmailCron] Checking Gmail for new 99acres leads...");
    await readAndProcessEmails();
  } catch (err) {
    console.error("[EmailCron] Lead import error:", err.message);
  } finally {
    isRunning = false;
  }
}

/*
Start cron scheduler
*/
function startCron() {
  const schedule = "*/5 * * * *"; // every 5 minutes

  console.log("[EmailCron] Scheduler started — running every 5 minutes");

  /*
  Run once immediately when server starts
  */
  processLeads();

  /*
  Then run on cron schedule
  */
  cron.schedule(schedule, processLeads);
}

module.exports = { startCron };
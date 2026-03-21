/**
 * Fix Unknown Names Script
 *
 * Re-fetches 99acres emails from Gmail and updates leads that have
 * "Unknown" as their contact name in the CRM.
 *
 * Usage: node fixUnknownNames.js
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { simpleParser } = require("mailparser");
const axios = require("axios");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const CRM_API = "https://propertiesprofessor.onrender.com/api/leads";
const CHECK_API = "https://propertiesprofessor.onrender.com/api/leads/check";

/*
Authorize Gmail
*/
async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } =
    credentials.installed || credentials.web;

  const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  auth.setCredentials(token);
  return auth;
}

/*
Strip HTML tags
*/
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/*
Extract name from email body with improved patterns
*/
function extractName(rawBody) {
  const body = stripHtml(rawBody);

  // Try multiple name extraction patterns
  let name = null;

  // Pattern 1: "Details of the response Name email@domain.com" (Most common 99acres format)
  // Use simple \S+@\S+ for email matching and capture everything before it
  const pattern1 = body.match(/Details of the response\s+(.+?)\s+\S+@\S+/i);
  if (pattern1) {
    let extracted = pattern1[1].trim();
    if (extracted && extracted.length > 1) name = extracted;
  }

  // Pattern 2: "Details of the response Name +91" (without email)
  if (!name) {
    const pattern2 = body.match(/Details of the response\s+(.+?)\s+\+91/i);
    if (pattern2) {
      let extracted = pattern2[1].trim();
      // Remove any email if accidentally captured
      extracted = extracted.replace(/\S+@\S+/g, '').trim();
      if (extracted && extracted.length > 1) name = extracted;
    }
  }

  // Pattern 3: "Contact the buyer/tenant now - Name email +91"
  if (!name) {
    const pattern3 = body.match(/Contact the (?:buyer|tenant) now\s*[-–]\s*(.+?)\s+\S+@\S+\s+\+91/i);
    if (pattern3) name = pattern3[1].trim();
  }

  // Pattern 4: "Contact the buyer/tenant now - Name +91"
  if (!name) {
    const pattern4 = body.match(/Contact the (?:buyer|tenant) now\s*[-–]\s*(.+?)\s*\+91/i);
    if (pattern4) name = pattern4[1].trim();
  }

  // Pattern 5: "Details of the Query Name email +91"
  if (!name) {
    const pattern5 = body.match(/Details of the Query\s+(.+?)\s+\S+@\S+\s+\+91/i);
    if (pattern5) name = pattern5[1].trim();
  }

  // Pattern 6: "Details of the Query Name +91"
  if (!name) {
    const pattern6 = body.match(/Details of the Query\s+(.+?)\s*\+91/i);
    if (pattern6) name = pattern6[1].trim();
  }

  // Pattern 7: "Name: Value" or "Buyer Name: Value" format
  if (!name) {
    const pattern7 = body.match(/(?:Buyer\s*)?Name\s*[:\-]\s*([A-Za-z][A-Za-z\s]{1,50}?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@))/i);
    if (pattern7) name = pattern7[1].trim();
  }

  // Pattern 8: "Enquired By: Name"
  if (!name) {
    const pattern8 = body.match(/Enquired\s*By\s*[:\-]\s*([A-Za-z][A-Za-z\s]{1,50}?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@)|\s*$)/i);
    if (pattern8) name = pattern8[1].trim();
  }

  // Pattern 9: Look for name before email pattern (common in 99acres)
  if (!name) {
    const pattern9 = body.match(/(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\s+\+91/i);
    if (pattern9) name = pattern9[1].trim();
  }

  return name;
}

/*
Extract phone from email body
*/
function extractPhone(rawBody) {
  const body = stripHtml(rawBody);
  const phoneMatch = body.match(/\+91[-\s]?(\d{10})/);
  return phoneMatch ? phoneMatch[1].trim() : null;
}

/*
Check if lead exists and get its details (no auth required)
*/
async function checkLead(phone) {
  try {
    const res = await axios.get(`${CHECK_API}?phone=${phone}`);
    return res.data; // { exists: true/false, lead: { _id, name, phone } }
  } catch (err) {
    console.error(`Error checking lead ${phone}:`, err.message);
    return { exists: false, lead: null };
  }
}

/*
Update lead name in CRM (no auth required for PUT)
*/
async function updateLeadName(leadId, newName) {
  try {
    await axios.put(`${CRM_API}/${leadId}`, { name: newName });
    return true;
  } catch (err) {
    console.error(`Error updating lead ${leadId}:`, err.message);
    return false;
  }
}

/*
Fetch all message IDs for the given query (handles pagination)
*/
async function fetchAllMessageIds(gmail, query) {
  const ids = [];
  let pageToken;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
      ...(pageToken && { pageToken }),
    });

    if (res.data.messages) {
      ids.push(...res.data.messages.map((m) => m.id));
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return ids;
}

/*
Main
*/
async function main() {
  console.log("===========================================");
  console.log("  Fix Unknown Names from 99acres Emails");
  console.log("===========================================\n");

  // Authorize Gmail
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });

  // Fetch all 99acres emails
  console.log("Fetching 99acres emails from Gmail...");
  const ids = await fetchAllMessageIds(gmail, "from:99acres");
  console.log(`Found ${ids.length} emails. Processing...\n`);

  let updated = 0;
  let alreadyHasName = 0;
  let noPhone = 0;
  let notInCRM = 0;
  let noNameInEmail = 0;

  // Process each email
  for (let i = 0; i < ids.length; i++) {
    const message = await gmail.users.messages.get({
      userId: "me",
      id: ids[i],
      format: "raw",
    });

    const buffer = Buffer.from(message.data.raw, "base64");
    const parsed = await simpleParser(buffer);
    const body = parsed.text || parsed.html || "";

    const phone = extractPhone(body);
    if (!phone) {
      noPhone++;
      continue;
    }

    // Check if this lead exists in CRM
    const { exists, lead } = await checkLead(phone);

    if (!exists || !lead) {
      notInCRM++;
      continue;
    }

    // Check if name is already set (not Unknown)
    if (lead.name && lead.name !== "Unknown" && lead.name.toLowerCase() !== "unknown") {
      alreadyHasName++;
      continue;
    }

    // Extract name from email
    const name = extractName(body);

    process.stdout.write(`[${i + 1}/${ids.length}] Phone: ${phone} - `);

    if (!name) {
      console.log("Could not extract name from email");
      noNameInEmail++;
      continue;
    }

    // Update the lead
    const success = await updateLeadName(lead._id, name);
    if (success) {
      console.log(`Updated: "${name}"`);
      updated++;
    } else {
      console.log("Update failed");
    }
  }

  console.log("\n===========================================");
  console.log(`  Done.`);
  console.log(`  Updated         : ${updated}`);
  console.log(`  Already has name: ${alreadyHasName}`);
  console.log(`  Not in CRM      : ${notInCRM}`);
  console.log(`  No phone        : ${noPhone}`);
  console.log(`  No name in email: ${noNameInEmail}`);
  console.log("===========================================");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});

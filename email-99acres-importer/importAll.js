/**
 * One-time bulk import script.
 *
 * Reads ALL 99acres lead emails (read + unread, no date limit) and
 * imports them into the CRM as status "closed".
 *
 * Usage: node importAll.js
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { simpleParser } = require("mailparser");
const axios = require("axios");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const CRM_API = "https://propertiesprofessor.onrender.com/api/leads";
const DUPLICATE_API =
  "https://propertiesprofessor.onrender.com/api/leads/check?phone=";

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
Extract phone, name and property from email body
*/
function extractLead(rawBody) {
  const body = stripHtml(rawBody);

  const phoneMatch = body.match(/\+91[-\s]?(\d{10})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  // Name extraction — handle email address between name and +91, and buyer/tenant
  const nameMatch =
    body.match(/Contact the (?:buyer|tenant) now\s*[-–]\s*(.+?)\s+\S+@\S+\s+\+91/i) ||
    body.match(/Contact the (?:buyer|tenant) now\s*[-–]\s*(.+?)\s*\+91/i) ||
    body.match(/Details of the Query\s+(.+?)\s+\S+@\S+\s+\+91/i) ||
    body.match(/Details of the Query\s+(.+?)\s*\+91/i);
  const name = nameMatch ? nameMatch[1].trim() : "Unknown";

  // Extract full property description (e.g. "3 BHK, Flat/Apartment in Jaypee Greens...")
  const propertyMatch = body.match(/(?:query on\s+Rs[\d,]+\s*,?\s*)(.+?)\s*\(/i) ||
    body.match(/listing\s*\([^)]+\)\s*,?\s*(?:in\s+)?(.+?)\s+on\s+99acres\.com/i) ||
    body.match(/(?:in|for)\s+(.+?)\s+on\s+99acres\.com/i);
  const propertyName = propertyMatch ? propertyMatch[1].trim() : "";

  // Extract 99acres listing ID (e.g. O88063692) and build URL
  const listingMatch = body.match(/\(\s*([A-Z]\d{6,})\s*\)/i);
  const propertyUrl = listingMatch
    ? `https://www.99acres.com/${listingMatch[1]}`
    : "";

  return { name, phone, propertyName, propertyUrl };
}

/*
Check if lead already exists in CRM
*/
async function isDuplicate(phone) {
  try {
    const res = await axios.get(DUPLICATE_API + phone);
    return res.data.exists;
  } catch {
    return false;
  }
}

/*
Send lead to CRM
*/
async function sendLead(name, phone, propertyName, propertyUrl) {
  try {
    await axios.post(CRM_API, {
      name,
      phone,
      source: "99acres",
      status: "new",
      propertyName: propertyName || "",
      propertyUrl: propertyUrl || "",
      message: propertyName ? `99acres lead for: ${propertyName}` : "",
    });
    return true;
  } catch (err) {
    console.error("  CRM error:", err.response?.status, err.response?.data?.message || err.message);
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
  console.log("  99acres Bulk Lead Importer (All-time)");
  console.log("===========================================\n");

  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });

  console.log("Fetching all 99acres lead emails...");
  const ids = await fetchAllMessageIds(
    gmail,
    "from:99acres"
  );

  console.log(`Found ${ids.length} emails. Processing...\n`);

  let imported = 0;
  let duplicates = 0;
  let noPhone = 0;
  let failed = 0;

  for (let i = 0; i < ids.length; i++) {
    const message = await gmail.users.messages.get({
      userId: "me",
      id: ids[i],
      format: "raw",
    });

    const buffer = Buffer.from(message.data.raw, "base64");
    const parsed = await simpleParser(buffer);
    const body = parsed.text || parsed.html || "";

    const { name, phone, propertyName, propertyUrl } = extractLead(body);

    process.stdout.write(`[${i + 1}/${ids.length}] `);

    if (!phone) {
      console.log("No phone — skipped");
      noPhone++;
      continue;
    }

    const dup = await isDuplicate(phone);
    if (dup) {
      console.log(`Duplicate — ${phone}`);
      duplicates++;
      continue;
    }

    const saved = await sendLead(name, phone, propertyName, propertyUrl);
    if (saved) {
      console.log(`Imported — ${name} ${phone}`);
      imported++;
    } else {
      console.log(`Failed    — ${phone}`);
      failed++;
    }
  }

  console.log("\n===========================================");
  console.log(`  Done.`);
  console.log(`  Imported : ${imported}`);
  console.log(`  Duplicate: ${duplicates}`);
  console.log(`  No phone : ${noPhone}`);
  console.log(`  Failed   : ${failed}`);
  console.log("===========================================");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});

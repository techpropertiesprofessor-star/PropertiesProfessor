const fs = require("fs");
const { google } = require("googleapis");
const { simpleParser } = require("mailparser");
const axios = require("axios");

const path = require("path");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

/*
CRM API
*/
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
Strip HTML tags from a string
*/
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/*
Extract lead from email body
*/
function extractLead(rawBody) {
  const body = stripHtml(rawBody);

  const phoneMatch = body.match(/\+91[-\s]?(\d{10})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

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

  // Default to Unknown if no pattern matched
  if (!name) name = "Unknown";

  const propertyMatch = body.match(/(?:query on\s+Rs[\d,]+\s*,?\s*)(.+?)\s*\(/i) ||
    body.match(/listing\s*\([^)]+\)\s*,?\s*(?:in\s+)?(.+?)\s+on\s+99acres\.com/i) ||
    body.match(/(?:in|for)\s+(.+?)\s+on\s+99acres\.com/i);
  const propertyName = propertyMatch ? propertyMatch[1].trim() : "";

  const listingMatch = body.match(/\(\s*([A-Z]\d{6,})\s*\)/i);
  const propertyUrl = listingMatch
    ? `https://www.99acres.com/${listingMatch[1]}`
    : "";

  return { name, phone, propertyName, propertyUrl };
}

/*
Check duplicate lead
*/
async function isDuplicateLead(phone) {
  try {
    const res = await axios.get(DUPLICATE_API + phone);
    return res.data.exists;
  } catch (error) {
    console.log("Duplicate check error");
    return false;
  }
}

/*
Send lead to CRM — returns true on success, false on failure
*/
async function sendLead(name, phone, propertyName, propertyUrl) {
  try {
    await axios.post(CRM_API, {
      name,
      phone,
      source: "99acres",
      propertyName: propertyName || "",
      propertyUrl: propertyUrl || "",
      message: propertyName ? `99acres lead for: ${propertyName}` : "",
    });
    return true;
  } catch (error) {
    console.log("CRM API error:", error.message);
    return false;
  }
}

/*
Main reader
*/
async function readAndProcessEmails() {
  const auth = await authorize();

  const gmail = google.gmail({ version: "v1", auth });

  console.log("[GmailReader] Checking Gmail for new 99acres leads...");

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "from:99acres is:unread newer_than:7d",
    maxResults: 20,
  });

  if (!res.data.messages) {
    console.log("[GmailReader] No new 99acres emails found");
    return;
  }

  let imported = 0;
  let duplicates = 0;

  for (const msg of res.data.messages) {
    const message = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "raw",
    });

    const buffer = Buffer.from(message.data.raw, "base64");
    const parsed = await simpleParser(buffer);

    const body = parsed.text || parsed.html || "";

    console.log("Processing email...");

    const { name, phone, propertyName, propertyUrl } = extractLead(body);

    if (!phone) {
      console.log("Phone not found");
      continue;
    }

    const isDuplicate = await isDuplicateLead(phone);

    if (isDuplicate) {
      console.log("Duplicate lead skipped:", phone);
      duplicates++;
    } else {
      const saved = await sendLead(name, phone, propertyName, propertyUrl);

      if (saved) {
        console.log("Lead imported:", name, phone);
        imported++;
      } else {
        console.log("Lead not saved (API error), skipping mark-as-read:", phone);
        continue;
      }
    }

    /*
    mark email as read
    */
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id,
      resource: {
        removeLabelIds: ["UNREAD"],
      },
    });
  }

  console.log(
    `[GmailReader] Import complete. Imported: ${imported}, Duplicates: ${duplicates}`
  );
}

module.exports = { readAndProcessEmails };
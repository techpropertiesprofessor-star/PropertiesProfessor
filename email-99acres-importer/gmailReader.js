const fs = require("fs");
const { google } = require("googleapis");
const { simpleParser } = require("mailparser");
const axios = require("axios");
const path = require("path");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

const CRM_API = "https://propertiesprofessor.onrender.com/api/leads";
const DUPLICATE_API =
  "https://propertiesprofessor.onrender.com/api/leads/check?phone=";

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

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractLead(rawBody) {
  const body = stripHtml(rawBody);

  const phoneMatch = body.match(/\+91[-\s]?(\d{10})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  // name extraction
  let name = null;

  const pattern = body.match(
    /Contact the (?:buyer|tenant) now\s*[-–]\s*(.+?)\s*\+91/i
  );
  if (pattern) name = pattern[1].trim();

  if (!name) name = "Unknown";

  // property name
  const propertyMatch =
    body.match(/looking for (.+?) for Rs/i) ||
    body.match(/for your listing.*?,(.+?)on 99acres/i);

  const propertyName = propertyMatch ? propertyMatch[1].trim() : "";

  // listing id
  const listingMatch = body.match(/\(\s*([A-Z]\d{6,})\s*\)/i);

  const propertyUrl = listingMatch
    ? `https://www.99acres.com/${listingMatch[1]}`
    : "";

  return { name, phone, propertyName, propertyUrl };
}

async function isDuplicateLead(phone) {
  try {
    const res = await axios.get(DUPLICATE_API + phone);
    return res.data.exists;
  } catch {
    return false;
  }
}

async function sendLead(name, phone, propertyName, propertyUrl) {
  try {
    await axios.post(CRM_API, {
      name,
      phone,
      source: "99acres",
      propertyName,
      propertyUrl,
      message: `99acres lead for ${propertyName}`,
    });
    return true;
  } catch (error) {
    console.log("CRM API error:", error.message);
    return false;
  }
}

async function readAndProcessEmails() {
  const auth = await authorize();
  const gmail = google.gmail({ version: "v1", auth });

  console.log("[GmailReader] Checking Gmail for new 99acres leads...");

  const res = await gmail.users.messages.list({
    userId: "me",
    q: '(99acres OR 99_SUPPORT) is:unread',
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
      }
    }

    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id,
      resource: { removeLabelIds: ["UNREAD"] },
    });
  }

  console.log(
    `[GmailReader] Import complete. Imported: ${imported}, Duplicates: ${duplicates}`
  );
}

module.exports = { readAndProcessEmails };
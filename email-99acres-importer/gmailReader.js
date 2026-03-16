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
const CRM_API = "https://dashboard.propertiesprofessor.com/api/leads";
const DUPLICATE_API =
  "https://dashboard.propertiesprofessor.com/api/leads/check?phone=";

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

  const nameMatch = body.match(/Contact the buyer now\s*[-–]\s*([^<\n]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : "Unknown";

  return { name, phone };
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
async function sendLead(name, phone) {
  try {
    await axios.post(CRM_API, {
      name,
      phone,
      source: "99acres",
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
    q: "subject:\"Buyer wants to know\" is:unread newer_than:7d",
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

    const { name, phone } = extractLead(body);

    if (!phone) {
      console.log("Phone not found");
      continue;
    }

    const isDuplicate = await isDuplicateLead(phone);

    if (isDuplicate) {
      console.log("Duplicate lead skipped:", phone);
      duplicates++;
    } else {
      const saved = await sendLead(name, phone);

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
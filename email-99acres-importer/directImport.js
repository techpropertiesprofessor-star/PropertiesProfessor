/**
 * Direct Database Import - Import leads directly to MongoDB
 * 
 * This bypasses the API and inserts directly into the database.
 * Run this from: d:\pro_test\email-99acres-importer
 * 
 * Usage: node directImport.js
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { simpleParser } = require("mailparser");
const mongoose = require("mongoose");

const TOKEN_PATH = path.join(__dirname, "token.json");
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");

// MongoDB connection
const MONGO_URI = "mongodb+srv://propertiesprofessor_db:Properties7030@propertiesprofessorclus.7vkedmx.mongodb.net/properties_professor";

// Authorize Gmail
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

// Strip HTML tags
function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Extract lead data from email
function extractLead(rawBody, subject) {
  const body = stripHtml(rawBody);

  // Extract phone
  const phoneMatch = body.match(/\+91[-\s]?(\d{10})/);
  const phone = phoneMatch ? phoneMatch[1].trim() : null;

  if (!phone) return null;

  // Extract name using multiple patterns (IMPROVED)
  let name = null;

  // Pattern 1: "Details of the response Name email@domain.com"
  const pattern1 = body.match(/Details of the response\s+(.+?)\s+[\w.+-]+@/i);
  if (pattern1) {
    let extracted = pattern1[1].trim();
    if (extracted && extracted.length > 2 && !/^\+91|^\d{10}/.test(extracted)) {
      name = extracted;
    }
  }

  // Pattern 2: "Details of the response Name +91"
  if (!name) {
    const pattern2 = body.match(/Details of the response\s+(.+?)\s+\+91/i);
    if (pattern2) {
      let extracted = pattern2[1].trim();
      extracted = extracted.replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, '').trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 3: "Contact the buyer/tenant/seller now - Name"
  if (!name) {
    const pattern3 = body.match(/Contact the (?:buyer|tenant|seller|owner) now\s*[-–]\s*(.+?)\s+[\w.+-]+@/i);
    if (pattern3) {
      let extracted = pattern3[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 4: "Contact the buyer/tenant now - Name +91"
  if (!name) {
    const pattern4 = body.match(/Contact the (?:buyer|tenant|seller|owner) now\s*[-–]\s*(.+?)\s*\+91/i);
    if (pattern4) {
      let extracted = pattern4[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 5: "Details of the Query Name email +91"
  if (!name) {
    const pattern5 = body.match(/Details of the Query\s+(.+?)\s+[\w.+-]+@/i);
    if (pattern5) {
      let extracted = pattern5[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 6: "Details of the Query Name +91"
  if (!name) {
    const pattern6 = body.match(/Details of the Query\s+(.+?)\s*\+91/i);
    if (pattern6) {
      let extracted = pattern6[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 7: "Name:" or "Buyer:" or "Contact Name:" labels
  if (!name) {
    const pattern7 = body.match(/(?:Buyer\s*)?(?:Contact\s*)?Name\s*[:\-]\s*(.+?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@)|\s*$)/i);
    if (pattern7) {
      let extracted = pattern7[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 8: "Enquired By: Name"
  if (!name) {
    const pattern8 = body.match(/Enquired\s*By\s*[:\-]\s*(.+?)(?:\s+(?:Email|Phone|Mobile|\+91|[a-z0-9._%+-]+@)|\s*$)/i);
    if (pattern8) {
      let extracted = pattern8[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Pattern 9: Name before email pattern
  if (!name) {
    const pattern9 = body.match(/(?:^|\s|:)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+[\w.+-]+@[\w.-]+\.\w{2,}\s+\+91/i);
    if (pattern9) {
      let extracted = pattern9[1].trim();
      if (extracted && extracted.length > 2) {
        name = extracted;
      }
    }
  }

  // Clean up extracted name
  if (name) {
    name = name
      .replace(/[\w.+-]+@[\w.-]+\.\w{2,}/g, '') // Remove emails
      .replace(/\s+\+91.*$/, '') // Remove phone prefix
      .replace(/[\d\s,.:;]+$/, '') // Remove trailing digits/punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Validate it looks like a name (at least 2 chars, starts with letter)
    if (name && name.length > 2 && /^[A-Za-z]/.test(name)) {
      // Take only first 3 words max
      name = name.split(/\s+/).slice(0, 3).join(' ');
    } else {
      name = null;
    }
  }

  // Extract property from subject
  let propertyName = "";
  if (subject) {
    const subjectMatch = subject.match(/about\s+your\s+(?:Rs[\d,]+,?\s*)?(.+?)(?:\s+in\s+|\.{3}|\s*$)/i);
    if (subjectMatch) {
      propertyName = subjectMatch[1].trim().replace(/\.{3}$/, '').trim();
    }
  }

  // Extract 99acres listing URL
  const listingMatch = body.match(/\(\s*([A-Z]\d{6,})\s*\)/i);
  const propertyUrl = listingMatch
    ? `https://www.99acres.com/${listingMatch[1]}`
    : "";

  return {
    name: name || `Customer ${phone.slice(-4)}`,
    phone,
    propertyName,
    propertyUrl
  };
}

// Fetch all message IDs
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

// Main
async function main() {
  console.log("===========================================");
  console.log("  99acres Direct Database Import");
  console.log("===========================================\n");

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected!\n");

    const db = mongoose.connection.db;
    const leadsCollection = db.collection("leads");

    // Get current count
    const beforeCount = await leadsCollection.countDocuments({ source: "99acres" });
    console.log(`Current 99acres leads in DB: ${beforeCount}\n`);

    // Authorize Gmail
    const auth = await authorize();
    const gmail = google.gmail({ version: "v1", auth });

    console.log("Fetching all 99acres emails from Gmail...");
    const ids = await fetchAllMessageIds(gmail, "from:99acres");
    console.log(`Found ${ids.length} emails.\n`);

    if (ids.length === 0) {
      console.log("No emails found.");
      await mongoose.disconnect();
      return;
    }

    // Track imported phones to avoid duplicates in this run
    const importedPhones = new Set();
    
    // Get existing phones from DB
    const existingLeads = await leadsCollection.find(
      { source: "99acres" },
      { projection: { phone: 1 } }
    ).toArray();
    existingLeads.forEach(l => {
      if (l.phone) importedPhones.add(l.phone.replace(/\D/g, '').slice(-10));
    });

    let imported = 0;
    let duplicates = 0;
    let noPhone = 0;
    let failed = 0;

    console.log("Processing emails...\n");

    for (let i = 0; i < ids.length; i++) {
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: ids[i],
          format: "raw",
        });

        const raw = Buffer.from(msg.data.raw, "base64").toString("utf8");
        const parsed = await simpleParser(raw);
        const body = parsed.text || parsed.html || "";
        const subject = parsed.subject || "";

        const lead = extractLead(body, subject);

        if (!lead || !lead.phone) {
          noPhone++;
          continue;
        }

        const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-10);

        // Check for duplicate
        if (importedPhones.has(normalizedPhone)) {
          duplicates++;
          continue;
        }

        // Insert into database
        const newLead = {
          name: lead.name,
          phone: lead.phone,
          source: "99acres",
          status: "new",
          propertyName: lead.propertyName || "",
          propertyUrl: lead.propertyUrl || "",
          message: lead.propertyName ? `99acres lead for: ${lead.propertyName}` : "99acres lead",
          createdAt: parsed.date || new Date(),
          updatedAt: new Date()
        };

        await leadsCollection.insertOne(newLead);
        importedPhones.add(normalizedPhone);
        imported++;

        process.stdout.write(`\rProcessed: ${i + 1}/${ids.length} | Imported: ${imported} | Duplicates: ${duplicates}`);
      } catch (err) {
        failed++;
      }
    }

    console.log("\n");
    console.log("===========================================");
    console.log("  Import Complete!");
    console.log("===========================================");
    console.log(`  Emails processed : ${ids.length}`);
    console.log(`  Imported         : ${imported}`);
    console.log(`  Duplicates       : ${duplicates}`);
    console.log(`  No phone         : ${noPhone}`);
    console.log(`  Failed           : ${failed}`);
    
    const afterCount = await leadsCollection.countDocuments({ source: "99acres" });
    console.log(`  Total 99acres now: ${afterCount}`);
    console.log("===========================================\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

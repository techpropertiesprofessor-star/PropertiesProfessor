/**
 * IMAP email reader service for 99acres lead notifications.
 *
 * Connects to GoDaddy Titan mailbox via IMAP, reads unread emails
 * from nnacres-services@99acres.com, parses them, and returns lead data.
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { parseLeadEmail } = require('../utils/parser');

const SENDER_FILTER = 'nnacres-services@99acres.com';

function isAuthFailure(err) {
  return /AUTHENTICATIONFAILED|AuthenticationError/i.test(err?.message || '');
}

/**
 * Create an IMAP connection using environment config.
 */
function createImapConnection(options = {}) {
  const { debug } = options;

  return new Imap({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT, 10) || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    connTimeout: 30000,
    authTimeout: 15000,
    ...(debug ? { debug } : {})
  });
}

/**
 * Fetch and parse a single email message.
 * @param {object} imap - IMAP connection
 * @param {number} uid - Message UID
 * @returns {Promise<object|null>} Parsed lead data or null
 */
function fetchMessage(imap, uid) {
  return new Promise((resolve, reject) => {
    const fetch = imap.fetch([uid], {
      bodies: '',
      struct: true,
      markSeen: true  // Mark as read after fetching
    });

    let rawData = '';

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          rawData += chunk.toString('utf8');
        });
      });

      msg.on('end', () => {
        // Message fully received
      });
    });

    fetch.on('error', (err) => {
      console.error(`[EmailReader] Fetch error for UID ${uid}:`, err.message);
      reject(err);
    });

    fetch.on('end', async () => {
      try {
        const parsed = await simpleParser(rawData);
        const lead = parseLeadEmail(parsed);
        resolve(lead);
      } catch (err) {
        console.error(`[EmailReader] Parse error for UID ${uid}:`, err.message);
        resolve(null);
      }
    });
  });
}

/**
 * Read all unread 99acres emails and return parsed leads.
 * @returns {Promise<object[]>} Array of lead objects
 */
function readUnreadLeads() {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();
    const leads = [];

    imap.once('ready', () => {
      console.log('[EmailReader] IMAP connected successfully');

      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('[EmailReader] Failed to open INBOX:', err.message);
          imap.end();
          return reject(err);
        }

        console.log(`[EmailReader] INBOX opened — ${box.messages.total} total messages`);

        // Search for unread emails from 99acres
        const searchCriteria = [
          'UNSEEN',
          ['FROM', SENDER_FILTER]
        ];

        imap.search(searchCriteria, async (err, uids) => {
          if (err) {
            console.error('[EmailReader] Search error:', err.message);
            imap.end();
            return reject(err);
          }

          if (!uids || uids.length === 0) {
            console.log('[EmailReader] No new 99acres emails found');
            imap.end();
            return resolve([]);
          }

          console.log(`[EmailReader] Found ${uids.length} unread 99acres email(s)`);

          // Process each email sequentially
          for (const uid of uids) {
            try {
              const lead = await fetchMessage(imap, uid);
              if (lead) {
                leads.push(lead);
                console.log(`[EmailReader] Parsed lead: ${lead.name} — ${lead.phone}`);
              } else {
                console.warn(`[EmailReader] Could not parse lead from UID ${uid}`);
              }
            } catch (fetchErr) {
              console.error(`[EmailReader] Error processing UID ${uid}:`, fetchErr.message);
            }
          }

          imap.end();
          resolve(leads);
        });
      });
    });

    imap.once('error', (err) => {
      console.error('[EmailReader] IMAP connection error:', err.message);

      if (isAuthFailure(err)) {
        console.error(
          '[EmailReader] Titan accepted the network connection but rejected mailbox authentication. Verify EMAIL_USER and EMAIL_PASS, confirm IMAP access is enabled for the mailbox, and use an app password if Titan account security requires it.'
        );
      }

      reject(err);
    });

    imap.once('end', () => {
      console.log('[EmailReader] IMAP connection closed');
    });

    imap.connect();
  });
}

module.exports = { createImapConnection, readUnreadLeads, isAuthFailure };

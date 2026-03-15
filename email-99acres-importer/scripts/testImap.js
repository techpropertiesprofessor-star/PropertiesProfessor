require('dotenv').config();

const { createImapConnection, isAuthFailure } = require('../services/emailReader');

const required = ['EMAIL_USER', 'EMAIL_PASS', 'IMAP_HOST'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[IMAP Test] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const mailbox = process.env.EMAIL_USER;
const host = process.env.IMAP_HOST;
const port = parseInt(process.env.IMAP_PORT, 10) || 993;
let finished = false;

function finish(code) {
  if (finished) {
    return;
  }

  finished = true;
  process.exit(code);
}

function sanitizeDebugMessage(message) {
  if (!message) {
    return message;
  }

  return message.replace(process.env.EMAIL_PASS, '***');
}

console.log('===========================================');
console.log('  IMAP Connectivity Test');
console.log('===========================================');
console.log(`  Mailbox : ${mailbox}`);
console.log(`  IMAP    : ${host}:${port}`);
console.log('===========================================');

const imap = createImapConnection({
  debug: (message) => {
    if (/Connected to host|CAPABILITY|LOGIN|AUTHENTICATIONFAILED/i.test(message)) {
      console.log(`[IMAP Debug] ${sanitizeDebugMessage(message)}`);
    }
  }
});

const timeout = setTimeout(() => {
  console.error('[IMAP Test] Timed out waiting for Titan IMAP response');
  try {
    imap.destroy();
  } catch (err) {
    // Ignore cleanup errors during timeout handling.
  }
  finish(1);
}, 20000);

imap.once('ready', () => {
  console.log('[IMAP Test] Authentication succeeded');

  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('[IMAP Test] Auth succeeded but INBOX open failed:', err.message);
      clearTimeout(timeout);
      try {
        imap.end();
      } catch (closeErr) {
        // Ignore cleanup errors after an openBox failure.
      }
      finish(1);
      return;
    }

    console.log(`[IMAP Test] INBOX opened successfully (${box.messages.total} total messages)`);
    clearTimeout(timeout);
    imap.end();
    finish(0);
  });
});

imap.once('error', (err) => {
  clearTimeout(timeout);
  console.error('[IMAP Test] Connection failed:', err.message);

  if (isAuthFailure(err)) {
    console.error('[IMAP Test] Titan rejected IMAP authentication. Webmail can still work if third-party mail access, app passwords, or IMAP access are restricted separately.');
  }

  finish(1);
});

imap.once('end', () => {
  if (!finished) {
    clearTimeout(timeout);
    console.log('[IMAP Test] Connection closed');
    finish(0);
  }
});

imap.connect();
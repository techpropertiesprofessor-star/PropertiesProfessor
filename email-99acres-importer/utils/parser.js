/**
 * Parser for 99acres lead notification emails.
 *
 * 99acres sends HTML emails with lead details in various formats.
 * This parser extracts: name, phone, email, property, location.
 */

/**
 * Normalize phone number to +91XXXXXXXXXX format.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  // Strip everything except digits and leading +
  let digits = raw.replace(/[^\d]/g, '');

  // Remove leading 0 (local format)
  if (digits.startsWith('0')) digits = digits.slice(1);

  // If 10 digits, prepend 91
  if (digits.length === 10) digits = '91' + digits;

  // If already 12 digits starting with 91, good
  if (digits.length === 12 && digits.startsWith('91')) {
    return '+' + digits;
  }

  // Return with + prefix if looks valid
  if (digits.length >= 10) return '+' + digits;

  return null;
}

/**
 * Extract a field value from email text using multiple label patterns.
 * @param {string} text - plain text or cleaned HTML text
 * @param {string[]} labels - possible labels for the field
 * @returns {string|null}
 */
function extractField(text, labels) {
  for (const label of labels) {
    // Pattern: "Label: value" or "Label : value" or "Label:value"
    const regex = new RegExp(label + '\\s*[:\\-]\\s*(.+)', 'i');
    const match = text.match(regex);
    if (match) {
      return match[1].trim().split('\n')[0].trim();
    }
  }
  return null;
}

/**
 * Extract phone number from text using regex patterns.
 */
function extractPhone(text) {
  // Try labelled phone first
  const labelled = extractField(text, [
    'Phone(?:\\s*Number)?',
    'Mobile(?:\\s*Number)?',
    'Contact(?:\\s*Number)?',
    'Ph(?:\\s*No)?',
    'Cell'
  ]);
  if (labelled) {
    const normalized = normalizePhone(labelled);
    if (normalized) return normalized;
  }

  // Fallback: find Indian phone patterns in text
  const phonePatterns = [
    /\+91[\s-]?\d{5}[\s-]?\d{5}/,
    /(?:91|0)?\d{10}/,
    /\d{5}[\s-]\d{5}/
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      const normalized = normalizePhone(match[0]);
      if (normalized) return normalized;
    }
  }

  return null;
}

/**
 * Extract email address from text.
 */
function extractEmail(text) {
  // Try labelled email first
  const labelled = extractField(text, ['Email(?:\\s*(?:ID|Address))?', 'E-mail']);
  if (labelled) {
    const emailMatch = labelled.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
    if (emailMatch) return emailMatch[0].toLowerCase();
  }

  // Fallback: find any email in text (skip 99acres addresses)
  const allEmails = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/g);
  if (allEmails) {
    const leadEmail = allEmails.find(e => !e.includes('99acres'));
    if (leadEmail) return leadEmail.toLowerCase();
  }

  return null;
}

/**
 * Parse a 99acres notification email and extract lead data.
 * @param {object} parsed - mailparser parsed email object
 * @returns {object|null} - { name, phone, email, property, location } or null
 */
function parseLeadEmail(parsed) {
  // Use plain text if available, otherwise strip HTML
  let text = parsed.text || '';
  if (!text && parsed.html) {
    text = parsed.html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|tr|td|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#\d+;/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n');
  }

  if (!text.trim()) {
    return null;
  }

  // Also try to extract from subject for property info
  const subject = parsed.subject || '';

  // Extract name
  const name = extractField(text, [
    'Buyer(?:\\s*Name)?',
    'Name',
    'Contact\\s*Person',
    'Customer(?:\\s*Name)?',
    'Enquired\\s*By',
    'Lead\\s*Name'
  ]);

  // Extract phone
  const phone = extractPhone(text);

  // Extract email
  const email = extractEmail(text);

  // Extract property name
  let property = extractField(text, [
    'Property(?:\\s*Name)?',
    'Project(?:\\s*Name)?',
    'Interested\\s*(?:in|In)',
    'Property\\s*Title',
    'Listing'
  ]);

  // Fallback: try to get property from subject
  // Subject format: "Buyer wants to know about your Rs40,000, 3 BHK Flat/Apartment..."
  if (!property && subject) {
    const subjectMatch = subject.match(/about\s+your\s+(?:Rs[\d,]+,?\s*)?(.+?)(?:\s+in\s+|\.{3}|\s*$)/i);
    if (subjectMatch) {
      property = subjectMatch[1].trim().replace(/\.{3}$/, '').trim();
    }
  }

  // Extract location
  const location = extractField(text, [
    'Project\\s*Location',
    'Location',
    'Area',
    'Locality',
    'Address',
    'City'
  ]);

  // Must have at least name and phone to be a valid lead
  if (!name || !phone) {
    return null;
  }

  return {
    name: name.trim(),
    phone,
    email: email || null,
    property: property ? property.trim() : null,
    location: location ? location.trim() : null
  };
}

module.exports = { parseLeadEmail, normalizePhone, extractPhone, extractEmail };

/**
 * slopFilter.js — Input sanitization, anti-slop, and anti-spam validator for RaketBase
 * 
 * Rules enforced:
 * 1. HTML / Script tag rejection (anti-XSS)
 * 2. Anti-shouting guard (>70% uppercase in title)
 * 3. Lexical diversity check (unique / total words < 0.45 for texts with >= 10 words)
 * 4. Off-platform contact detection (email, phone, Telegram, WhatsApp)
 * 5. Minimum budget floor (₱100 / $2.00)
 */

const HTML_SCRIPT_REGEX = /<\s*[^>]*[a-zA-Z\/][^>]*>|javascript\s*:/i;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const OFF_PLATFORM_REGEX = /(?:t\.me\/[a-zA-Z0-9_]{4,}|telegram\s*[:@]\s*\w+|whatsapp\s*[:@\s]*\+?\d+)/i;

/**
 * Checks if a text contains HTML or script tags.
 */
function hasHtmlOrScript(text) {
  return HTML_SCRIPT_REGEX.test(text || '');
}

/**
 * Checks if a string has excessive uppercase (>70% of alpha characters).
 */
function isShouting(text, minLetters = 5, maxRatio = 0.70) {
  const letters = (text || '').replace(/[^a-zA-Z]/g, '');
  if (letters.length < minLetters) return false;
  const upperCount = (letters.match(/[A-Z]/g) || []).length;
  return (upperCount / letters.length) > maxRatio;
}

/**
 * Calculates lexical diversity (unique words / total words).
 * Returns ratio between 0 and 1, or null if fewer than minWords.
 */
function getLexicalDiversity(text, minWords = 10) {
  const words = (text || '').toLowerCase().match(/\b[a-z0-9']+\b/g) || [];
  if (words.length < minWords) return null;
  const uniqueCount = new Set(words).size;
  return uniqueCount / words.length;
}

/**
 * Checks for off-platform contact details (email, phone, Telegram, WhatsApp).
 */
function findOffPlatformContacts(text) {
  const issues = [];
  if (EMAIL_REGEX.test(text || '')) issues.push('email addresses');
  if (PHONE_REGEX.test(text || '')) issues.push('phone numbers');
  if (OFF_PLATFORM_REGEX.test(text || '')) issues.push('off-platform handles (Telegram/WhatsApp)');
  return issues;
}

/**
 * Detects keyboard smashing, home-row letter cycling, and unbroken gibberish.
 * Returns error string if detected, or null if clean.
 */
function findKeyboardMash(text, fieldName = 'Text') {
  if (!text || typeof text !== 'string') return null;

  // Split into tokens, ignoring URLs
  const cleanedText = text.replace(/https?:\/\/[^\s]+/gi, ' ');
  const tokens = cleanedText.match(/[a-zA-Z]+/g) || [];

  for (const word of tokens) {
    const clean = word.toLowerCase();

    // Ignore acronyms and short words (<= 4 chars: HTML, AWS, PHP)
    if (clean.length < 5) continue;

    // Rule 1: Non-URL words exceeding 25 characters (unbroken keyboard mashing)
    if (clean.length > 25) {
      return `${fieldName} contains an unbroken word that is too long ('${word.slice(0, 18)}...') and appears to be keyboard-mashed.`;
    }

    // Rule 2: 5 or more consecutive consonants (e.g., "dfghjkl", "zxcvbnm", "qwrtyp")
    if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(clean) && clean !== 'strengths') {
      return `${fieldName} contains an unnatural consonant sequence in word '${word}'.`;
    }

    // Rule 3: Repeating 2-3 key loops (e.g., "asdasdasd", "qweqweqwe")
    if (/([a-z]{2,3})\1{2,}/i.test(clean)) {
      return `${fieldName} contains repetitive keyboard patterns in word '${word}'.`;
    }

    // Rule 4: Home-row character diversity test for words >= 7 letters (e.g., "ahdhsadhasdh", "asdsaddsadsadasasd")
    const uniqueLetters = new Set(clean).size;
    if (clean.length >= 7 && (uniqueLetters / clean.length) < 0.45) {
      return `${fieldName} contains keyboard-mashed word '${word}' with low character variety.`;
    }
  }

  return null;
}

/**
 * Validates job input fields (title, description, custom_category, budget).
 * Returns { valid: boolean, errors: string[] }
 */
function validateJobInput({ title, description, custom_category, budget, currency = 'PHP' }) {
  const errors = [];

  // Title validation
  if (!title || typeof title !== 'string' || !title.trim()) {
    errors.push('Job title is required.');
  } else {
    const t = title.trim();
    if (t.length < 5) errors.push('Job title must be at least 5 characters long.');
    if (t.length > 150) errors.push('Job title must be 150 characters or less.');
    if (hasHtmlOrScript(t)) errors.push('Job title cannot contain HTML or script tags.');
    if (isShouting(t)) errors.push('Job title cannot be in ALL CAPS (anti-shouting rule).');

    const mash = findKeyboardMash(t, 'Job title');
    if (mash) errors.push(mash);
  }

  // Custom Category validation (if selected under "Others")
  if (custom_category !== undefined && custom_category !== null && String(custom_category).trim()) {
    const cc = String(custom_category).trim();
    if (cc.length < 2) errors.push('Custom category must be at least 2 characters long.');
    if (cc.length > 50) errors.push('Custom category must be 50 characters or less.');
    if (hasHtmlOrScript(cc)) errors.push('Custom category cannot contain HTML or script tags.');

    const mash = findKeyboardMash(cc, 'Custom category');
    if (mash) errors.push(mash);
  }

  // Description validation
  if (!description || typeof description !== 'string' || !description.trim()) {
    errors.push('Job description is required.');
  } else {
    const d = description.trim();
    if (d.length < 30) errors.push('Job description must be at least 30 characters long.');
    if (hasHtmlOrScript(d)) errors.push('Job description cannot contain HTML or script tags.');

    const words = (d.match(/\b[a-zA-Z0-9']+\b/g) || []);
    if (words.length < 5) {
      errors.push('Job description must contain at least 5 words.');
    }

    const mash = findKeyboardMash(d, 'Job description');
    if (mash) errors.push(mash);

    const diversity = getLexicalDiversity(d, 5);
    if (diversity !== null && diversity < 0.45) {
      errors.push('Job description contains repetitive or low-quality text (lexical diversity below 45%).');
    }
  }

  // Off-platform contact detection across title + description
  const combinedText = `${title || ''} ${description || ''}`;
  const contacts = findOffPlatformContacts(combinedText);
  if (contacts.length > 0) {
    errors.push(`Sharing ${contacts.join(' or ')} in job postings is prohibited to prevent off-platform scams.`);
  }

  // Budget floor validation
  if (budget !== undefined && budget !== null) {
    const b = Number(budget);
    const minBudget = currency === 'USD' ? 2.00 : 100.00;
    const symbol = currency === 'USD' ? '$' : '₱';
    if (isNaN(b) || b < minBudget) {
      errors.push(`Budget must be at least ${symbol}${minBudget.toFixed(2)}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates proposal cover letter and bid amount.
 * Returns { valid: boolean, errors: string[] }
 */
function validateProposalInput({ cover_letter, bid_amount }) {
  const errors = [];

  // Cover letter validation
  if (!cover_letter || typeof cover_letter !== 'string' || !cover_letter.trim()) {
    errors.push('Cover letter is required.');
  } else {
    const cl = cover_letter.trim();
    if (cl.length < 30) errors.push('Cover letter must be at least 30 characters long.');
    if (hasHtmlOrScript(cl)) errors.push('Cover letter cannot contain HTML or script tags.');

    const words = (cl.match(/\b[a-zA-Z0-9']+\b/g) || []);
    if (words.length < 5) {
      errors.push('Cover letter must contain at least 5 words.');
    }

    const mash = findKeyboardMash(cl, 'Cover letter');
    if (mash) errors.push(mash);

    const diversity = getLexicalDiversity(cl, 5);
    if (diversity !== null && diversity < 0.45) {
      errors.push('Cover letter contains repetitive or low-quality text (lexical diversity below 45%).');
    }

    const contacts = findOffPlatformContacts(cl);
    if (contacts.length > 0) {
      errors.push(`Sharing ${contacts.join(' or ')} in proposals is prohibited to protect on-platform escrow.`);
    }
  }

  // Bid amount
  if (bid_amount !== undefined && bid_amount !== null) {
    const b = Number(bid_amount);
    if (isNaN(b) || b <= 0) {
      errors.push('Bid amount must be a positive number greater than 0.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  hasHtmlOrScript,
  isShouting,
  getLexicalDiversity,
  findOffPlatformContacts,
  findKeyboardMash,
  validateJobInput,
  validateProposalInput,
};

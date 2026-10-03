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
 * Validates job input fields (title, description, budget).
 * Returns { valid: boolean, errors: string[] }
 */
function validateJobInput({ title, description, budget, currency = 'PHP' }) {
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
  }

  // Description validation
  if (!description || typeof description !== 'string' || !description.trim()) {
    errors.push('Job description is required.');
  } else {
    const d = description.trim();
    if (d.length < 30) errors.push('Job description must be at least 30 characters long.');
    if (hasHtmlOrScript(d)) errors.push('Job description cannot contain HTML or script tags.');

    const diversity = getLexicalDiversity(d, 10);
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

    const diversity = getLexicalDiversity(cl, 10);
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
  validateJobInput,
  validateProposalInput,
};

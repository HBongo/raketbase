/**
 * formatters.js — Centralized formatting helpers for RaketBase
 */
import { convertForDisplay, CURRENCY_SYMBOLS } from './currency';

/**
 * Formats a monetary amount with the appropriate currency symbol.
 * @param {number|string} amount - The amount to format
 * @param {string} [currency='PHP'] - ISO currency code ('PHP', 'USD', etc.)
 * @returns {string} Formatted currency string, e.g. "₱5,000" or "$100"
 */
export function formatCurrency(amount, currency = 'PHP') {
  // When the viewer picked another display currency in the top bar, show an
  // estimate in that currency ("≈ €126"); the stored amount never changes.
  const converted = amount === undefined || amount === null || isNaN(Number(amount))
    ? null
    : convertForDisplay(amount, currency);
  if (converted) {
    return `≈ ${formatInCurrency(converted.value, converted.currency)}`;
  }
  return formatOriginalCurrency(amount, currency);
}

/**
 * Formats an amount in its own currency, ignoring the display-currency selector.
 * @param {number|string} amount
 * @param {string} [currency='PHP']
 * @returns {string} e.g. "₱5,000" or "$100"
 */
export function formatOriginalCurrency(amount, currency = 'PHP') {
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) {
    return currency === 'USD' ? '$0' : '₱0';
  }

  const symbol = (currency || 'PHP').toUpperCase() === 'USD' ? '$' : '₱';

  // Format with commas, omitting decimals if whole number
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

// Converted amounts: whole numbers for JPY, 2 decimals for large-unit currencies.
function formatInCurrency(value, currency) {
  const decimals = currency === 'JPY' || currency === 'PHP' ? 0 : 2;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${CURRENCY_SYMBOLS[currency] || ''}${formatted}`;
}

/**
 * Returns the currency symbol for a given currency code.
 * @param {string} [currency='PHP']
 * @returns {string} Currency symbol ('₱' or '$')
 */
export function getCurrencySymbol(currency = 'PHP') {
  return (currency || 'PHP').toUpperCase() === 'USD' ? '$' : '₱';
}

/**
 * Extracts display category from a job, parsing [Category: CustomName] if present.
 */
export function parseJobCategory(job) {
  if (!job) return 'Others';
  const desc = job.description || '';
  const match = desc.match(/^\[Category:\s*([^\]]+)\]/i);
  if (match) {
    return match[1].trim();
  }
  return job.categories?.category_name || 'Others';
}

/**
 * Strips [Category: CustomName] prefix from the job description for clean reading.
 */
export function cleanJobDescription(desc) {
  if (!desc) return '';
  return desc.replace(/^\[Category:\s*([^\]]+)\]\s*/i, '').trim();
}

/**
 * formatters.js — Centralized formatting helpers for RaketBase
 */

/**
 * Formats a monetary amount with the appropriate currency symbol.
 * @param {number|string} amount - The amount to format
 * @param {string} [currency='PHP'] - ISO currency code ('PHP', 'USD', etc.)
 * @returns {string} Formatted currency string, e.g. "₱5,000" or "$100"
 */
export function formatCurrency(amount, currency = 'PHP') {
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

/**
 * Returns the currency symbol for a given currency code.
 * @param {string} [currency='PHP']
 * @returns {string} Currency symbol ('₱' or '$')
 */
export function getCurrencySymbol(currency = 'PHP') {
  return (currency || 'PHP').toUpperCase() === 'USD' ? '$' : '₱';
}

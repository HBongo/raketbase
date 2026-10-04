// money.js — Formats an amount in its job's currency for chat messages, notifications
// and the activity log (jobs and direct offers are priced in PHP or USD).
const SYMBOLS = { PHP: '₱', USD: '$' };

function formatMoney(amount, currency) {
  const symbol = SYMBOLS[currency] || SYMBOLS.PHP;
  return `${symbol}${Number(amount || 0).toLocaleString()}`;
}

module.exports = { formatMoney };

const https = require('https');

// Exchange rates relative to PHP (units per 1 PHP), shared by GET /api/v1/rates and by
// totals that mix PHP and USD contracts. Cached for an hour; falls back to hardcoded
// rates when the external API is unreachable.
let cache = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const FALLBACK_RATES = {
  PHP: 1,
  USD: 0.0178,
  EUR: 0.0163,
  JPY: 2.68,
  GBP: 0.014,
  SGD: 0.024,
};

function fetchRatesFromApi() {
  return new Promise((resolve, reject) => {
    https
      .get('https://open.er-api.com/v6/latest/PHP', (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.result !== 'success' || !json.rates) {
              return reject(new Error('Unexpected API response'));
            }
            resolve(json.rates);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

// Returns { rates, source } where source is 'cache', 'live' or 'fallback'. Never throws.
async function getPhpRates() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return { rates: cache.rates, source: 'cache' };
  }
  try {
    const allRates = await fetchRatesFromApi();
    // Only the currencies the platform cares about
    const rates = {
      PHP: 1,
      USD: allRates.USD,
      EUR: allRates.EUR,
      JPY: allRates.JPY,
      GBP: allRates.GBP,
      SGD: allRates.SGD,
    };
    cache = { rates, timestamp: Date.now() };
    return { rates, source: 'live' };
  } catch (err) {
    console.error('Currency API error, using fallback rates:', err.message);
    return { rates: FALLBACK_RATES, source: 'fallback' };
  }
}

// An amount in its own currency (PHP or USD), converted to PHP
function toPhp(amount, currency, rates) {
  const value = Number(amount || 0);
  const rate = (rates || FALLBACK_RATES)[currency] || FALLBACK_RATES[currency];
  if (!currency || currency === 'PHP' || !rate) return value;
  return value / rate;
}

module.exports = { getPhpRates, toPhp, FALLBACK_RATES };

const { getPhpRates } = require('../utils/rates');

// GET /api/v1/rates
// Returns exchange rates relative to PHP.  The response always contains at
// least { PHP, USD, EUR, JPY, GBP, SGD } — either live or fallback.
exports.getRates = async (req, res) => {
  const { rates, source } = await getPhpRates();
  return res.status(200).json({ success: true, source, data: rates });
};

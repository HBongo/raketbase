import { useEffect } from 'react';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, useDisplayCurrency, setDisplayCurrency, loadRates } from '../utils/currency';

// Top-bar picker for the currency amounts are displayed in (live rates via /api/v1/rates).
export default function CurrencySelector() {
  const { currency, rates } = useDisplayCurrency();

  useEffect(() => {
    loadRates();
  }, []);

  return (
    <select
      className="form-select form-select-sm rounded-pill fw-medium d-none d-sm-block"
      style={{ width: 'auto', minWidth: '96px' }}
      value={currency}
      onChange={(e) => setDisplayCurrency(e.target.value)}
      aria-label="Display currency"
      title={rates ? 'Show amounts in another currency (live exchange rates)' : 'Exchange rates unavailable right now'}
      disabled={!rates}
    >
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>
      ))}
    </select>
  );
}

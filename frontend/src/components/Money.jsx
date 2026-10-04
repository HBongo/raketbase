import { formatCurrency, formatOriginalCurrency } from '../utils/formatters';
import { useDisplayCurrency, convertForDisplay } from '../utils/currency';

// A money amount that follows the top-bar currency selector. When converted it shows
// "≈ €126" with the original amount ("₱8,000 (original)") as a hover tooltip.
export default function Money({ amount, currency = 'PHP', className, style }) {
  useDisplayCurrency(); // re-render when the display currency or rates change
  const isConverted = amount !== undefined && amount !== null && !!convertForDisplay(amount, currency);

  return (
    <span
      className={className}
      style={style}
      title={isConverted ? `${formatOriginalCurrency(amount, currency)} (original)` : undefined}
    >
      {formatCurrency(amount, currency)}
    </span>
  );
}

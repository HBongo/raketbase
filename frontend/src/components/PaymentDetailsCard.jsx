// PaymentDetailsCard.jsx — The Payments tab on each side of your own profile.
//   kind="payout":  Freelancer side, where released escrow is paid out to
//   kind="payment": Client side, how escrow is funded (can also be a card)
// Saved numbers only ever come back masked (•••• 1234); full card numbers are never stored.
import { useState } from 'react';
import { updatePayoutDetails, updatePaymentMethodDetails } from '../services/api';
import { showToast } from '../utils/toast';

const COPY = {
  payout: {
    title: 'Payout Details',
    icon: 'bi-wallet2',
    intro: 'Where your earnings are sent when a client releases escrow. Needed before you can send proposals or accept direct offers.',
    empty: 'No payout details yet. Add them so you can be paid for your work.',
    saved: 'Payout details saved',
  },
  payment: {
    title: 'Payment Method',
    icon: 'bi-credit-card',
    intro: 'How you fund escrow when you hire someone. Needed before you can accept a proposal or send a direct offer.',
    empty: 'No payment method yet. Add one so you can hire freelancers.',
    saved: 'Payment method saved',
  },
};

const METHOD_OPTIONS = {
  payout: [['gcash', 'GCash'], ['maya', 'Maya'], ['bank', 'Bank account']],
  payment: [['gcash', 'GCash'], ['maya', 'Maya'], ['bank', 'Bank account'], ['card', 'Debit / credit card']],
};

const EMPTY_FORM = { method: '', provider: '', name: '', number: '', expiry: '' };

// The two endpoints use different field names
function toPayload(kind, f) {
  return kind === 'payout'
    ? { payoutMethod: f.method, payoutProvider: f.provider, accountName: f.name, accountNumber: f.number }
    : { paymentMethod: f.method, paymentProvider: f.provider, paymentAccountName: f.name, paymentAccountNumber: f.number, cardExpiry: f.expiry };
}

// details: the masked details (or null), loading: still fetching, onSaved(masked)
export default function PaymentDetailsCard({ kind, details, loading, onSaved }) {
  const copy = COPY[kind];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    setForm({
      ...EMPTY_FORM,
      method: details?.method || '',
      provider: details?.method === 'bank' ? details.provider_name || '' : '',
      name: details?.account_name || '',
    });
    setError('');
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const save = kind === 'payout' ? updatePayoutDetails : updatePaymentMethodDetails;
      const res = await save(toPayload(kind, form));
      onSaved(res.data);
      setEditing(false);
      showToast(copy.saved, 4000);
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const isWallet = form.method === 'gcash' || form.method === 'maya';
  const isCard = form.method === 'card';
  const numberLabel = isCard ? 'Card number' : isWallet ? `${form.method === 'gcash' ? 'GCash' : 'Maya'} number` : 'Account number';

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
        <h5 className="fw-bold text-dark mb-0"><i className={`bi ${copy.icon} me-2 text-muted`}></i>{copy.title}</h5>
        {!editing && !loading && (
          <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={startEdit}>
            {details ? 'Change' : 'Add'}
          </button>
        )}
      </div>
      <div className="card-body px-4 pb-4 mt-2">
        <p className="text-muted small">
          {copy.intro} Only the last 4 digits are ever shown, to you and to admins. Only you can see this tab.
        </p>

        {loading ? (
          <div className="text-muted small"><span className="spinner-border spinner-border-sm me-2"></span>Loading...</div>
        ) : editing ? (
          <form onSubmit={handleSave}>
            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
            <div className="row g-2 mb-2">
              <div className="col-sm-6">
                <label className="form-label small fw-medium text-dark" htmlFor={`${kind}-method`}>Method</label>
                <select id={`${kind}-method`} className="form-select bg-light" value={form.method} onChange={set('method')} required>
                  <option value="">Choose...</option>
                  {METHOD_OPTIONS[kind].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {form.method === 'bank' && (
                <div className="col-sm-6">
                  <label className="form-label small fw-medium text-dark" htmlFor={`${kind}-bank`}>Bank name</label>
                  <input id={`${kind}-bank`} type="text" className="form-control bg-light" maxLength={60} placeholder="e.g. BDO, BPI" value={form.provider} onChange={set('provider')} />
                </div>
              )}
            </div>
            {form.method && (
              <div className="row g-2 mb-3">
                <div className="col-sm-6">
                  <label className="form-label small fw-medium text-dark" htmlFor={`${kind}-name`}>{isCard ? 'Name on card' : 'Account name'}</label>
                  <input id={`${kind}-name`} type="text" className="form-control bg-light" maxLength={100} value={form.name} onChange={set('name')} />
                </div>
                <div className={isCard ? 'col-8 col-sm-4' : 'col-sm-6'}>
                  <label className="form-label small fw-medium text-dark" htmlFor={`${kind}-number`}>{numberLabel}</label>
                  <input
                    id={`${kind}-number`}
                    type="text"
                    inputMode="numeric"
                    autoComplete={isCard ? 'cc-number' : 'off'}
                    className="form-control bg-light"
                    placeholder={isCard ? '4242 4242 4242 4242' : isWallet ? '09171234567' : '6 to 20 digits'}
                    value={form.number}
                    onChange={set('number')}
                  />
                </div>
                {isCard && (
                  <div className="col-4 col-sm-2">
                    <label className="form-label small fw-medium text-dark" htmlFor={`${kind}-expiry`}>Expiry</label>
                    <input id={`${kind}-expiry`} type="text" inputMode="numeric" autoComplete="cc-exp" className="form-control bg-light" placeholder="MM/YY" maxLength={5} value={form.expiry} onChange={set('expiry')} />
                  </div>
                )}
                {details && <div className="form-text">Enter the full number again to save changes.</div>}
                {isCard && <div className="form-text">Only the card brand, last 4 digits, and expiry are saved, never the full card number.</div>}
              </div>
            )}
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-dark rounded-pill px-4" disabled={saving || !form.method}>
                {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : 'Save'}
              </button>
            </div>
          </form>
        ) : details ? (
          <div className="d-flex align-items-center gap-3 bg-light rounded-3 p-3">
            <i className={`bi ${details.method === 'card' ? 'bi-credit-card-2-front' : details.method === 'bank' ? 'bi-bank' : 'bi-phone'} fs-4 text-muted`}></i>
            <div>
              <div className="fw-medium text-dark">
                {details.provider_name || details.method_label} •••• {details.account_last4}
                {details.card_expiry && <span className="text-muted small ms-2">exp {details.card_expiry}</span>}
              </div>
              <div className="text-muted small">{details.account_name}</div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning small mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>{copy.empty}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getOfferFileUrl } from '../services/api';
import Money from './Money';

const STATUS_STYLES = {
  pending: 'bg-warning-subtle text-warning-emphasis border border-warning',
  accepted: 'bg-success-subtle text-success-emphasis border border-success',
  declined: 'bg-danger-subtle text-danger-emphasis border border-danger',
  withdrawn: 'bg-light text-muted border',
};

function personName(p, fallback) {
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ') || fallback;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// One direct offer. side='received' (freelancer: Accept/Decline) or 'sent' (client: Withdraw).
export default function OfferCard({ offer, side, busy, onAccept, onDecline, onWithdraw }) {
  const [fileError, setFileError] = useState('');
  const other = side === 'received' ? offer.client : offer.freelancer;
  const otherName = personName(other, side === 'received' ? 'Client' : 'Freelancer');
  const isPending = offer.status === 'pending';

  async function openFile(file) {
    setFileError('');
    try {
      const res = await getOfferFileUrl(offer.offer_id, file.file_id);
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setFileError(err.message || 'Could not open that file.');
    }
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-2">
          <div style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge rounded-pill text-capitalize ${STATUS_STYLES[offer.status] || 'bg-light text-dark border'}`}>{offer.status}</span>
              <span className="small text-muted">{formatDate(offer.created_at)}</span>
            </div>
            <h5 className="fw-bold mb-1">{offer.title}</h5>
            <p className="small text-muted mb-0">
              {side === 'received' ? 'From ' : 'To '}
              <Link to={`/profile/${other?.user_id}`} className="text-decoration-none fw-medium">{otherName}</Link>
              {side === 'received' && offer.client?.company_name ? ` · ${offer.client.company_name}` : ''}
              {offer.deadline ? ` · Deadline ${formatDate(offer.deadline)}` : ''}
            </p>
          </div>
          <h4 className="fw-bold mb-0 flex-shrink-0" style={{ color: '#FF5A1E' }}>
            <Money amount={offer.amount} currency={offer.currency} />
          </h4>
        </div>

        <p className="small text-secondary mt-3 mb-3" style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>{offer.description}</p>

        {offer.direct_offer_files?.length > 0 && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {offer.direct_offer_files.map((f) => (
              <button
                key={f.file_id}
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill"
                onClick={() => openFile(f)}
                title="Open attachment"
              >
                <i className="bi bi-paperclip me-1"></i>{f.file_name}
              </button>
            ))}
          </div>
        )}
        {fileError && <div className="alert alert-danger py-1 px-2 small">{fileError}</div>}

        {isPending && side === 'received' && (
          <div className="d-flex gap-2 pt-3 border-top">
            <button
              type="button"
              className="btn btn-sm text-white fw-medium px-4"
              style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
              onClick={onAccept}
              disabled={busy}
            >
              {busy ? 'Working...' : 'Accept offer'}
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary fw-medium px-4" onClick={onDecline} disabled={busy}>
              Decline
            </button>
          </div>
        )}

        {isPending && side === 'sent' && (
          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
            <span className="small text-muted">Waiting for {otherName} to respond.</span>
            <button type="button" className="btn btn-sm btn-outline-danger fw-medium px-3" onClick={onWithdraw} disabled={busy}>
              {busy ? 'Working...' : 'Withdraw offer'}
            </button>
          </div>
        )}

        {offer.status === 'accepted' && (
          <div className="pt-3 border-top small">
            <i className="bi bi-check-circle-fill text-success me-1"></i>
            Accepted — this is now an active contract.{' '}
            <Link to="/dashboard" className="fw-medium">Open Dashboard</Link>
          </div>
        )}
      </div>
    </div>
  );
}

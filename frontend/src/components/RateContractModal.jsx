import { useState } from 'react';
import { createReview } from '../services/api';

// Criteria per role being rated. Keys must match backend/src/utils/ratings.js.
//   'freelancer' = rating the freelancer (done by their client)
//   'customer'   = rating the client (done by their freelancer)
const CRITERIA = {
  freelancer: [
    { key: 'quality_rating', label: 'Quality of work', hint: 'How good was the finished work?' },
    { key: 'communication_rating', label: 'Communication', hint: 'Were they clear and easy to reach?' },
    { key: 'timeliness_rating', label: 'Timeliness', hint: 'Did they deliver when promised?' },
  ],
  customer: [
    { key: 'clarity_rating', label: 'Clarity', hint: 'Were the requirements clear and complete?' },
    { key: 'responsiveness_rating', label: 'Responsiveness', hint: 'Did they reply and give feedback promptly?' },
    { key: 'payment_rating', label: 'Payment', hint: 'Was payment handled fairly and on time?' },
  ],
};

const COMMENT_MAX = 1000;

// contract: the completed contract; revieweeRole: 'freelancer' | 'customer'; revieweeName: who is being rated
export default function RateContractModal({ contract, revieweeRole, revieweeName, onClose, onRated }) {
  const criteria = CRITERIA[revieweeRole] || [];
  const [rating, setRating] = useState(0);
  const [subs, setSubs] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isComplete = rating > 0 && criteria.every((c) => subs[c.key] > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Choose an overall rating.');
    const missing = criteria.find((c) => !subs[c.key]);
    if (missing) return setError(`Rate ${missing.label.toLowerCase()} too.`);

    setSubmitting(true);
    try {
      await createReview({
        contract_id: contract.contract_id,
        rating,
        ...subs,
        comment: comment.trim() || undefined,
      });
      onRated();
    } catch (err) {
      setError(err.message || 'Could not submit your rating.');
      setSubmitting(false);
    }
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="rate-title" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content shadow" onSubmit={handleSubmit}>
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold" id="rate-title">Rate {revieweeName}</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={submitting} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="text-muted small mb-4">
              {contract.jobs?.title || 'Completed contract'} · You can only rate once, so take a moment.
            </p>

            <div className="mb-4">
              <p className="fw-semibold small mb-1">Overall rating <span className="text-danger">*</span></p>
              <StarInput value={rating} onChange={setRating} label="Overall rating" size="1.6rem" />
            </div>

            {criteria.map((c) => (
              <div key={c.key} className="d-flex align-items-center justify-content-between gap-3 mb-3">
                <div>
                  <p className="small fw-medium mb-0">{c.label}</p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{c.hint}</p>
                </div>
                <StarInput
                  value={subs[c.key] || 0}
                  onChange={(v) => setSubs((prev) => ({ ...prev, [c.key]: v }))}
                  label={c.label}
                />
              </div>
            ))}

            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="review-comment" className="form-label small fw-medium mb-0">Comment (optional)</label>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>{comment.length}/{COMMENT_MAX}</span>
              </div>
              <textarea
                id="review-comment"
                className="form-control"
                rows={3}
                maxLength={COMMENT_MAX}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What went well? What could be better?"
              />
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mt-3 mb-0" role="alert">{error}</div>
            )}
          </div>
          <div className="modal-footer border-top-0 pt-0">
            <button type="button" className="btn btn-link text-muted text-decoration-none small" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn fw-medium text-white px-4"
              style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
              disabled={!isComplete || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StarInput({ value, onChange, label, size = '1.25rem' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="d-flex gap-1 flex-shrink-0" role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className="btn btn-link p-0 border-0 text-decoration-none"
          style={{ fontSize: size, lineHeight: 1, color: n <= shown ? '#F5B301' : '#C9CED6' }}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <i className={n <= shown ? 'bi bi-star-fill' : 'bi bi-star'}></i>
        </button>
      ))}
    </div>
  );
}

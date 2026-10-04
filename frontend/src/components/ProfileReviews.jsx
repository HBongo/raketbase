// ProfileReviews.jsx — Every review someone received in one role, with the average and
// per-criteria breakdown on top. Used on both sides of a profile.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserReviews } from '../services/api';
import StarRating from './StarRating';

const DEFAULT_AVATAR = '/default-avatar.png';

const CRITERIA_LABELS = {
  freelancer: {
    quality_rating: 'Quality',
    communication_rating: 'Communication',
    timeliness_rating: 'Timeliness',
  },
  customer: {
    clarity_rating: 'Clarity',
    responsiveness_rating: 'Responsiveness',
    payment_rating: 'Payment',
  },
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// role: 'freelancer' (reviews from clients) or 'customer' (reviews from freelancers)
export default function ProfileReviews({ userId, role }) {
  // Results are tagged with the person/role they belong to, so switching profiles never
  // shows the previous person's reviews while the new ones load
  const key = `${userId}:${role}`;
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getUserReviews(userId, role)
      .then((res) => { if (!cancelled) setResult({ key, data: res.data }); })
      .catch((err) => { if (!cancelled) setResult({ key, error: err.message || 'Could not load reviews.' }); });
    return () => { cancelled = true; };
  }, [key, userId, role]);

  const current = result?.key === key ? result : null;
  const data = current?.data;
  if (current?.error) return <p className="text-danger small mb-0">{current.error}</p>;
  if (!data) {
    return (
      <div className="text-center py-4 text-muted small">
        <span className="spinner-border spinner-border-sm me-2"></span>Loading reviews...
      </div>
    );
  }

  const { summary, reviews, has_more } = data;
  if (!reviews.length) {
    return (
      <p className="text-muted fst-italic text-center py-3 mb-0">
        No reviews from {role === 'freelancer' ? 'clients' : 'freelancers'} yet.
      </p>
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-4 bg-light rounded-3 p-3 mb-4">
        <div className="text-center">
          <div className="fw-bold text-dark fs-2 lh-1">{summary.average}</div>
          <StarRating rating={Math.round(summary.average)} size="14px" />
          <div className="text-muted small">{summary.count} {summary.count === 1 ? 'review' : 'reviews'}</div>
        </div>
        <div className="flex-grow-1" style={{ minWidth: '180px' }}>
          {Object.entries(CRITERIA_LABELS[role]).map(([col, label]) => (
            <div key={col} className="d-flex justify-content-between small mb-1">
              <span className="text-muted">{label}</span>
              <span className="fw-medium text-dark">
                <i className="bi bi-star-fill text-warning me-1" style={{ fontSize: '0.75rem' }}></i>
                {summary.breakdown?.[col] ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {reviews.map((r, i) => (
        <div key={r.review_id}>
          {i > 0 && <hr className="my-3" />}
          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <img
                src={r.reviewer.avatar_url || DEFAULT_AVATAR}
                alt=""
                className="rounded-circle flex-shrink-0"
                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
              />
              <div style={{ minWidth: 0 }}>
                {/* The reviewer was on the other side of the contract, so open that side of their profile */}
                <Link
                  to={`/profile/${r.reviewer.user_id}${r.reviewer.role === 'customer' ? '?as=client' : ''}`}
                  className="fw-medium text-dark text-decoration-none small"
                >
                  {r.reviewer.name}
                </Link>
                {r.job_title && <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>{r.job_title}</div>}
              </div>
            </div>
            <div className="text-end flex-shrink-0">
              <StarRating rating={r.rating} size="13px" />
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{formatDate(r.created_at)}</div>
            </div>
          </div>
          <p className="text-muted small mb-0 mt-2" style={{ whiteSpace: 'pre-line' }}>
            {r.comment || <span className="fst-italic">No written comment</span>}
          </p>
        </div>
      ))}

      {has_more && <p className="text-muted small text-center mt-3 mb-0">Showing the 50 most recent reviews.</p>}
    </>
  );
}

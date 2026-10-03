// MyProposals.jsx — Freelancer's own proposals, filterable by status.
// Lets a freelancer withdraw a pending proposal, and later restore
// (unwithdraw) it — either as-is or with an edited bid/cover letter.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProposals, withdrawProposal, unwithdrawProposal } from '../services/api';
import { getCached, setCached } from '../utils/cache';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';
import BackToTop from '../components/BackToTop';

const FILTERS = [
  { value: 'active', label: 'Active Proposals' },
  { value: 'past', label: 'Past Proposals' }
];

const isPast = (status) => ['completed', 'rejected', 'withdrawn', 'cancelled'].includes((status || '').toLowerCase());

const STATUS_STYLES = {
  pending: 'badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill',
  accepted: 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill',
  rejected: 'badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill',
  withdrawn: 'badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill',
};

function ProposalsSkeleton() {
  return (
    <div className="d-flex flex-column gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card shadow-sm border-0 p-4 bg-white">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="skeleton-box" style={{ width: "45%", height: 18 }} />
            <div className="skeleton-box rounded-pill" style={{ width: 85, height: 24 }} />
          </div>
          <div className="skeleton-box mb-3" style={{ width: "25%", height: 16 }} />
          <div className="skeleton-box mb-2" style={{ width: "100%", height: 12 }} />
          <div className="skeleton-box" style={{ width: "80%", height: 12 }} />
        </div>
      ))}
    </div>
  );
}

export default function MyProposals() {
  const cachedProposals = getCached('my_proposals');

  const [proposals, setProposals] = useState(cachedProposals || []);
  const [loading, setLoading] = useState(!cachedProposals);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState('');



  async function load(isForce = false) {
    const cached = getCached('my_proposals');
    if (!cached || isForce) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const res = await getMyProposals();
      const list = res.data || [];
      setProposals(list);
      setCached('my_proposals', list);
    } catch (err) {
      setLoadError(err.message || 'Could not load your proposals.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleWithdraw(proposalId) {
    if (!window.confirm('Withdraw this proposal? You can restore it later from this page.')) return;
    setActionError('');
    setActioningId(proposalId);
    try {
      await withdrawProposal(proposalId);
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not withdraw this proposal.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleUnwithdraw(proposalId, payload) {
    setActionError('');
    setActioningId(proposalId);
    try {
      await unwithdrawProposal(proposalId, payload);
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not restore this proposal.');
    } finally {
      setActioningId(null);
    }
  }

    const counts = {
    active: proposals.filter(p => !isPast(p.status)).length,
    past: proposals.filter(p => isPast(p.status)).length
  };

  const visibleProposals = proposals.filter((p) => filter === 'past' ? isPast(p.status) : !isPast(p.status));



  return (
    <>
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100, margin: "-1rem -1rem 1rem -1rem" }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}

      {/* Page Content Here */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Proposals</h1>
          <p className="page-subtitle">
            Track every bid you've sent, and manage the ones still in play.
          </p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          {/* Status filter tabs */}
          <div className="d-flex flex-wrap gap-2 mb-4">
            {FILTERS.map((f) => {
              const isActive = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`btn rounded-pill px-4 py-2 flex-shrink-0 fw-medium ${
                    isActive ? 'text-white border-0' : 'btn-outline-secondary'
                  }`}
                  style={isActive ? { backgroundColor: '#FF5A1E' } : {}}
                >
                  {f.label}
                  <span className="ms-2 small opacity-75">{counts[f.value]}</span>
                </button>
              );
            })}
          </div>

          {actionError && (
            <div className="alert alert-danger py-2 px-3 small rounded-3 mb-4">
              {actionError}
            </div>
          )}

          {loading && <ProposalsSkeleton />}

            {!loading && loadError && (
              <StateCard
                title={/expired|token/i.test(loadError) ? 'Session Expired' : "Couldn't load your proposals"}
                body={loadError}
                action={{
                  label: /expired|token/i.test(loadError) ? 'Log In Again' : 'Try again',
                  onClick: () => {
                    if (/expired|token/i.test(loadError)) {
                      localStorage.removeItem('token');
                      localStorage.removeItem('refreshToken');
                      localStorage.removeItem('user');
                      window.location.href = '/login?expired=1';
                    } else {
                      load();
                    }
                  },
                }}
              />
            )}

            {!loading && !loadError && visibleProposals.length === 0 && (
              <StateCard
                title={filter === 'all' ? 'No proposals yet' : `No ${filter} proposals`}
                body={filter === 'all' ? 'Browse open jobs and submit your first proposal.' : 'Nothing here right now.'}
              />
            )}

            {!loading && !loadError && visibleProposals.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {visibleProposals.map((p) => (
                  <ProposalRow
                    key={p.proposal_id}
                    proposal={p}
                    busy={actioningId === p.proposal_id}
                    onWithdraw={() => handleWithdraw(p.proposal_id)}
                    onUnwithdraw={(payload) => handleUnwithdraw(p.proposal_id, payload)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      
      <BackToTop />
    </>
  );
}

function ProposalRow({ proposal, busy, onWithdraw, onUnwithdraw }) {
  const [editing, setEditing] = useState(false);
  const [bidAmount, setBidAmount] = useState(proposal.bid_amount);
  const [coverLetter, setCoverLetter] = useState(proposal.cover_letter);
  const [editError, setEditError] = useState('');

  const jobIsOpen = proposal.jobs?.status === 'open';

  function startEdit() {
    setBidAmount(proposal.bid_amount);
    setCoverLetter(proposal.cover_letter);
    setEditError('');
    setEditing(true);
  }

  function handleResubmit() {
    const amount = Number(bidAmount);
    if (!bidAmount || Number.isNaN(amount) || amount <= 0) {
      setEditError('Enter a bid amount greater than 0.');
      return;
    }
    if (!coverLetter.trim() || coverLetter.trim().length < 20) {
      setEditError('Cover letter should be at least 20 characters.');
      return;
    }
    setEditError('');
    onUnwithdraw({ bid_amount: amount, cover_letter: coverLetter.trim() });
    setEditing(false);
  }

  return (
    <div className="card rounded-3 shadow-sm border-0">
      <div className="card-body p-0">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <Link
                to={`/jobs/${proposal.job_id}`}
                className="fw-bold fs-5 text-dark text-decoration-none"
              >
                {proposal.jobs?.title || 'Job Posting'}
              </Link>
              <StatusPill status={proposal.status} />
            </div>
            <p className="small text-muted mb-0 d-flex align-items-center gap-1">
              <i className="bi bi-clock"></i>
              Submitted {formatDate(proposal.submitted_at)}
            </p>
          </div>
          <p className="fs-5 fw-bold text-success mb-0">
            {formatCurrency(proposal.bid_amount, proposal.jobs?.currency)}
          </p>
        </div>

        {!editing && (
          <p className="text-muted small mb-0" style={{ whiteSpace: 'pre-line' }}>
            {proposal.cover_letter}
          </p>
        )}

        {/* Pending: can withdraw */}
        {proposal.status === 'pending' && (
          <div className="mt-4 pt-3 border-top d-flex gap-2">
            <button
              onClick={onWithdraw}
              disabled={busy}
              className="btn btn-outline-danger btn-sm rounded-3 px-3 py-2"
            >
              {busy ? 'Working...' : 'Withdraw'}
            </button>
          </div>
        )}

        {/* Withdrawn: can restore as-is, or edit and resubmit */}
        {proposal.status === 'withdrawn' && !jobIsOpen && (
          <div className="alert alert-secondary py-2 px-3 small rounded-3 mt-4 mb-0">
            This job is no longer open, so this proposal can't be restored.
          </div>
        )}

        {proposal.status === 'withdrawn' && jobIsOpen && !editing && (
          <div className="mt-4 pt-3 border-top d-flex gap-2">
            <button
              onClick={() => onUnwithdraw()}
              disabled={busy}
              className="btn btn-dark btn-sm rounded-3 px-3 py-2 fw-medium"
            >
              {busy ? 'Working...' : 'Restore proposal'}
            </button>
            <button
              onClick={startEdit}
              disabled={busy}
              className="btn btn-outline-dark btn-sm rounded-3 px-3 py-2 fw-medium"
            >
              Edit &amp; resubmit
            </button>
          </div>
        )}

        {proposal.status === 'withdrawn' && jobIsOpen && editing && (
          <div className="mt-4 pt-3 border-top">
            <div className="mb-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Your bid ({getCurrencySymbol(proposal.jobs?.currency)})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="form-control form-control-sm rounded-3"
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-medium text-muted mb-1">
                Cover letter
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={5}
                className="form-control form-control-sm rounded-3"
                style={{ resize: 'none' }}
              />
            </div>
            {editError && <p className="text-danger small mb-3">{editError}</p>}
            <div className="d-flex gap-2">
              <button
                onClick={handleResubmit}
                disabled={busy}
                className="btn btn-dark btn-sm rounded-3 px-3 py-2 fw-medium"
              >
                {busy ? 'Working...' : 'Resubmit'}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="btn btn-outline-secondary btn-sm rounded-3 px-3 py-2 fw-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const badgeClass = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className={badgeClass}>
      {status}
    </span>
  );
}

function StateCard({ title, body, action }) {
  return (
    <div className="card rounded-3 border-0 shadow-sm text-center">
      <div className="card-body p-5">
        <p className="fs-5 fw-medium mb-1">{title}</p>
        {body && <p className="text-muted small mb-0">{body}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="btn btn-outline-dark btn-sm rounded-3 mt-3 px-4"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}


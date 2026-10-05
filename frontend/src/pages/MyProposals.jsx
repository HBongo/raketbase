// MyProposals.jsx — Freelancer's own proposals, filterable by status.
// Withdraw & Edit works like on the job page: it withdraws the proposal and opens the job
// with the full form refilled to change and re-send. Hired proposals show their contract's
// progress (In progress, Completed, Refunded...) instead of a frozen "Accepted".
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMyProposals, withdrawProposal } from '../services/api';
import OffersList from '../components/OffersList';
import PageViewTabs from '../components/PageViewTabs';
import { getCached, setCached } from '../utils/cache';
import Money from '../components/Money';
import BackToTop from '../components/BackToTop';

import { useLive } from '../utils/useLive';
import ProposalFiles from '../components/ProposalFiles';
const FILTERS = [
  { value: 'active', label: 'Active Proposals' },
  { value: 'past', label: 'Past Proposals' }
];

// What a proposal's pill says. Hired proposals follow their contract.
function proposalState(p) {
  const status = (p.status || '').toLowerCase();
  if (status !== 'accepted' || !p.contract) return { key: status, label: status };
  switch (p.contract.status) {
    case 'submitted': return { key: 'review', label: 'Under review' };
    case 'disputed': return { key: 'disputed', label: 'Disputed' };
    case 'completed':
      return p.contract.released_amount != null
        ? { key: 'completed', label: 'Completed (split)' }
        : { key: 'completed', label: 'Completed' };
    case 'refunded': return { key: 'refunded', label: 'Refunded' };
    default: return { key: 'progress', label: 'In progress' };
  }
}

// Finished work (and declined / withdrawn bids) goes under Past
const isPast = (p) => ['completed', 'refunded', 'rejected', 'withdrawn', 'cancelled'].includes(proposalState(p).key);

const STATUS_STYLES = {
  pending: 'badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-pill',
  accepted: 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill',
  rejected: 'badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill',
  withdrawn: 'badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill',
  progress: 'badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill',
  review: 'badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 rounded-pill',
  disputed: 'badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill',
  completed: 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 rounded-pill',
  refunded: 'badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill',
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
  const navigate = useNavigate();
  const cachedProposals = getCached('my_proposals');
  // ?tab=offers shows direct offers from clients ("Hire Me") instead of proposals
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('tab') === 'offers' ? 'offers' : 'proposals';

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

  // Live: a proposal was accepted, declined, or its job closed
  useLive(['proposals'], () => load());

  // Same as Withdraw & Edit on the job page: withdraw, then open the job with the form refilled
  async function handleWithdrawAndEdit(proposal) {
    if (!window.confirm('Withdraw this proposal to edit it? Your previous answers will be filled in on the job page so you can change them and re-send.')) return;
    setActionError('');
    setActioningId(proposal.proposal_id);
    try {
      await withdrawProposal(proposal.proposal_id);
      navigate(`/jobs/${proposal.job_id}?edit=1`);
    } catch (err) {
      setActionError(err.message || 'Could not withdraw this proposal.');
      setActioningId(null);
    }
  }

    const counts = {
    active: proposals.filter(p => !isPast(p)).length,
    past: proposals.filter(p => isPast(p)).length
  };

  const visibleProposals = proposals.filter((p) => filter === 'past' ? isPast(p) : !isPast(p));



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

      <PageViewTabs
        value={view}
        onChange={(v) => setSearchParams(v === 'offers' ? { tab: 'offers' } : {})}
        tabs={[
          { id: 'proposals', label: 'My proposals', icon: 'bi-file-earmark-text' },
          { id: 'offers', label: 'Offers received', icon: 'bi-envelope-paper' },
        ]}
      />

      {view === 'offers' ? (
        <OffersList side="received" />
      ) : (
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
                    onWithdrawAndEdit={() => handleWithdrawAndEdit(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BackToTop />
    </>
  );
}

function ProposalRow({ proposal, busy, onWithdrawAndEdit }) {
  const navigate = useNavigate();
  const jobIsOpen = proposal.jobs?.status === 'open';

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
              <StatusPill proposal={proposal} />
            </div>
            <p className="small text-muted mb-0 d-flex align-items-center gap-1">
              <i className="bi bi-clock"></i>
              Submitted {formatDate(proposal.submitted_at)}
            </p>
          </div>
          <p className="fs-5 fw-bold text-success mb-0">
            <Money amount={proposal.bid_amount} currency={proposal.jobs?.currency} />
          </p>
        </div>

        {(
          <p className="text-muted small mb-0" style={{ whiteSpace: 'pre-line' }}>
            {proposal.cover_letter}
          </p>
        )}
        {proposal.files?.length > 0 && (
          <div className="mt-2">
            <ProposalFiles proposalId={proposal.proposal_id} files={proposal.files} />
          </div>
        )}

        {/* Pending: Withdraw & Edit, like on the job page */}
        {proposal.status === 'pending' && (
          <div className="mt-4 pt-3 border-top d-flex gap-2">
            <button
              onClick={onWithdrawAndEdit}
              disabled={busy}
              className="btn btn-outline-warning text-dark btn-sm rounded-3 px-3 py-2 fw-medium"
            >
              <i className="bi bi-pencil-square me-1"></i>{busy ? 'Working...' : 'Withdraw & Edit'}
            </button>
          </div>
        )}

        {/* Withdrawn: edit and re-send from the job page while it's still open */}
        {proposal.status === 'withdrawn' && !jobIsOpen && (
          <div className="alert alert-secondary py-2 px-3 small rounded-3 mt-4 mb-0">
            This job is no longer open, so this proposal can't be sent again.
          </div>
        )}
        {proposal.status === 'withdrawn' && jobIsOpen && (
          <div className="mt-4 pt-3 border-top d-flex gap-2">
            <button
              onClick={() => navigate(`/jobs/${proposal.job_id}?edit=1`)}
              className="btn btn-dark btn-sm rounded-3 px-3 py-2 fw-medium"
            >
              <i className="bi bi-send me-1"></i>Edit &amp; re-send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ proposal }) {
  const { key, label } = proposalState(proposal);
  const badgeClass = STATUS_STYLES[key] || STATUS_STYLES.pending;
  return (
    <span className={`${badgeClass} text-capitalize`}>
      {label}
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


import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getMyJobs, getJobProposals, acceptProposal, rejectProposal, switchRole, pauseJob, resumeJob, cancelJob } from '../services/api';
import { clearCached } from '../utils/cache';
import Money from '../components/Money';
import { showToast } from '../utils/toast';
import OffersList from '../components/OffersList';
import PageViewTabs from '../components/PageViewTabs';

export default function ClientJobView() {
  const { id } = useParams();
  return id ? <ProposalsForJob jobId={id} /> : <MyJobsList />;
}

function MyJobsList() {
  const navigate = useNavigate();
  // ?tab=offers shows direct offers sent from freelancers' profiles ("Hire Me")
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('tab') === 'offers' ? 'offers' : 'postings';
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const isCustomer = user?.active_role === 'customer';
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getMyJobs();
        if (!cancelled) setJobs(res.data || []);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load your job postings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [isCustomer]);

  if (!isCustomer) {
    return (
      <div className="row justify-content-center py-5">
        <div className="col-12 col-md-8 col-lg-6 text-center">
          <div className="card shadow-sm border-0 p-5 bg-white">
            <div
              className="d-inline-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 rounded-circle mb-3 mx-auto"
              style={{ width: '64px', height: '64px', fontSize: '1.75rem' }}
            >
              <i className="bi bi-briefcase"></i>
            </div>
            <h4 className="fw-bold mb-2">Customer Mode Required</h4>
            <p className="text-muted small mb-4 mx-auto" style={{ maxWidth: '380px' }}>
              You are currently in <strong>Freelancer Mode</strong>. Job postings and proposal management are reserved for clients.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSwitchingRole(true);
                    showToast('Switching to Customer Mode...', { loading: true, duration: 0 });
                    await switchRole('customer');
                    const updatedUser = { ...user, active_role: 'customer' };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    window.location.reload();
                  } catch (err) {
                    setSwitchingRole(false);
                    showToast(err.message || 'Failed to switch role', { type: 'error' });
                  }
                }}
                disabled={switchingRole}
                className="btn text-white fw-bold px-4 py-2 rounded-pill"
                style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
              >
                {switchingRole ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Switching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-repeat me-1"></i> Switch to Customer Mode
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/my-proposals')}
                className="btn btn-outline-secondary px-4 py-2 rounded-pill"
              >
                My Proposals
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">My job postings</h1>
          <p className="page-subtitle">Review proposals and choose who gets the work.</p>
        </div>
        <button
          onClick={() => navigate('/jobs/create')}
          className="btn btn-dark rounded-pill fw-medium px-4"
          style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
        >
          <i className="bi bi-plus-circle me-1"></i> Post a Job
        </button>
      </div>

      <PageViewTabs
        value={view}
        onChange={(v) => setSearchParams(v === 'offers' ? { tab: 'offers' } : {})}
        tabs={[
          { id: 'postings', label: 'My postings', icon: 'bi-briefcase' },
          { id: 'offers', label: 'Sent offers', icon: 'bi-send' },
        ]}
      />

      {view === 'offers' ? (
        <OffersList side="sent" />
      ) : (
      <>
      {loading && <StateCard title="Loading your postings..." />}

      {!loading && loadError && (
        <StateCard
          title={/expired|token/i.test(loadError) ? 'Session Expired' : "Couldn't load your postings"}
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
                window.location.reload();
              }
            },
          }}
        />
      )}

      {!loading && !loadError && jobs.length === 0 && (
        <StateCard
          title="You haven't posted a job yet"
          body="Post a job to start receiving proposals from freelancers."
          action={{ label: 'Post a Job', onClick: () => navigate('/jobs/create') }}
        />
      )}

      {!loading && !loadError && jobs.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {jobs.map((job) => (
            <div
              key={job.job_id}
              onClick={() => navigate(`/my-jobs/${job.job_id}`)}
              className="card shadow-sm border-0"
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body d-flex align-items-center justify-content-between gap-4">
                <div className="text-truncate">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <JobStatusBadge status={job.status} />
                    <span className="small text-muted">
                      Created {formatDate(job.created_at)}
                    </span>
                  </div>
                  <h5 className="card-title fw-bold text-truncate mb-1">{job.title}</h5>
                  <p className="small text-secondary text-truncate mb-0" style={{ maxWidth: '600px' }}>
                    {job.description}
                  </p>
                  {job.status === 'removed' && job.removal_reason && (
                    <p className="small text-danger text-truncate mb-0 mt-1" style={{ maxWidth: '600px' }}>
                      <i className="bi bi-shield-exclamation me-1"></i>Removed by admin: {job.removal_reason}
                    </p>
                  )}
                </div>

                <div className="text-end flex-shrink-0">
                  <p className="fs-5 fw-bold mb-0" style={{ color: '#FF5A1E' }}>
                    {job.budget ? <Money amount={job.budget} currency={job.currency} /> : '—'}
                  </p>
                  <p className="small text-muted mb-0">
                    {job.pending_count > 0 ? `${job.pending_count} pending` : 'proposals'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </>
  );
}

function ProposalsForJob({ jobId }) {
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getJobProposals(jobId);
      setJob(res.data.job);
      setProposals(res.data.proposals || []);
    } catch (err) {
      setLoadError(err.message || 'Could not load proposals for this job.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

    async function handleAccept(proposalId) {
    setActionError(null);
    setActioningId(proposalId);
    try {
      await acceptProposal(proposalId);
      showToast('Proposal accepted! A contract and chat were created. Use "Message" on their card to reach them.', { type: 'success', duration: 5000 });
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not accept this proposal.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(proposalId) {
    setActionError(null);
    setActioningId(proposalId);
    try {
      await rejectProposal(proposalId);
      showToast('Proposal rejected.', { type: 'success' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not reject this proposal.');
    } finally {
      setActioningId(null);
    }
  }

  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

    async function runLifecycleAction(action, successMessage) {
    setActionError(null);
    setLifecycleBusy(true);
    try {
      await action(jobId);
      setConfirmingCancel(false);
      showToast(successMessage, { type: 'success' });
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not update this job.');
    } finally {
      setLifecycleBusy(false);
    }
  }

  const jobIsOpen = job?.status === 'open';
  const jobIsPaused = job?.status === 'paused';
  // Pausing only stops new proposals; existing ones can still be accepted or rejected.
  const canManageProposals = jobIsOpen || jobIsPaused;
  const pendingCount = proposals.filter((p) => p.status === 'pending').length;

  return (
    <>
      <div className="col-12 mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/my-jobs')}>
          <i className="bi bi-arrow-left me-1"></i> Back to My Jobs
        </button>
      </div>

      <div className="col-12 col-xl-8 mx-auto">
        {loading && <StateCard title="Loading proposals..." />}

        {!loading && loadError && (
          <StateCard
            title={/expired|token/i.test(loadError) ? 'Session Expired' : "Couldn't load this job"}
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

        {!loading && !loadError && job && (
          <>
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-body p-4 d-flex flex-wrap align-items-start justify-content-between gap-3">
                <div>
                  <JobStatusBadge status={job.status} className="mb-2" />
                  <h2 className="h4 fw-bold mb-0">{job.title}</h2>
                </div>
                <div className="text-end">
                  <p className="small text-muted mb-1">Budget</p>
                  <p className="fs-5 fw-bold mb-0" style={{ color: '#FF5A1E' }}>
                    {job.budget ? <Money amount={job.budget} currency={job.currency} /> : '—'}
                  </p>
                </div>

                {canManageProposals && !confirmingCancel && (
                  <div className="w-100 d-flex flex-wrap gap-2 pt-3 border-top">
                    {jobIsOpen && (
                      <button
                        onClick={() => navigate(`/my-jobs/${jobId}/edit`)}
                        disabled={lifecycleBusy}
                        className="btn btn-outline-dark btn-sm fw-medium px-3"
                      >
                        <i className="bi bi-pencil me-1"></i> Edit
                      </button>
                    )}
                    {jobIsOpen && (
                      <button
                        onClick={() => runLifecycleAction(pauseJob, 'Job paused. It is now hidden from Explore.')}
                        disabled={lifecycleBusy}
                        className="btn btn-outline-secondary btn-sm fw-medium px-3"
                      >
                        <i className="bi bi-pause-circle me-1"></i> Pause
                      </button>
                    )}
                    {jobIsPaused && (
                      <button
                        onClick={() => runLifecycleAction(resumeJob, 'Job resumed. It is visible on Explore again.')}
                        disabled={lifecycleBusy}
                        className="btn btn-dark btn-sm fw-medium px-3"
                        style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
                      >
                        <i className="bi bi-play-circle me-1"></i> Resume
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmingCancel(true)}
                      disabled={lifecycleBusy}
                      className="btn btn-outline-danger btn-sm fw-medium px-3 ms-auto"
                    >
                      <i className="bi bi-x-circle me-1"></i> Cancel Job
                    </button>
                  </div>
                )}

                {canManageProposals && confirmingCancel && (
                  <div className="w-100 pt-3 border-top">
                    <p className="small fw-semibold mb-1">Cancel this job posting?</p>
                    <p className="small text-muted mb-3">
                      It will be removed from Explore for good
                      {pendingCount > 0
                        ? `, and ${pendingCount} pending ${pendingCount === 1 ? 'proposal' : 'proposals'} will be rejected`
                        : ''}
                      . This can't be undone.
                    </p>
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => runLifecycleAction(cancelJob, 'Job cancelled.')}
                        disabled={lifecycleBusy}
                        className="btn btn-danger btn-sm fw-medium px-3"
                      >
                        {lifecycleBusy ? 'Cancelling...' : 'Yes, cancel job'}
                      </button>
                      <button
                        onClick={() => setConfirmingCancel(false)}
                        disabled={lifecycleBusy}
                        className="btn btn-outline-secondary btn-sm fw-medium px-3"
                      >
                        Keep job
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {jobIsPaused && (
              <div className="alert alert-info py-2 small d-flex align-items-center" role="alert">
                <i className="bi bi-pause-circle-fill me-2"></i>
                This job is paused. It's hidden from Explore and isn't taking new proposals, but you can still accept or reject the ones below.
              </div>
            )}

            {job.status === 'removed' && (
              <div className="alert alert-danger py-2 small d-flex align-items-start" role="alert">
                <i className="bi bi-shield-exclamation me-2 mt-1"></i>
                <div>
                  <strong>This job was removed by an admin.</strong> It's hidden from Explore and any pending proposals were rejected.
                  {job.removal_reason && <div className="mt-1">Reason: {job.removal_reason}</div>}
                </div>
              </div>
            )}

            {!canManageProposals && job.status !== 'removed' && (
              <div className="alert alert-warning py-2 small d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                This job is {job.status}. Proposals can no longer be accepted or rejected.
              </div>
            )}

            {actionError && (
              <div className="alert alert-danger py-2 small d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-circle-fill me-2"></i>
                {actionError}
              </div>
            )}

            {proposals.length === 0 ? (
              <StateCard title="No proposals yet" body="Check back once freelancers start applying." />
            ) : (
              <div className="d-flex flex-column gap-3">
                {proposals.map((p) => (
                  <ProposalCard
                    key={p.proposal_id}
                    proposal={p}
                    jobIsOpen={canManageProposals}
                    currency={job.currency}
                    busy={actioningId === p.proposal_id}
                    onAccept={() => handleAccept(p.proposal_id)}
                    onReject={() => handleReject(p.proposal_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function ProposalCard({ proposal, jobIsOpen, busy, onAccept, onReject, currency }) {
  const freelancer = proposal.users;
  const name =
    [freelancer?.first_name, freelancer?.last_name].filter(Boolean).join(' ') ||
    freelancer?.email ||
    'Freelancer';
  const freelancerId = freelancer?.user_id || freelancer?.id;

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-4">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              {freelancerId ? (
                <Link to={`/profile/${freelancerId}`} className="text-decoration-none text-dark">
                  <h5 className="fw-bold mb-0 text-primary-hover">{name}</h5>
                </Link>
              ) : (
                <h5 className="fw-bold mb-0">{name}</h5>
              )}
              <StatusPill status={proposal.status} />
            </div>
            <p className="small text-muted mb-1 d-flex flex-wrap align-items-center gap-1">
              {proposal.freelancer_rating?.count > 0 ? (
                <span className="text-dark fw-semibold me-2" title="Average rating from clients">
                  <i className="bi bi-star-fill text-warning me-1"></i>
                  {proposal.freelancer_rating.average}
                  <span className="text-muted fw-normal ms-1">
                    ({proposal.freelancer_rating.count} {proposal.freelancer_rating.count === 1 ? 'review' : 'reviews'})
                  </span>
                </span>
              ) : (
                <span className="me-2"><i className="bi bi-star me-1"></i>No reviews yet</span>
              )}
              <i className="bi bi-clock"></i>
              Submitted {formatDate(proposal.submitted_at)}
            </p>
            {freelancer?.skills?.length > 0 && (
              <p className="small text-muted mb-0">{freelancer.skills.join(', ')}</p>
            )}
          </div>
          <h4 className="fw-bold mb-0 flex-shrink-0" style={{ color: '#FF5A1E' }}>
            <Money amount={proposal.bid_amount} currency={currency} />
          </h4>
        </div>

        <p className="small text-secondary" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
          {proposal.cover_letter}
        </p>

        {/* Milestones if present */}
        {proposal.proposal_milestones?.length > 0 && (
          <div className="mb-3 p-3 bg-light rounded border">
            <div className="small fw-bold text-secondary mb-2">Milestone Proposal:</div>
            <div className="d-flex flex-column gap-1">
              {proposal.proposal_milestones.map((pm) => (
                <div key={pm.proposal_milestone_id || pm.sequence} className="d-flex justify-content-between small">
                  <span>Stage {pm.sequence}: {pm.title}</span>
                  <span className="fw-semibold"><Money amount={pm.amount} currency={currency} /></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio & Sample Attachments */}
        {(proposal.portfolio_link || freelancer?.portfolio_url || proposal.attachment_url) && (
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3 pt-1">
            {(proposal.portfolio_link || freelancer?.portfolio_url) && (
              <a
                href={proposal.portfolio_link || freelancer.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-primary rounded-pill px-3 d-inline-flex align-items-center gap-1 text-decoration-none"
              >
                <i className="bi bi-briefcase"></i>
                <span>Portfolio Link</span>
                <i className="bi bi-box-arrow-up-right small ms-1" style={{ fontSize: '10px' }}></i>
              </a>
            )}

            {proposal.attachment_url && (
              <a
                href={proposal.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="btn btn-sm btn-outline-success rounded-pill px-3 d-inline-flex align-items-center gap-1 text-decoration-none"
              >
                <i className="bi bi-paperclip"></i>
                <span className="text-truncate" style={{ maxWidth: '220px' }}>
                  {proposal.attachment_name || 'Download Sample Work'}
                </span>
                <i className="bi bi-download small ms-1" style={{ fontSize: '10px' }}></i>
              </a>
            )}
          </div>
        )}

        {jobIsOpen && proposal.status === 'pending' && (
          <div className="d-flex gap-2 mt-4 pt-3 border-top">
            <button
              onClick={onAccept}
              disabled={busy}
              className="btn btn-dark btn-sm fw-medium px-4"
              style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
            >
              {busy ? 'Working...' : 'Accept'}
            </button>
            <button
              onClick={onReject}
              disabled={busy}
              className="btn btn-outline-secondary btn-sm fw-medium px-4"
            >
              {busy ? 'Working...' : 'Reject'}
            </button>
          </div>
        )}

        {/* Accepted: the contract chat is the place to talk to the hired freelancer */}
        {proposal.status === 'accepted' && (
          <div className="d-flex flex-wrap align-items-center gap-2 mt-4 pt-3 border-top">
            <Link
              to={proposal.conversation_id ? `/messages/${proposal.conversation_id}` : '/messages'}
              className="btn btn-sm fw-medium px-4 text-white"
              style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' }}
            >
              <i className="bi bi-chat-dots me-1"></i>Message {name}
            </Link>
            <Link to="/dashboard" className="btn btn-sm btn-outline-secondary fw-medium px-3">
              View contract
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  let badgeClass = 'bg-light border text-dark';
  let badgeStyle = {};

  if (status === 'accepted') {
    badgeStyle = { backgroundColor: 'rgba(255,90,30,0.1)', color: '#FF5A1E', borderColor: 'rgba(255,90,30,0.3)' };
    badgeClass = 'border';
  } else if (status === 'rejected') {
    badgeClass = 'bg-danger text-white border-danger';
  }

  return (
    <span className={`badge rounded-pill ${badgeClass}`} style={badgeStyle}>
      {status}
    </span>
  );
}

function JobStatusBadge({ status, className = '' }) {
  let badgeClass = 'bg-light text-dark border';
  let badgeStyle = {};

  if (status === 'open') {
    badgeClass = 'border';
    badgeStyle = { backgroundColor: 'rgba(255,90,30,0.1)', color: '#FF5A1E', borderColor: 'rgba(255,90,30,0.3)' };
  } else if (status === 'paused') {
    badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning';
  } else if (status === 'cancelled') {
    badgeClass = 'bg-light text-muted border';
  } else if (status === 'removed') {
    badgeClass = 'bg-danger-subtle text-danger-emphasis border border-danger';
  }

  return (
    <span className={`badge rounded-pill ${badgeClass} ${className}`} style={badgeStyle}>
      {status}
    </span>
  );
}

function StateCard({ title, body, action }) {
  return (
    <div className="card shadow-sm border-0 text-center py-5">
      <div className="card-body">
        <h5 className="fw-bold mb-2">{title}</h5>
        {body && <p className="text-muted small mb-4">{body}</p>}
        {action && (
          <button
            onClick={action.onClick}
            className="btn btn-outline-dark"
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




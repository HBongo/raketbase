// ClientJobView.jsx — Client Proposal Evaluation
// Two views in one file, switched by the presence of a route param:
// 1. /my-jobs        -> list of jobs the logged-in client has posted, with proposal counts
// 2. /my-jobs/:id     -> a single job's proposals, with Accept / Reject actions
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClockIcon } from '../components/Icons';
import { getMyJobs, getJobProposals, acceptProposal, rejectProposal } from '../services/api';
import { getCached, setCached } from '../utils/cache';

const STATUS_STYLES = {
  open: 'bg-accent/10 text-accent border-accent/30',
  assigned: 'bg-surface text-text-secondary border-border',
  completed: 'bg-surface text-text-secondary border-border',
};

export default function ClientJobView() {
  const { id } = useParams();
  return id ? <ProposalsForJob jobId={id} /> : <MyJobsList />;
}

function MyJobsList() {
  const navigate = useNavigate();
  const cachedJobs = getCached('client_my_jobs');
  const [jobs, setJobs] = useState(cachedJobs || []);
  const [loading, setLoading] = useState(!cachedJobs);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadJobs() {
      const cached = getCached('client_my_jobs');
      if (!cached) {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const res = await getMyJobs();
        const list = res.data || [];
        if (!cancelled) {
          setJobs(list);
          setCached('client_my_jobs', list);
        }
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
  }, []);

function MyJobsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-panel p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="skeleton-box rounded-full" style={{ width: 50, height: 18 }} />
              <div className="skeleton-box" style={{ width: 80, height: 14 }} />
            </div>
            <div className="skeleton-box mb-2" style={{ width: "60%", height: 20 }} />
            <div className="skeleton-box" style={{ width: "30%", height: 14 }} />
          </div>
          <div className="skeleton-box rounded-pill" style={{ width: 90, height: 32 }} />
        </div>
      ))}
    </div>
  );
}

  return (
    <div className="min-h-screen bg-bg text-text">
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">My job postings</h1>
            <p className="mt-1 text-sm text-text-secondary">Review proposals and choose who gets the work.</p>
          </div>
          <button
            onClick={() => navigate('/jobs/create')}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#1A1305] transition-colors hover:bg-accent-hover cursor-pointer"
          >
            + Post a Job
          </button>
        </div>

        {loading && <MyJobsSkeleton />}

        {!loading && loadError && (
          <StateCard
            title="Couldn't load your postings"
            body={loadError}
            action={{ label: 'Try again', onClick: () => window.location.reload() }}
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
          <div className="space-y-3">
            {jobs.map((job) => (
              <button
                key={job.job_id}
                onClick={() => navigate(`/my-jobs/${job.job_id}`)}
                className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-panel p-5 text-left transition-colors hover:border-accent/40 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        STATUS_STYLES[job.status] || STATUS_STYLES.open
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-[12px] text-text-secondary">
                      {job.categories?.category_name || 'Uncategorized'}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-lg font-medium">{job.title}</p>
                  <p className="mt-1 text-[13px] text-text-secondary">
                    ₱{job.budget ? Number(job.budget).toLocaleString() : '—'}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl font-semibold text-accent">{job.proposal_count}</p>
                  <p className="text-[11px] text-text-secondary">
                    {job.pending_count > 0 ? `${job.pending_count} pending` : 'proposals'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalsForJob({ jobId }) {
  const cachedJobData = getCached(`job_proposals_${jobId}`);

  const [job, setJob] = useState(cachedJobData?.job || null);
  const [proposals, setProposals] = useState(cachedJobData?.proposals || []);
  const [loading, setLoading] = useState(!cachedJobData);
  const [loadError, setLoadError] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [actionError, setActionError] = useState('');

  async function load(isForce = false) {
    const cached = getCached(`job_proposals_${jobId}`);
    if (!cached || isForce) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const res = await getJobProposals(jobId);
      setJob(res.data.job);
      setProposals(res.data.proposals || []);
      setCached(`job_proposals_${jobId}`, res.data);
    } catch (err) {
      setLoadError(err.message || 'Could not load proposals for this job.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    load();
  }, [jobId]);

  async function handleAccept(proposalId) {
    setActionError('');
    setActioningId(proposalId);
    try {
      await acceptProposal(proposalId);
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not accept this proposal.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleReject(proposalId) {
    setActionError('');
    setActioningId(proposalId);
    try {
      await rejectProposal(proposalId);
      await load();
    } catch (err) {
      setActionError(err.message || 'Could not reject this proposal.');
    } finally {
      setActioningId(null);
    }
  }

  const jobIsOpen = job?.status === 'open';

function ProposalsForJobSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-panel p-6">
        <div className="skeleton-box mb-3" style={{ width: "50%", height: 24 }} />
        <div className="skeleton-box mb-2" style={{ width: "100%", height: 14 }} />
        <div className="skeleton-box" style={{ width: "70%", height: 14 }} />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="skeleton-box rounded-full" style={{ width: 44, height: 44 }} />
              <div>
                <div className="skeleton-box mb-2" style={{ width: 120, height: 16 }} />
                <div className="skeleton-box" style={{ width: 80, height: 12 }} />
              </div>
            </div>
            <div className="skeleton-box" style={{ width: 70, height: 20 }} />
          </div>
          <div className="skeleton-box mb-2" style={{ width: "100%", height: 14 }} />
          <div className="skeleton-box" style={{ width: "85%", height: 14 }} />
        </div>
      ))}
    </div>
  );
}

  return (
    <div className="min-h-screen bg-bg text-text">
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100 }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        {loading && <ProposalsForJobSkeleton />}

        {!loading && loadError && (
          <StateCard
            title="Couldn't load this job"
            body={loadError}
            action={{ label: 'Try again', onClick: load }}
          />
        )}

        {!loading && !loadError && job && (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-panel p-5">
              <div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    STATUS_STYLES[job.status] || STATUS_STYLES.open
                  }`}
                >
                  {job.status}
                </span>
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{job.title}</h1>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-text-secondary">Budget</p>
                <p className="font-sans text-xl font-semibold text-accent">
                  ₱{job.budget ? Number(job.budget).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {!jobIsOpen && (
              <div className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
                This job is {job.status}. Proposals can no longer be accepted or rejected.
              </div>
            )}

            {actionError && (
              <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {actionError}
              </div>
            )}

            {proposals.length === 0 ? (
              <StateCard title="No proposals yet" body="Check back once freelancers start applying." />
            ) : (
              <div className="space-y-3">
                {proposals.map((p) => (
                  <ProposalCard
                    key={p.proposal_id}
                    proposal={p}
                    jobIsOpen={jobIsOpen}
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
    </div>
  );
}

function ProposalCard({ proposal, jobIsOpen, busy, onAccept, onReject }) {
  const freelancer = proposal.users;
  const name =
    [freelancer?.first_name, freelancer?.last_name].filter(Boolean).join(' ') ||
    freelancer?.email ||
    'Freelancer';

  return (
    <div className="rounded-lg border border-border bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-medium">{name}</p>
            <StatusPill status={proposal.status} />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-secondary">
            <ClockIcon className="h-3.5 w-3.5" />
            Submitted {formatDate(proposal.submitted_at)}
          </p>
          {freelancer?.skills?.length > 0 && (
            <p className="mt-1 text-[12px] text-text-secondary">{freelancer.skills.join(', ')}</p>
          )}
        </div>
        <p className="shrink-0 font-sans text-xl font-semibold text-accent">
          ₱{Number(proposal.bid_amount || 0).toLocaleString()}
        </p>
      </div>

      <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-text-secondary">
        {proposal.cover_letter}
      </p>

      {jobIsOpen && proposal.status === 'pending' && (
        <div className="mt-4 flex gap-2.5 border-t border-border pt-4">
          <button
            onClick={onAccept}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#1A1305] transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? 'Working...' : 'Accept'}
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-error/40 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? 'Working...' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    pending: 'bg-surface text-text-secondary border-border',
    accepted: 'bg-accent/10 text-accent border-accent/30',
    rejected: 'bg-error/10 text-error border-error/30',
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function StateCard({ title, body, action }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-10 text-center">
      <p className="font-display text-lg font-medium">{title}</p>
      {body && <p className="mt-1 text-sm text-text-secondary">{body}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent/40 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

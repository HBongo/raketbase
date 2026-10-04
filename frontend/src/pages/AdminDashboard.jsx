import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAdminAnalytics,
  getAdminUsers,
  updateUserStatus,
  listDisputes,
  resolveDispute,
  getAdminJobs,
  takedownJob,
} from '../services/api';
import Money from '../components/Money';

const MOCK_ANALYTICS = {
  total_users: 24,
  active_contracts: 6,
  platform_revenue: 128500,
  open_disputes: 2,
};

const MOCK_USERS = [
  { user_id: 'mock-1', email: 'juan.delacruz@example.com', first_name: 'Juan', last_name: 'Dela Cruz', role: 'customer', active_role: 'customer', status: 'active' },
  { user_id: 'mock-2', email: 'maria.santos@example.com', first_name: 'Maria', last_name: 'Santos', role: 'customer', active_role: 'freelancer', status: 'active' },
  { user_id: 'mock-3', email: 'pedro.reyes@example.com', first_name: 'Pedro', last_name: 'Reyes', role: 'customer', active_role: 'freelancer', status: 'suspended' },
];

const MOCK_DISPUTES = [
  {
    dispute_id: 'mock-d1',
    status: 'open',
    reason: '[Incomplete Work] Freelancer delivered only half of the agreed scope and stopped responding after the deadline passed.',
    created_at: new Date().toISOString(),
    contracts: { agreed_amount: 15000, jobs: { title: 'Logo & Brand Kit Design' } },
  },
  {
    dispute_id: 'mock-d2',
    status: 'under_review',
    reason: '[Non-Payment] Work was submitted and approved but escrow funds were never released.',
    created_at: new Date().toISOString(),
    contracts: { agreed_amount: 8000, jobs: { title: 'Landing Page Development' } },
  },
];

const STATUS_STYLES = {
  open: 'bg-danger text-white',
  under_review: 'bg-warning text-dark',
  resolved: 'bg-success text-white',
};

const JOB_STATUS_STYLES = {
  open: 'bg-success-subtle text-success-emphasis border border-success',
  paused: 'bg-warning-subtle text-warning-emphasis border border-warning',
  assigned: 'bg-primary-subtle text-primary-emphasis border border-primary',
  completed: 'bg-light text-dark border',
  cancelled: 'bg-light text-muted border',
  removed: 'bg-danger-subtle text-danger-emphasis border border-danger',
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [resolvingDispute, setResolvingDispute] = useState(null); // dispute object mid-resolution
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [jobs, setJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [takingDownJob, setTakingDownJob] = useState(null); // job object mid-takedown
  const [takedownReason, setTakedownReason] = useState('');

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const [analyticsRes, disputesRes, usersRes, jobsRes] = await Promise.all([
        getAdminAnalytics(),
        listDisputes(),
        getAdminUsers(),
        getAdminJobs(),
      ]);

      setAnalytics(analyticsRes.data);
      setDisputes(disputesRes.data || []);
      setUsers(usersRes.data || []);
      setJobs(jobsRes.data || []);
      setUsingMockData(false);
    } catch (err) {
      console.warn('Admin data fetch failed, showing mock data:', err.message);
      setAnalytics(MOCK_ANALYTICS);
      setDisputes(MOCK_DISPUTES);
      setUsers(MOCK_USERS);
      setJobs([]);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleResolve(resolution) {
    if (!resolvingDispute) return;
    setActionError('');
    setActionSuccess('');
    setActioningId(resolvingDispute.dispute_id);

    if (usingMockData) {
      setDisputes((prev) =>
        prev.map((d) =>
          d.dispute_id === resolvingDispute.dispute_id ? { ...d, status: 'resolved' } : d
        )
      );
      setActionSuccess('(Mock) Dispute marked as resolved.');
      setResolvingDispute(null);
      setResolutionNotes('');
      setActioningId(null);
      return;
    }

    try {
      await resolveDispute(resolvingDispute.dispute_id, { resolution, notes: resolutionNotes });
      setActionSuccess('Dispute resolved successfully.');
      setResolvingDispute(null);
      setResolutionNotes('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to resolve dispute.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleToggleUserStatus(targetUser) {
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    setActionError('');
    setActionSuccess('');
    setActioningId(targetUser.user_id);

    if (usingMockData) {
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, status: nextStatus } : u))
      );
      setActionSuccess(`(Mock) User marked as ${nextStatus}.`);
      setActioningId(null);
      return;
    }

    try {
      await updateUserStatus(targetUser.user_id, nextStatus);
      setActionSuccess(`User ${targetUser.email} is now ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to update user status.');
    } finally {
      setActioningId(null);
    }
  }

  function closeTakedownModal() {
    setTakingDownJob(null);
    setTakedownReason('');
  }

  async function handleTakedown() {
    if (!takingDownJob) return;
    setActionError('');
    setActionSuccess('');
    setActioningId(takingDownJob.job_id);

    try {
      await takedownJob(takingDownJob.job_id, takedownReason.trim());
      setActionSuccess(`"${takingDownJob.title}" was taken down.`);
      closeTakedownModal();
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to take down this job.');
      closeTakedownModal();
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <p className="text-muted">Loading platform metrics...</p>
      </div>
    );
  }

  const openDisputes = disputes.filter((d) => d.status !== 'resolved');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

  const jobQuery = jobSearch.trim().toLowerCase();
  const filteredJobs = jobs.filter((j) => {
    if (jobStatusFilter !== 'all' && j.status !== jobStatusFilter) return false;
    if (!jobQuery) return true;
    const clientName = [j.users?.first_name, j.users?.last_name].filter(Boolean).join(' ');
    return [j.title, clientName, j.users?.email, j.categories?.category_name]
      .some((field) => field && field.toLowerCase().includes(jobQuery));
  });

  // Every contract gets a chat when its proposal is accepted; older contracts may not have one.
  const resolvingConversationId = resolvingDispute?.contracts?.conversations?.conversation_id;

  return (
    <>
        <div className="row g-4 mb-4">
          <div className="col-12">
            
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 border-bottom pb-3">
              <div>
                <h2 className="fw-bold mb-1">Admin Dashboard</h2>
                <p className="text-muted small mb-0">
                  Platform metrics, dispute resolution, job moderation, and user management.
                </p>
              </div>
              <span className="badge bg-light border text-dark rounded-pill py-2 px-3 text-uppercase tracking-wider">
                {user.role || 'Admin'} access
              </span>
            </div>

            {/* Mock data banner */}
            {usingMockData && (
              <div className="alert alert-warning small d-flex align-items-center" role="alert">
                <i className="bi bi-info-circle-fill me-2"></i>
                <div>
                  Showing sample data — the backend or database isn't reachable yet. Actions here are simulated locally and won't persist.
                </div>
              </div>
            )}

            {/* Feedback toasts */}
            {actionSuccess && (
              <div className="alert alert-success alert-dismissible fade show small" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                {actionSuccess}
                <button type="button" className="btn-close" onClick={() => setActionSuccess('')} aria-label="Close"></button>
              </div>
            )}
            {actionError && (
              <div className="alert alert-danger alert-dismissible fade show small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {actionError}
                <button type="button" className="btn-close" onClick={() => setActionError('')} aria-label="Close"></button>
              </div>
            )}

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-5">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Total Users</h6>
                    <h3 className="fw-bold mb-1">{analytics.total_users}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Registered accounts</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Active Contracts</h6>
                    <h3 className="fw-bold mb-1 text-warning">{analytics.active_contracts}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>In progress or submitted</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Platform Revenue</h6>
                    <h3 className="fw-bold mb-1 text-success">
                      <Money amount={Number(analytics.platform_revenue) || 0} currency="PHP" />
                    </h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>From completed contracts</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Open Disputes</h6>
                    <h3 className="fw-bold mb-1 text-danger">{analytics.open_disputes}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Needing review</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Disputes Panel */}
            <div className="card shadow-sm mb-5">
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold fs-6">Dispute Resolution</h5>
                <small className="text-muted d-none d-sm-inline">
                  {openDisputes.length} open · {resolvedDisputes.length} resolved
                </small>
              </div>

              {disputes.length === 0 ? (
                <div className="card-body text-center py-5">
                  <h6 className="fw-bold mb-1">No disputes filed</h6>
                  <p className="text-muted small mb-0">All contracts are running smoothly.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {disputes.map((d) => (
                    <div key={d.dispute_id} className="list-group-item py-4 px-4">
                      <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                        <div>
                          <h6 className="fw-bold mb-0">
                            {d.contracts?.jobs?.title || 'Contract dispute'}
                          </h6>
                          <p className="text-muted mt-1 mb-0" style={{ fontSize: '12px' }}>
                            <Money amount={d.contracts?.agreed_amount} currency={d.contracts?.jobs?.currency} /> in escrow ·{' '}
                            {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`badge rounded-pill fw-medium text-uppercase ${
                            STATUS_STYLES[d.status] || STATUS_STYLES.open
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-muted small mb-3">{d.reason}</p>
                      {d.resolution_notes && (
                        <p className="text-success small mb-3"><strong>Resolution:</strong> {d.resolution_notes}</p>
                      )}
                      {d.status !== 'resolved' && (
                        <button
                          onClick={() => setResolvingDispute(d)}
                          className="btn btn-sm btn-dark fw-medium mt-2"
                        >
                          Review & Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Job Moderation Table */}
            <div className="card shadow-sm mb-5">
              <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
                <h5 className="mb-0 fw-bold fs-6">Job Moderation</h5>
                <div className="d-flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="form-control form-control-sm"
                    style={{ width: '220px' }}
                    placeholder="Search title, client, category..."
                    aria-label="Search jobs"
                  />
                  <select
                    value={jobStatusFilter}
                    onChange={(e) => setJobStatusFilter(e.target.value)}
                    className="form-select form-select-sm text-capitalize"
                    style={{ width: '140px' }}
                    aria-label="Filter jobs by status"
                  >
                    <option value="all">All statuses</option>
                    {Object.keys(JOB_STATUS_STYLES).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="card-body text-center py-5">
                  <h6 className="fw-bold mb-1">{jobs.length === 0 ? 'No job postings yet' : 'No jobs match these filters'}</h6>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Job</th>
                        <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Client</th>
                        <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Status</th>
                        <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Pending</th>
                        <th className="text-muted text-uppercase fw-medium text-end" style={{ fontSize: '12px', padding: '12px 16px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((j) => (
                        <tr key={j.job_id}>
                          <td style={{ padding: '12px 16px', fontSize: '14px', maxWidth: '320px' }}>
                            <Link to={`/jobs/${j.job_id}`} className="fw-medium text-decoration-none d-block text-truncate">
                              {j.title}
                            </Link>
                            <small className="text-muted" style={{ fontSize: '12px' }}>
                              {j.categories?.category_name || 'Uncategorized'} · <Money amount={j.budget} currency={j.currency} /> ·{' '}
                              {new Date(j.created_at).toLocaleDateString()}
                            </small>
                            {j.status === 'removed' && j.removal_reason && (
                              <small className="d-block text-danger" style={{ fontSize: '12px' }}>
                                Removed: {j.removal_reason}
                              </small>
                            )}
                          </td>
                          <td className="text-muted" style={{ padding: '12px 16px', fontSize: '14px' }}>
                            {[j.users?.first_name, j.users?.last_name].filter(Boolean).join(' ') || j.users?.email || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              className={`badge rounded-pill fw-medium text-uppercase ${JOB_STATUS_STYLES[j.status] || 'bg-light text-dark border'}`}
                              style={{ fontSize: '11px' }}
                            >
                              {j.status}
                            </span>
                          </td>
                          <td className="text-muted" style={{ padding: '12px 16px', fontSize: '14px' }}>{j.pending_count}</td>
                          <td className="text-end" style={{ padding: '12px 16px' }}>
                            {(j.status === 'open' || j.status === 'paused') && (
                              <button
                                onClick={() => setTakingDownJob(j)}
                                disabled={actioningId === j.job_id}
                                className="btn btn-sm btn-outline-danger fw-medium"
                                style={{ fontSize: '12px' }}
                              >
                                Take down
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* User Management Table */}
            <div className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold fs-6">User Management</h5>
                <small className="text-muted d-none d-sm-inline">{users.length} accounts</small>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Name</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Email</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Role</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Status</th>
                      <th className="text-muted text-uppercase fw-medium text-end" style={{ fontSize: '12px', padding: '12px 16px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id}>
                        <td className="fw-medium" style={{ padding: '12px 16px', fontSize: '14px' }}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="text-muted" style={{ padding: '12px 16px', fontSize: '14px' }}>{u.email}</td>
                        <td className="text-muted text-capitalize" style={{ padding: '12px 16px', fontSize: '14px' }}>
                          {u.role}
                          {u.role === 'customer' && u.active_role ? ` (${u.active_role})` : ''}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className={`badge rounded-pill fw-medium text-uppercase ${
                              u.status === 'suspended'
                                ? 'bg-danger text-white'
                                : 'bg-success text-white'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="text-end" style={{ padding: '12px 16px' }}>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={actioningId === u.user_id}
                              className="btn btn-sm btn-outline-secondary fw-medium"
                              style={{ fontSize: '12px' }}
                            >
                              {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Resolve Dispute Modal */}
        {resolvingDispute && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Resolve Dispute</h5>
                  <button type="button" className="btn-close" onClick={() => { setResolvingDispute(null); setResolutionNotes(''); }}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-3">
                    {resolvingDispute.contracts?.jobs?.title} — <Money amount={resolvingDispute.contracts?.agreed_amount} currency={resolvingDispute.contracts?.jobs?.currency} /> in escrow
                  </p>

                  <p className="small mb-2">{resolvingDispute.reason}</p>
                  {resolvingConversationId ? (
                    <Link
                      to={`/messages/${resolvingConversationId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-secondary fw-medium mb-4"
                    >
                      <i className="bi bi-chat-dots me-1"></i> Open contract chat
                      <i className="bi bi-box-arrow-up-right ms-1" style={{ fontSize: '11px' }}></i>
                    </Link>
                  ) : (
                    <p className="text-muted small mb-4">This contract has no chat history.</p>
                  )}

                  <div className="mb-4">
                    <label className="form-label small fw-medium text-muted mb-2">
                      Resolution notes (optional)
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="form-control"
                      placeholder="Explain the decision..."
                    />
                    <div className="form-text" style={{ fontSize: '11px' }}>
                      The outcome and these notes are posted to the contract chat, so both parties will see them.
                    </div>
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      onClick={() => handleResolve('release_freelancer')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-success fw-medium"
                    >
                      Release to Freelancer
                    </button>
                    <button
                      onClick={() => handleResolve('refund_client')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-warning fw-medium"
                      style={{ backgroundColor: '#FF5A1E', color: 'white', borderColor: '#FF5A1E' }}
                    >
                      Refund Client
                    </button>
                    <button
                      onClick={() => handleResolve('split')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-outline-dark fw-medium"
                    >
                      Split Funds
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0 justify-content-center">
                  <button
                    onClick={() => { setResolvingDispute(null); setResolutionNotes(''); }}
                    className="btn btn-link text-muted text-decoration-none small"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Take Down Job Modal */}
        {takingDownJob && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Take Down Job</h5>
                  <button type="button" className="btn-close" onClick={closeTakedownModal}></button>
                </div>
                <div className="modal-body">
                  <p className="fw-medium mb-1">{takingDownJob.title}</p>
                  <p className="text-muted small mb-4">
                    The job will be hidden from Explore
                    {takingDownJob.pending_count > 0
                      ? ` and ${takingDownJob.pending_count} pending ${takingDownJob.pending_count === 1 ? 'proposal' : 'proposals'} will be rejected`
                      : ''}
                    . This can't be undone.
                  </p>

                  <label className="form-label small fw-medium text-muted mb-2" htmlFor="takedownReason">
                    Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="takedownReason"
                    value={takedownReason}
                    onChange={(e) => setTakedownReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="form-control"
                    placeholder="e.g. Asks freelancers to pay a registration fee before starting."
                  />
                  <div className="form-text" style={{ fontSize: '11px' }}>
                    The client will see this reason on their posting. Minimum 10 characters.
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button onClick={closeTakedownModal} className="btn btn-link text-muted text-decoration-none small">
                    Cancel
                  </button>
                  <button
                    onClick={handleTakedown}
                    disabled={takedownReason.trim().length < 10 || actioningId === takingDownJob.job_id}
                    className="btn btn-danger fw-medium"
                  >
                    {actioningId === takingDownJob.job_id ? 'Taking down...' : 'Take down job'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
}



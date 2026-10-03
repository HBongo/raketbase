// Dashboard.jsx — Contracts, Escrow & Proposals Tracker (Member 4 — Part 3)
// Features:
// 1. Shared Navbar with navigable logo and user profile dropdown
// 2. Metrics summary cards (Active Contracts, Escrow / Earnings, Completed, Proposals)
// 3. Contracts & Escrow management:
//    - View active, submitted, and completed contracts with partner info
//    - Freelancer: "Submit Work" deliverable action (transitions 'active' -> 'submitted')
//    - Client: "Approve & Release Funds" escrow release action (transitions 'submitted'/'active' -> 'completed')
// 4. Proposals tracking table with status badges
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getMyProposals,
  getMyJobs,
  getContracts,
  submitContractWork,
  completeContract,
  submitMilestoneWork,
  approveMilestoneWork,
  switchRole,
} from '../services/api';
import { getCached, setCached } from '../utils/cache';
import { formatCurrency } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();

  const cachedProps = getCached('dashboard_proposals');
  const cachedContracts = getCached('dashboard_contracts');
  const cachedJobs = getCached('dashboard_client_jobs');

  const user = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u.user_id && !u.id) u.id = u.user_id;
      if (u.id && !u.user_id) u.user_id = u.id;
      return u;
    } catch {
      return {};
    }
  })();

  const isCustomer = user.active_role === 'customer';

  const [loading, setLoading] = useState(
    isCustomer ? (!cachedJobs || !cachedContracts) : (!cachedProps || !cachedContracts)
  );
  const [proposals, setProposals] = useState(cachedProps || []);
  const [clientJobs, setClientJobs] = useState(cachedJobs || []);
  const [contracts, setContracts] = useState(cachedContracts || []);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [proposalTab, setProposalTab] = useState('active');

  // Phase 1 Submission Modal state
  const [submitModalContract, setSubmitModalContract] = useState(null);
  const [submitModalMilestone, setSubmitModalMilestone] = useState(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 1 Client Deliverable Review & Escrow Release Modal state
  const [reviewModalContract, setReviewModalContract] = useState(null);
  const [reviewModalMilestone, setReviewModalMilestone] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Milestone stages accordion state
  const [expandedContractId, setExpandedContractId] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const hasCache = isCustomer
      ? (getCached('dashboard_client_jobs') && getCached('dashboard_contracts'))
      : (getCached('dashboard_proposals') && getCached('dashboard_contracts'));
    if (!hasCache || isRefresh) {
      setLoading(true);
    }

    try {
      const [mainRes, contractRes] = await Promise.allSettled([
        isCustomer ? getMyJobs() : getMyProposals(),
        getContracts(),
      ]);

      if (mainRes.status === 'fulfilled') {
        const val = mainRes.value;
        const normalized = Array.isArray(val) ? val : val.data || [];
        if (isCustomer) {
          setClientJobs(normalized);
          setCached('dashboard_client_jobs', normalized);
        } else {
          setProposals(normalized);
          setCached('dashboard_proposals', normalized);
        }
      }

      if (contractRes.status === 'fulfilled') {
        const cData = contractRes.value;
        const normalized = Array.isArray(cData) ? cData : cData.data || [];
        setContracts(normalized);
        setCached('dashboard_contracts', normalized);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, isCustomer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal for submitting deliverables (either whole fixed contract or milestone stage)
  function openSubmitModal(contract, milestone = null) {
    setSubmitModalContract(contract);
    setSubmitModalMilestone(milestone);
    setDeliverableUrl(milestone?.deliverable_url || contract?.deliverable_url || '');
    setDeliverableNotes(milestone?.deliverable_notes || contract?.deliverable_notes || '');
    setSubmitError('');
  }

  function closeSubmitModal() {
    setSubmitModalContract(null);
    setSubmitModalMilestone(null);
    setDeliverableUrl('');
    setDeliverableNotes('');
    setSubmitError('');
    setIsSubmitting(false);
  }

  // Handle submitting work with URL and notes
  async function handleConfirmSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const url = (deliverableUrl || '').trim();
    if (!url) {
      setSubmitError('Please provide a valid deliverable link.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setSubmitError('Deliverable link must start with http:// or https://');
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      if (submitModalMilestone) {
        await submitMilestoneWork(submitModalContract.contract_id, submitModalMilestone.milestone_id, {
          deliverable_url: url,
          deliverable_notes: deliverableNotes.trim(),
        });
        setActionSuccess(`Stage "${submitModalMilestone.title}" submitted for client review! Chat notification sent.`);
      } else {
        await submitContractWork(submitModalContract.contract_id, {
          deliverable_url: url,
          deliverable_notes: deliverableNotes.trim(),
        });
        setActionSuccess('Project deliverables submitted for review! Chat notification sent to the client.');
      }
      closeSubmitModal();
      await loadData(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit work. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Open client review / counterparty deliverable modal
  function openReviewModal(contract, milestone = null) {
    setReviewModalContract(contract);
    setReviewModalMilestone(milestone);
    setReviewError('');
  }

  function closeReviewModal() {
    setReviewModalContract(null);
    setReviewModalMilestone(null);
    setReviewError('');
    setIsApproving(false);
  }

  // Client approves deliverables and releases escrow funds
  async function handleConfirmApprove() {
    if (!reviewModalContract) return;
    setReviewError('');
    setIsApproving(true);
    try {
      if (user.active_role !== 'customer') {
        try {
          await switchRole('customer');
          const updatedUser = { ...user, active_role: 'customer' };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
          console.warn('Auto role switch failed:', e);
        }
      }
      const contractCurrency = reviewModalContract?.jobs?.currency || 'PHP';
      if (reviewModalMilestone) {
        const rawAmount = reviewModalMilestone.amount || 0;
        await approveMilestoneWork(reviewModalContract.contract_id, reviewModalMilestone.milestone_id);
        setActionSuccess(`Milestone "${reviewModalMilestone.title}" approved! ${formatCurrency(rawAmount, contractCurrency)} escrow released.`);
      } else {
        const rawAmount = reviewModalContract.agreed_amount || 0;
        await completeContract(reviewModalContract.contract_id);
        setActionSuccess(`Escrow payment of ${formatCurrency(rawAmount, contractCurrency)} released successfully! Contract marked as completed.`);
      }
      closeReviewModal();
      await loadData(true);
    } catch (err) {
      setReviewError(err.message || 'Failed to release escrow funds. Please try again.');
    } finally {
      setIsApproving(false);
    }
  }

  

  // Summary metrics calculation
  const activeContracts = contracts.filter((c) => c.status === 'active' || c.status === 'submitted');
  const totalAgreedEscrow = contracts.reduce((sum, c) => sum + Number(c.agreed_amount || 0), 0);
  const pendingProposalsCount = isCustomer
    ? clientJobs.reduce((sum, j) => sum + (j.pending_count || 0), 0)
    : proposals.filter((p) => p.status === 'pending').length;

  return (
    <>
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100, margin: "-1rem -1rem 1rem -1rem" }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Manage your active contracts, escrow funds, and job applications.</p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12">
          {actionSuccess && (
            <div className="alert alert-success alert-dismissible fade show border-0 bg-success text-white" role="alert">
              <i className="bi bi-check-circle me-2"></i>{actionSuccess}
              <button type="button" className="btn-close btn-close-white" onClick={() => setActionSuccess('')}></button>
            </div>
          )}
          {actionError && (
            <div className="alert alert-danger alert-dismissible fade show border-0 bg-danger text-white" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>{actionError}
              <button type="button" className="btn-close btn-close-white" onClick={() => setActionError('')}></button>
            </div>
          )}
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card alert-green-card h-100">
                <div className="position-relative z-index-2">
                  <span className="alert-green-badge">Welcome</span>
                  <div className="alert-green-text mt-3" style={{ fontSize: '1.2rem' }}>Hello, {user.first_name || 'User'}!</div>
                  <div className="mt-2 text-white">
                    {loading ? (
                      <span className="skeleton-box bg-white bg-opacity-25" style={{ width: 160, height: 16 }} />
                    ) : isCustomer ? (
                      `You have ${pendingProposalsCount} pending ${pendingProposalsCount === 1 ? 'proposal' : 'proposals'} across your job postings.`
                    ) : (
                      `You have ${pendingProposalsCount} pending ${pendingProposalsCount === 1 ? 'proposal' : 'proposals'}.`
                    )}
                  </div>
                </div>
                <img src="/racketbaseSVG.svg" className="alert-green-bg-shape rocket-logo" alt="Raketbase Logo" />
              </div>
            </div>

            <div className="col-md-4">
              <div className="card card-stat d-flex flex-column justify-content-between h-100">
                <div>
                  <div className="card-header">
                    <h2 className="card-title" style={{ fontSize: "1.2rem" }}>Active Contracts</h2>
                  </div>
                  <div className="stat-value">
                    {loading ? <div className="skeleton-box mt-1" style={{ width: 60, height: 32 }} /> : activeContracts.length}
                  </div>
                  <div className="trend-badge trend-up">
                    <span>In progress or submitted</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card card-stat d-flex flex-column justify-content-between h-100">
                <div>
                  <div className="card-header">
                    <h2 className="card-title" style={{ fontSize: "1.2rem" }}>{user.active_role === 'customer' ? 'Total Escrow Funded' : 'Total Contract Value'}</h2>
                  </div>
                  <div className="stat-value">
                    {loading ? <div className="skeleton-box mt-1" style={{ width: 120, height: 32 }} /> : formatCurrency(totalAgreedEscrow, 'PHP')}
                  </div>
                  <div className="trend-badge trend-up">
                    <i className="bi bi-shield-check"></i>
                    <span>Secured via Supabase</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-xl-8 col-lg-8">
          <div className="card mb-0 h-100">
            <div className="card-header mb-2 d-flex justify-content-between align-items-center">
              <h2 className="card-title mb-0">Contracts & Escrow</h2>
              <span className="badge bg-light text-dark border">
                {contracts.length} {contracts.length === 1 ? 'Contract' : 'Contracts'}
              </span>
            </div>
            {loading ? (
              <div className="p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="d-flex align-items-center justify-content-between py-3 border-bottom">
                    <div className="d-flex flex-column gap-2" style={{ width: "35%" }}>
                      <div className="skeleton-box" style={{ width: "85%", height: 15 }} />
                      <div className="skeleton-box" style={{ width: "45%", height: 11 }} />
                    </div>
                    <div className="skeleton-box" style={{ width: "20%", height: 14 }} />
                    <div className="skeleton-box" style={{ width: "15%", height: 15 }} />
                    <div className="skeleton-box rounded-pill" style={{ width: 80, height: 26 }} />
                  </div>
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <div className="text-center p-5 text-muted">No contracts yet.</div>
            ) : (
              <div className="table-responsive p-3 pt-0">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Job / Contract</th>
                      <th style={{ width: '22%' }}>Counterparty</th>
                      <th style={{ width: '16%' }}>Escrow Amount</th>
                      <th style={{ width: '16%' }}>Status</th>
                      <th className="text-end" style={{ width: '16%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {contracts.map((c) => {
                      const currentUserId = user.user_id || user.id;
                      const isClient = currentUserId === c.client_id;
                      const partner = isClient ? c.freelancer : c.client;
                      const partnerRole = isClient ? 'Freelancer' : 'customer';
                      const partnerName = partner ? `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.email : 'Participant';
                      const isMilestoneContract = Array.isArray(c.milestones) && c.milestones.length > 0;
                      const isExpanded = expandedContractId === c.contract_id;

                      const activeMilestone = isMilestoneContract
                        ? c.milestones.find((m) => m.status === 'active')
                        : null;
                      const submittedMilestone = isMilestoneContract
                        ? c.milestones.find((m) => m.status === 'submitted')
                        : null;
                      const completedStagesCount = isMilestoneContract
                        ? c.milestones.filter((m) => m.status === 'completed').length
                        : 0;

                      return (
                        <tr key={c.contract_id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              {c.job_id ? (
                                <Link
                                  to={`/jobs/${c.job_id}`}
                                  className="fw-semibold text-dark text-decoration-none"
                                  style={{ transition: 'color 0.15s' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#FF5A1E')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '')}
                                  title="View original job post"
                                >
                                  {c.jobs?.title || 'Job Contract'}
                                </Link>
                              ) : (
                                <span className="fw-semibold text-dark">{c.jobs?.title || 'Job Contract'}</span>
                              )}
                              {isMilestoneContract && (
                                <span className="badge bg-light text-primary border" style={{ fontSize: '0.75rem' }}>
                                  {completedStagesCount}/{c.milestones.length} {c.milestones.length === 1 ? 'Stage' : 'Stages'}
                                </span>
                              )}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1">
                              <span className="small text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                              {isMilestoneContract && (
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0 text-decoration-none small text-secondary"
                                  onClick={() => setExpandedContractId(isExpanded ? null : c.contract_id)}
                                >
                                  <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} me-1`}></i>
                                  {isExpanded ? 'Hide Stages' : 'View Stages'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="pe-2">
                            <div className="d-flex align-items-center gap-2">
                              <div className="avatar-placeholder rounded-circle bg-light border d-flex align-items-center justify-content-center text-secondary fw-bold flex-shrink-0" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                {(partnerName[0] || 'U').toUpperCase()}
                              </div>
                              <div className="text-truncate" style={{ maxWidth: '160px' }}>
                                <div className="fw-medium text-dark text-truncate">{partnerName}</div>
                                <div className="small text-muted" style={{ fontSize: '0.75rem' }}>{partnerRole}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2">
                            <div className="fw-bold text-success">{formatCurrency(c.agreed_amount, c.jobs?.currency)}</div>
                          </td>
                          <td>
                            {isMilestoneContract ? (
                              <span
                                className={`badge rounded-pill px-3 py-2 fw-medium ${
                                  c.status === 'completed'
                                    ? 'bg-success text-white'
                                    : submittedMilestone
                                    ? 'bg-warning text-dark'
                                    : 'bg-info text-dark'
                                }`}
                                style={{ fontSize: '0.85rem' }}
                              >
                                {c.status === 'completed'
                                  ? 'All Completed'
                                  : submittedMilestone
                                  ? `Stage ${submittedMilestone.sequence} Under Review`
                                  : activeMilestone
                                  ? `Stage ${activeMilestone.sequence} Active`
                                  : c.status}
                              </span>
                            ) : (
                              <span
                                className={`badge rounded-pill px-3 py-2 fw-medium ${
                                  c.status === 'completed'
                                    ? 'bg-success text-white'
                                    : c.status === 'submitted'
                                    ? 'bg-warning text-dark'
                                    : 'bg-info text-dark'
                                }`}
                                style={{ fontSize: '0.85rem' }}
                              >
                                {c.status === 'submitted' ? 'Under Review' : c.status}
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex align-items-center gap-2">
                              {/* Milestone Contract Actions */}
                              {isMilestoneContract ? (
                                <>
                                  {!isClient && activeMilestone && (
                                    <button
                                      className="btn btn-sm btn-primary rounded-pill px-3"
                                      onClick={() => openSubmitModal(c, activeMilestone)}
                                    >
                                      <i className="bi bi-upload me-1"></i> Submit Stage {activeMilestone.sequence}
                                    </button>
                                  )}
                                  {!isClient && submittedMilestone && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                      onClick={() => openReviewModal(c, submittedMilestone)}
                                    >
                                      <i className="bi bi-eye me-1"></i> View Submitted
                                    </button>
                                  )}
                                  {isClient && submittedMilestone && (
                                    <button
                                      className="btn btn-sm btn-success rounded-pill px-3"
                                      onClick={() => openReviewModal(c, submittedMilestone)}
                                    >
                                      <i className="bi bi-shield-check me-1"></i> Review Stage {submittedMilestone.sequence}
                                    </button>
                                  )}
                                  {isClient && !submittedMilestone && activeMilestone && (
                                    <span className="small text-dark fw-semibold fst-italic">Stage {activeMilestone.sequence} in Progress</span>
                                  )}
                                  {c.status === 'completed' && (
                                    <span className="badge rounded-pill px-3 py-2 fw-semibold bg-success text-white border border-success d-inline-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.8rem' }}>
                                      <i className="bi bi-check2-all"></i> Released
                                    </span>
                                  )}
                                </>
                              ) : (
                                /* Fixed-Price Contract Actions */
                                <>
                                  {!isClient && c.status === 'active' && (
                                    <button
                                      className="btn btn-sm btn-primary rounded-pill px-3"
                                      onClick={() => openSubmitModal(c)}
                                    >
                                      <i className="bi bi-upload me-1"></i> Submit Work
                                    </button>
                                  )}
                                  {!isClient && c.status === 'submitted' && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                      onClick={() => openReviewModal(c)}
                                    >
                                      <i className="bi bi-eye me-1"></i> View Submitted
                                    </button>
                                  )}
                                  {isClient && c.status === 'submitted' && (
                                    <button
                                      className="btn btn-sm btn-success rounded-pill px-3"
                                      onClick={() => openReviewModal(c)}
                                    >
                                      <i className="bi bi-shield-check me-1"></i> Review & Release
                                    </button>
                                  )}
                                  {isClient && c.status === 'active' && (
                                    <span className="small text-dark fw-semibold fst-italic">Work in Progress</span>
                                  )}
                                  {c.status === 'completed' && (
                                    c.deliverable_url ? (
                                      <button
                                        className="btn btn-sm btn-outline-success rounded-pill px-3"
                                        onClick={() => openReviewModal(c)}
                                      >
                                        <i className="bi bi-check2-circle me-1"></i> View Deliverables
                                      </button>
                                    ) : (
                                      <span className="badge rounded-pill px-3 py-2 fw-semibold bg-success text-white border border-success d-inline-flex align-items-center gap-1 shadow-sm" style={{ fontSize: '0.8rem' }}>
                                        <i className="bi bi-check2-all"></i> Released
                                      </span>
                                    )
                                  )}
                                </>
                              )}

                              {/* Chat conversation jump button */}
                              <Link
                                to="/messages"
                                className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 text-decoration-none"
                                title="Open Contract Chat"
                              >
                                <i className="bi bi-chat-text"></i>
                                <span className="small d-none d-sm-inline">Message</span>
                              </Link>

                              {/* Either participant can escalate an in-flight contract */}
                              {(c.status === 'active' || c.status === 'submitted') && (
                                <Link
                                  to={`/contracts/${c.contract_id}/dispute`}
                                  className="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 text-decoration-none"
                                  title="File a dispute with RaketBase staff"
                                >
                                  <i className="bi bi-flag"></i>
                                  <span className="small d-none d-sm-inline">Dispute</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Milestone Sub-Table Accordion when expanded */}
                {contracts.some((c) => expandedContractId === c.contract_id && Array.isArray(c.milestones) && c.milestones.length > 0) && (
                  (() => {
                    const expandedContract = contracts.find((c) => c.contract_id === expandedContractId);
                    if (!expandedContract) return null;
                    const currentUserId = user.user_id || user.id;
                    const isClient = currentUserId === expandedContract.client_id;
                    return (
                      <div className="mt-3 p-3 bg-light rounded border">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-semibold text-dark small text-uppercase">
                            Milestone Breakdown: {expandedContract.jobs?.title || 'Contract'}
                          </span>
                          <button
                            type="button"
                            className="btn-close btn-sm"
                            aria-label="Close"
                            onClick={() => setExpandedContractId(null)}
                          ></button>
                        </div>
                        <div className="table-responsive">
                          <table className="table table-sm align-middle mb-0 bg-white rounded border">
                            <thead className="bg-light">
                              <tr className="small text-muted">
                                <th>#</th>
                                <th>Stage Title</th>
                                <th>Escrow Amount</th>
                                <th>Status</th>
                                <th>Deliverable</th>
                                <th className="text-end">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expandedContract.milestones.map((m) => {
                                const isStageActive = m.status === 'active';
                                const isStageSubmitted = m.status === 'submitted';
                                const isStageCompleted = m.status === 'completed';
                                return (
                                  <tr key={m.milestone_id}>
                                    <td className="fw-bold">{m.sequence}</td>
                                    <td>{m.title}</td>
                                    <td className="fw-semibold text-success">{formatCurrency(m.amount, expandedContract.jobs?.currency)}</td>
                                    <td>
                                      <span
                                        className={`badge rounded-pill ${
                                          isStageCompleted
                                            ? 'bg-success text-white'
                                            : isStageSubmitted
                                            ? 'bg-warning text-dark'
                                            : isStageActive
                                            ? 'bg-info text-dark'
                                            : 'bg-secondary text-white'
                                        }`}
                                      >
                                        {m.status}
                                      </span>
                                    </td>
                                    <td>
                                      {m.deliverable_url ? (
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 text-decoration-none"
                                          onClick={() => openReviewModal(expandedContract, m)}
                                        >
                                          <i className="bi bi-box-arrow-up-right me-1"></i> View Link
                                        </button>
                                      ) : (
                                        <span className="text-muted small">—</span>
                                      )}
                                    </td>
                                    <td className="text-end">
                                      {!isClient && isStageActive && (
                                        <button
                                          className="btn btn-sm btn-primary rounded-pill px-3 py-1"
                                          onClick={() => openSubmitModal(expandedContract, m)}
                                        >
                                          Submit
                                        </button>
                                      )}
                                      {isClient && isStageSubmitted && (
                                        <button
                                          className="btn btn-sm btn-success rounded-pill px-3 py-1"
                                          onClick={() => openReviewModal(expandedContract, m)}
                                        >
                                          Review & Release
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </div>

        <div className="col-xl-4 col-lg-4">
          <div className="card h-100 mb-0 flex-grow-1">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="card-title mb-0">{isCustomer ? 'Incoming Proposals' : 'My Proposals'}</h2>
              {isCustomer ? (
                <Link to="/my-jobs" className="small text-success text-decoration-none fw-semibold">
                  View All Postings
                </Link>
              ) : (
                <div className="nav nav-pills nav-sm">
                  <button className={`nav-link px-3 py-1 fw-medium ${proposalTab === 'active' ? 'active bg-dark text-white' : 'text-muted'}`} onClick={() => setProposalTab('active')} style={{ fontSize: '13px', borderRadius: '50px' }}>Active</button>
                  <button className={`nav-link px-3 py-1 fw-medium ${proposalTab === 'past' ? 'active bg-dark text-white' : 'text-muted'}`} onClick={() => setProposalTab('past')} style={{ fontSize: '13px', borderRadius: '50px' }}>Past</button>
                </div>
              )}
            </div>
            {loading ? (
              <div className="d-flex flex-column gap-3 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="d-flex align-items-center gap-3">
                    <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 36, height: 36 }} />
                    <div className="flex-grow-1">
                      <div className="skeleton-box mb-2" style={{ width: "70%", height: 14 }} />
                      <div className="skeleton-box" style={{ width: "40%", height: 10 }} />
                    </div>
                    <div className="skeleton-box rounded-pill" style={{ width: 75, height: 24 }} />
                  </div>
                ))}
              </div>
            ) : isCustomer ? (
              clientJobs.length === 0 ? (
                <div className="text-center p-5 text-muted">
                  No job postings yet.
                  <Link to="/jobs/create" className="text-success fw-semibold d-block mt-2">+ Post a Job</Link>
                </div>
              ) : clientJobs.filter((j) => (j.proposal_count || 0) > 0).length === 0 ? (
                <div className="text-center p-5 text-muted">
                  No proposals received yet on your active job postings.
                  <Link to="/my-jobs" className="text-success fw-semibold d-block mt-2">Manage Postings</Link>
                </div>
              ) : (
                <div className="transaction-list mt-2">
                  {clientJobs
                    .filter((j) => (j.proposal_count || 0) > 0)
                    .map((job) => (
                      <div className="transaction-item align-items-center" key={job.job_id}>
                        <div className="transaction-icon bg-forest-light text-lime">
                          <i className="bi bi-briefcase"></i>
                        </div>
                        <div className="transaction-info flex-grow-1 min-w-0 me-2">
                          <div className="transaction-name text-dark fw-semibold mb-1 text-truncate">{job.title}</div>
                          <div className="transaction-amount text-success fw-bold small">
                            {job.pending_count > 0 ? `${job.pending_count} pending` : `${job.proposal_count} ${job.proposal_count === 1 ? 'proposal' : 'proposals'}`} · {formatCurrency(job.budget || 0, job.currency)}
                          </div>
                        </div>
                        <div className="ms-auto text-end flex-shrink-0">
                          <Link to={`/my-jobs/${job.job_id}`} className="btn btn-outline-dark btn-sm rounded-pill px-3">
                            Review ({job.proposal_count})
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              )
            ) : (() => {
              const isPast = (status) => ['completed', 'rejected', 'withdrawn', 'cancelled'].includes((status || '').toLowerCase());
              const filteredProposals = proposals.filter(p => proposalTab === 'past' ? isPast(p.status) : !isPast(p.status));
              if (filteredProposals.length === 0) {
                return <div className="text-center p-5 text-muted">No {proposalTab} proposals.</div>;
              }
              return (
                <div className="transaction-list mt-2">
                  {[...filteredProposals].sort((a, b) => {
                    const statusA = (a.status || 'pending').toLowerCase();
                    const statusB = (b.status || 'pending').toLowerCase();
                    const rank = { 'accepted': 1, 'pending': 2, 'rejected': 3 };
                    return (rank[statusA] || 4) - (rank[statusB] || 4);
                  }).map((p) => {
                    const status = (p.status || 'pending').toLowerCase();
                    let statusClass = 'btn btn-warning btn-sm text-dark';
                    let displayStatus = 'Submitted';
                    if (status === 'accepted') {
                      statusClass = 'btn btn-success btn-sm text-white';
                      displayStatus = 'Accepted';
                    } else if (status === 'rejected') {
                      statusClass = 'btn btn-danger btn-sm text-white';
                      displayStatus = 'Rejected';
                    }

                    return (
                      <div className="transaction-item align-items-center" key={p.proposal_id}>
                        <div className="transaction-icon bg-forest-light text-lime">
                          <i className="bi bi-file-earmark-text"></i>
                        </div>
                        <div className="transaction-info flex-grow-1">
                          <div className="transaction-name text-dark fw-semibold mb-1">{p.jobs?.title || 'Job Posting'}</div>
                          <div className="transaction-amount text-success fw-bold small">{formatCurrency(p.bid_amount || 0, p.jobs?.currency)}</div>
                        </div>
                        <div className="ms-3 text-end">
                          <span className={`${statusClass} rounded-pill px-3 fw-medium`} style={{ pointerEvents: 'none' }}>
                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. FREELANCER SUBMIT DELIVERABLES MODAL */}
      {/* ========================================================================= */}
      {submitModalContract && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0 rounded-4 overflow-hidden">
              <form onSubmit={handleConfirmSubmit}>
                <div className="modal-header border-bottom pb-3 pt-3 px-4 bg-light">
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      {submitModalMilestone ? (
                        <>Submit Stage {submitModalMilestone.sequence}: {submitModalMilestone.title}</>
                      ) : (
                        <>Submit Project Deliverable</>
                      )}
                    </h5>
                    <div className="small text-muted">
                      {submitModalContract.jobs?.title || 'Contract'} · Escrow:{' '}
                      <span className="text-success fw-bold">
                        {formatCurrency(
                          submitModalMilestone ? submitModalMilestone.amount : submitModalContract.agreed_amount || 0,
                          submitModalContract.jobs?.currency
                        )}
                      </span>
                    </div>
                  </div>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeSubmitModal} disabled={isSubmitting}></button>
                </div>

                <div className="modal-body p-4">
                  {submitError && (
                    <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>{submitError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small">
                      Deliverable Link <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light text-muted border-end-0">
                        <i className="bi bi-link-45deg"></i>
                      </span>
                      <input
                        type="url"
                        className="form-control border-start-0"
                        placeholder="https://drive.google.com/... or https://github.com/..."
                        value={deliverableUrl}
                        onChange={(e) => setDeliverableUrl(e.target.value)}
                        required
                        disabled={isSubmitting}
                        autoFocus
                      />
                    </div>
                    <div className="form-text text-muted" style={{ fontSize: '0.8rem' }}>
                      Paste a shareable Google Drive, GitHub repo, Figma prototype, or live web link.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold text-dark small">
                      Notes / Instructions <span className="text-muted fw-normal">(Optional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Describe what was completed, how to test or access files, or any additional context..."
                      value={deliverableNotes}
                      onChange={(e) => setDeliverableNotes(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="alert alert-info border-0 d-flex align-items-center gap-2 mb-0 py-2 px-3 small">
                    <i className="bi bi-chat-dots-fill text-info flex-shrink-0"></i>
                    <span>
                      Submitting automatically notifies the client in the chat thread so they can inspect your work and release escrow funds.
                    </span>
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3 bg-light d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill px-4"
                    onClick={closeSubmitModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary rounded-pill px-4 fw-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      'Submit for Review'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CLIENT DELIVERABLE REVIEW & ESCROW RELEASE MODAL (REPLACES window.confirm) */}
      {/* ========================================================================= */}
      {reviewModalContract && (
        (() => {
          const target = reviewModalMilestone || reviewModalContract;
          const isMilestone = Boolean(reviewModalMilestone);
          const link = target.deliverable_url;
          const notes = target.deliverable_notes;
          const submittedAt = target.submitted_at;
          const rawReleaseAmount = isMilestone ? target.amount : reviewModalContract.agreed_amount || 0;
          const releaseAmount = formatCurrency(rawReleaseAmount, reviewModalContract.jobs?.currency);
          const currentUserId = user.user_id || user.id;
          const isClient = currentUserId === reviewModalContract.client_id;
          const isPendingReview = isMilestone ? target.status === 'submitted' : reviewModalContract.status === 'submitted';
          const canApprove = isClient && isPendingReview;

          return (
            <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1050 }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow border-0 rounded-4 overflow-hidden">
                  <div className="modal-header border-bottom pb-3 pt-3 px-4 bg-light">
                    <div>
                      <h5 className="modal-title fw-bold text-dark mb-0">
                        {canApprove ? (
                          <><i className="bi bi-shield-check text-success me-2"></i>Review Deliverable & Release Escrow</>
                        ) : (
                          <><i className="bi bi-file-earmark-check text-primary me-2"></i>Deliverable Details</>
                        )}
                      </h5>
                      <div className="small text-muted">
                        {reviewModalContract.jobs?.title || 'Contract'}
                        {isMilestone && ` · Stage ${target.sequence}: ${target.title}`}
                      </div>
                    </div>
                    <button type="button" className="btn-close" aria-label="Close" onClick={closeReviewModal} disabled={isApproving}></button>
                  </div>

                  <div className="modal-body p-4">
                    {reviewError && (
                      <div className="alert alert-danger py-2 px-3 small border-0 mb-3" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>{reviewError}
                      </div>
                    )}

                    {/* Escrow summary badge card */}
                    <div className="card bg-light border-0 rounded-3 p-3 mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="text-muted small">Escrow Amount</div>
                          <div className="h4 mb-0 fw-bold text-success">{releaseAmount}</div>
                        </div>
                        <span className={`badge rounded-pill px-3 py-2 ${target.status === 'completed' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                          {target.status === 'completed' ? 'Completed & Released' : 'Pending Client Review'}
                        </span>
                      </div>
                    </div>

                    {/* Deliverable Link */}
                    <div className="mb-3">
                      <div className="fw-semibold text-dark small mb-1">Submitted Deliverable Link:</div>
                      {link ? (
                        <div className="p-3 bg-light rounded-3 border">
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline-success btn-deliverable-link btn-sm rounded-pill d-inline-flex align-items-center gap-1 mb-2 fw-semibold px-3 py-1"
                          >
                            <i className="bi bi-box-arrow-up-right"></i> Open Deliverable Files
                          </a>
                          <div className="small text-muted text-break font-monospace">{link}</div>
                        </div>
                      ) : (
                        <div className="p-3 bg-light rounded-3 border text-muted small fst-italic">
                          No external URL was recorded for this submission. Please verify work files shared in the chat.
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div className="mb-3">
                      <div className="fw-semibold text-dark small mb-1">Freelancer Overview & Notes:</div>
                      {notes ? (
                        <div className="p-3 bg-light rounded-3 border text-dark small" style={{ whiteSpace: 'pre-wrap' }}>
                          {notes}
                        </div>
                      ) : (
                        <div className="p-2 text-muted small fst-italic">No additional notes provided.</div>
                      )}
                    </div>

                    {submittedAt && (
                      <div className="small text-muted mb-2">
                        <i className="bi bi-clock-history me-1"></i>
                        Submitted on {new Date(submittedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Simulated Escrow Warning Notice for Client */}
                    {canApprove && (
                      <div className="alert alert-warning escrow-notice-alert border-0 d-flex align-items-start gap-2 mb-0 mt-3 p-3 rounded-3">
                        <i className="bi bi-shield-exclamation text-warning flex-shrink-0 fs-5 mt-1 notice-icon"></i>
                        <div className="small notice-text">
                          <strong>Simulated Escrow Protection Notice:</strong> Approving this deliverable marks{' '}
                          <span className="fw-bold">{releaseAmount}</span> as officially released to the freelancer.
                          This concludes simulated escrow protection for {isMilestone ? 'this milestone' : 'this contract'}.
                          Please ensure you have opened and verified the deliverable link before releasing funds.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer border-top px-4 py-3 bg-light d-flex justify-content-end gap-2">
                    {canApprove ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-outline-secondary rounded-pill px-4"
                          onClick={closeReviewModal}
                          disabled={isApproving}
                        >
                          Keep Reviewing
                        </button>
                        <button
                          type="button"
                          className="btn btn-success rounded-pill px-4 fw-semibold"
                          onClick={handleConfirmApprove}
                          disabled={isApproving}
                        >
                          {isApproving ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Releasing {releaseAmount}...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-shield-check me-1"></i> Approve & Release {releaseAmount}
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary rounded-pill px-4"
                        onClick={closeReviewModal}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}





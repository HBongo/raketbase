import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatCurrency, getCurrencySymbol } from '../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // User session
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [bidAmount, setBidAmount] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  const [touched, setTouched] = useState({ bidAmount: false, coverLetter: false });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadJob() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/jobs/${id}`);
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error || 'Job not found.');
        }
        if (!cancelled) setJob(body.data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load this job.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadJob();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return;
    let cancelled = false;
    async function checkExistingProposal() {
      try {
        const res = await fetch(`${API_BASE_URL}/proposals/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!cancelled && res.ok && body.success && Array.isArray(body.data)) {
          const hasApplied = body.data.some((p) => String(p.job_id) === String(id));
          if (hasApplied) setAlreadyApplied(true);
        }
      } catch {
        // ignore error checking existing proposal
      }
    }
    checkExistingProposal();
    return () => { cancelled = true; };
  }, [id]);

  const [milestones, setMilestones] = useState([
    { title: 'Stage 1 Deliverables', amount: '' },
  ]);

  const isMilestoneJob = job?.budget_type === 'milestone';
  const milestoneTotal = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  function handleAddMilestone() {
    setMilestones((prev) => [
      ...prev,
      { title: `Stage ${prev.length + 1} Deliverables`, amount: '' },
    ]);
  }

  function handleRemoveMilestone(index) {
    if (milestones.length <= 1) return;
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMilestoneChange(index, field, value) {
    setMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function getValidationErrors() {
    const errors = {};

    if (isMilestoneJob) {
      if (!milestones.length) {
        errors.milestones = 'At least one milestone stage is required.';
      } else {
        const invalidMilestone = milestones.some(
          (m) => !m.title.trim() || isNaN(Number(m.amount)) || Number(m.amount) <= 0
        );
        if (invalidMilestone) {
          errors.milestones = 'Each milestone requires a title and an amount greater than 0.';
        } else if (milestoneTotal <= 0) {
          errors.milestones = 'Total milestone sum must be greater than 0.';
        }
      }
    } else {
      const amount = Number(bidAmount);
      if (!String(bidAmount).trim() || Number.isNaN(amount) || amount <= 0) {
        errors.bidAmount = 'Enter a bid amount greater than 0.';
      }
    }

    const htmlRegex = /<\s*[^>]*[a-zA-Z/][^>]*>|javascript\s*:/i;
    const hasContacts = /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d{10,}|\bt\.me\/|\btelegram\b|\bwhatsapp\b)/i.test(coverLetter);

    if (!coverLetter.trim()) {
      errors.coverLetter = 'A cover letter is required.';
    } else if (coverLetter.trim().length < 30) {
      errors.coverLetter = `Cover letter must be at least 30 characters (${30 - coverLetter.trim().length} more needed).`;
    } else if (htmlRegex.test(coverLetter)) {
      errors.coverLetter = 'HTML and script tags are not allowed.';
    } else if (hasContacts) {
      errors.coverLetter = 'Sharing email, phone, or Telegram in proposals is prohibited.';
    }

    return errors;
  }

  const errors = getValidationErrors();
  const showBidError = (touched.bidAmount || submitted) && errors.bidAmount;
  const showMilestoneError = (touched.bidAmount || submitted) && errors.milestones;
  const showCoverLetterError = (touched.coverLetter || submitted) && errors.coverLetter;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitResult(null);
    setSubmitted(true);
    setTouched({ bidAmount: true, coverLetter: true });
    if (Object.keys(errors).length > 0 || alreadyApplied) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('You need to be logged in to submit a proposal.');

      const payload = {
        job_id: job.job_id,
        cover_letter: coverLetter.trim(),
      };

      if (isMilestoneJob) {
        payload.milestones = milestones.map((m) => ({
          title: m.title.trim(),
          amount: Number(m.amount),
        }));
        payload.bid_amount = milestoneTotal;
      } else {
        payload.bid_amount = Number(bidAmount);
      }

      const res = await fetch(`${API_BASE_URL}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (body.error?.includes('already submitted')) {
        setAlreadyApplied(true);
        setSubmitResult({ type: 'error', message: body.error || 'You have already submitted a proposal for this job.' });
        return;
      }
      if (!res.ok || !body.success) {
        throw new Error(body.error || body.message || 'Could not submit your proposal.');
      }
      setAlreadyApplied(true);
      setSubmitResult({ type: 'success', message: 'Proposal sent! The client will review it soon.' });
      setBidAmount('');
      setCoverLetter('');
    } catch (err) {
      setSubmitResult({ type: 'error', message: err.message || 'Something went wrong while submitting.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>


        <div className="page-header">
          <div>
            <h1 className="page-title">Job Details</h1>
            <p className="page-subtitle">Review the requirements and submit your proposal.</p>
          </div>
          <button className="btn btn-outline-dark rounded-pill px-3 d-md-none" onClick={() => navigate('/explore')}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>
        </div>

        <div className="mb-4">
          {loading && (
            <div className="card text-center py-5 border">
              <div className="card-body">
                <h5 className="card-title fw-medium text-dark">Loading job...</h5>
              </div>
            </div>
          )}

          {!loading && loadError && (
            <div className="card text-center py-5 border">
              <div className="card-body">
                <h5 className="card-title fw-medium text-dark">Couldn't load this job</h5>
                <p className="card-text text-muted">{loadError}</p>
                <button className="btn btn-outline-dark mt-3 rounded-pill px-4" onClick={() => window.location.reload()}>Try again</button>
              </div>
            </div>
          )}

          {!loading && !loadError && job && (
            <div className="row g-4">
              <div className="col-xl-8 col-lg-7">
                <div className="card h-100 border">
                  <div className="card-body p-4 p-md-5">
                    <div className="d-flex flex-wrap items-center gap-2 mb-3">
                      <span className="badge bg-light border text-dark fw-semibold px-3 py-2 rounded-pill" style={{ fontSize: '0.85rem' }}>
                        {job.categories?.category_name || 'Uncategorized'}
                      </span>
                      {alreadyApplied && (
                        <span className="badge bg-success-subtle text-success border border-success fw-medium px-3 py-2 rounded-pill">
                          <i className="bi bi-check-circle me-1"></i> Applied
                        </span>
                      )}
                    </div>
                    
                    <h2 className="fw-bold text-dark mb-3" style={{ fontSize: '2rem' }}>
                      {job.title || 'Untitled job'}
                    </h2>
                    
                    <p className="text-muted d-flex align-items-center flex-wrap gap-1 mb-4">
                      <i className="bi bi-clock me-1"></i>
                      <span>Posted {formatDate(job.created_at)}</span>
                      {job.users && (
                        <>
                          <span className="mx-1">by</span>
                          <Link
                            to={`/profile/${job.client_id || job.users.user_id}`}
                            className="text-dark fw-semibold text-decoration-none d-inline-flex align-items-center gap-1.5"
                            title={`View ${job.users.first_name}'s profile`}
                          >
                            {job.users.client_avatar_url || job.users.avatar_url ? (
                              <img
                                src={job.users.client_avatar_url || job.users.avatar_url}
                                alt="Client avatar"
                                className="rounded-circle border"
                                style={{ width: 22, height: 22, objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <span
                                className="rounded-circle bg-dark text-white d-inline-flex align-items-center justify-content-center fw-bold"
                                style={{ width: 22, height: 22, fontSize: '10px' }}
                              >
                                {(job.users.first_name?.[0] || 'C').toUpperCase()}
                              </span>
                            )}
                            <span style={{ textDecoration: 'underline' }}>
                              {job.users.first_name} {job.users.last_name}
                            </span>
                            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill ms-1" style={{ fontSize: '10px', padding: '2px 7px' }}>
                              Client
                            </span>
                          </Link>
                        </>
                      )}
                    </p>
                    
                    <hr className="my-4" />
                    
                    <h5 className="fw-bold text-dark mb-3">Description</h5>
                    <p className="text-muted" style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                      {job.description || 'No description provided.'}
                    </p>

                    {job.users && (
                      <div className="mt-4 pt-4 border-top">
                        <h6 className="fw-bold text-dark text-uppercase small tracking-wider mb-3">About the Client</h6>
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 p-3 bg-light rounded-3 border">
                          <Link
                            to={`/profile/${job.client_id || job.users.user_id}`}
                            className="d-flex align-items-center gap-3 text-decoration-none text-dark"
                          >
                            {job.users.client_avatar_url || job.users.avatar_url ? (
                              <img
                                src={job.users.client_avatar_url || job.users.avatar_url}
                                alt="Client avatar"
                                className="rounded-circle border"
                                style={{ width: 44, height: 44, objectFit: 'cover' }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold fs-5"
                                style={{ width: 44, height: 44 }}
                              >
                                {(job.users.first_name?.[0] || 'C').toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="fw-bold text-dark">
                                {job.users.first_name} {job.users.last_name}
                              </div>
                              <div className="small text-muted">
                                {job.client_rating?.count > 0 ? (
                                  <span>
                                    <i className="bi bi-star-fill text-warning me-1"></i>
                                    {Number(job.client_rating.average || 5).toFixed(1)} ({job.client_rating.count} {job.client_rating.count === 1 ? 'review' : 'reviews'})
                                  </span>
                                ) : (
                                  <span>Client on RaketBase</span>
                                )}
                              </div>
                            </div>
                          </Link>
                          <Link
                            to={`/profile/${job.client_id || job.users.user_id}`}
                            className="btn btn-outline-dark btn-sm rounded-pill px-3"
                          >
                            View Profile
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-xl-4 col-lg-5">
                <div className="card border sticky-top" style={{ top: '90px' }}>
                  <div className="card-body p-4">
                    <p className="text-muted small fw-medium text-uppercase mb-1">Budget</p>
                    <h3 className="fw-bold text-success mb-4">
                      {job.budget ? formatCurrency(job.budget, job.currency) : '—'}
                    </h3>
                    
                    {alreadyApplied && (
                      <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                        <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                        <div>
                          <strong>Already Applied</strong>
                          <div className="small">You have already submitted a proposal for this job.</div>
                        </div>
                      </div>
                    )}
                    
                    <hr className="my-4" />
                    
                    {job && ((user?.user_id && user.user_id === job.client_id) || (user?.id && user.id === job.client_id)) ? (
                      <div className="text-center py-2">
                        <div className="mb-3">
                          <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success">
                            <i className="bi bi-briefcase fs-3"></i>
                          </div>
                        </div>
                        <h5 className="fw-bold text-dark mb-1">Your Job Posting</h5>
                        <p className="text-muted small mb-4">
                          You are the client who posted this job. Review submitted proposals and manage applicants.
                        </p>
                        <div className="d-grid gap-2">
                          <button
                            onClick={() => navigate(`/my-jobs/${job.job_id}`)}
                            className="btn btn-dark rounded-pill fw-medium py-2.5"
                          >
                            <i className="bi bi-file-earmark-person me-2"></i>Review Proposals
                          </button>
                          <button
                            onClick={() => navigate('/my-jobs')}
                            className="btn btn-outline-dark rounded-pill fw-medium py-2"
                          >
                            Manage All Postings
                          </button>
                        </div>
                      </div>
                    ) : job.status !== 'open' && !alreadyApplied ? (
                      <div className="text-center py-2">
                        <div className="mb-3">
                          <div className="d-inline-flex p-3 rounded-circle bg-light border text-secondary">
                            <i className={`bi ${job.status === 'paused' ? 'bi-pause-circle' : 'bi-lock'} fs-3`}></i>
                          </div>
                        </div>
                        <h5 className="fw-bold text-dark mb-1">Not accepting proposals</h5>
                        <p className="text-muted small mb-4">
                          {job.status === 'paused'
                            ? 'The client has paused this job. Check back later.'
                            : job.status === 'cancelled'
                              ? 'The client has cancelled this job.'
                              : job.status === 'removed'
                              ? 'This job was removed by an admin.'
                              : 'This job has been taken and is no longer accepting proposals.'}
                        </p>
                        <button
                          onClick={() => navigate('/explore')}
                          className="btn btn-outline-dark rounded-pill fw-medium px-4"
                        >
                          Browse other jobs
                        </button>
                      </div>
                    ) : (
                      <>
                        <h5 className="fw-bold text-dark mb-3">Submit a Proposal</h5>
                        
                        <form onSubmit={handleSubmit} noValidate>
                          {isMilestoneJob ? (
                            <div className="mb-3">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label fw-medium small text-dark mb-0">Milestone Breakdown</label>
                                <span className="small text-muted" style={{ fontSize: '12px' }}>Sum = Total Bid</span>
                              </div>

                              <div className="d-flex flex-column gap-2">
                                {milestones.map((m, idx) => (
                                  <div key={idx} className="p-2.5 bg-light rounded border">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <span className="small fw-semibold text-secondary">Stage {idx + 1}</span>
                                      {milestones.length > 1 && (
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                                          onClick={() => handleRemoveMilestone(idx)}
                                          title="Remove stage"
                                        >
                                          <i className="bi bi-x-circle"></i>
                                        </button>
                                      )}
                                    </div>
                                    <div className="row g-2">
                                      <div className="col-7">
                                        <input
                                          type="text"
                                          placeholder="Stage deliverable description"
                                          value={m.title}
                                          onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                                          className="form-control form-control-sm bg-white"
                                        />
                                      </div>
                                      <div className="col-5">
                                        <div className="input-group input-group-sm">
                                          <span className="input-group-text bg-white">{getCurrencySymbol(job?.currency)}</span>
                                          <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            placeholder="Amount"
                                            value={m.amount}
                                            onChange={(e) => handleMilestoneChange(idx, 'amount', e.target.value)}
                                            className="form-control bg-white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="d-flex justify-content-between align-items-center mt-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                                  onClick={handleAddMilestone}
                                >
                                  <i className="bi bi-plus-lg me-1"></i> Add Stage
                                </button>
                                <div className="text-end">
                                  <span className="small text-muted me-2">Total Bid:</span>
                                  <span className="fw-bold text-success">{formatCurrency(milestoneTotal, job?.currency)}</span>
                                </div>
                              </div>

                              {showMilestoneError && (
                                <div className="text-danger small mt-2 d-flex align-items-center gap-1">
                                  <i className="bi bi-exclamation-circle-fill"></i> {errors.milestones}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mb-3">
                              <label className="form-label fw-medium small text-dark">Your bid ({getCurrencySymbol(job?.currency)})</label>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                disabled={submitting || alreadyApplied}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                onBlur={() => setTouched((t) => ({ ...t, bidAmount: true }))}
                                className={`form-control bg-light ${showBidError ? 'is-invalid border-danger' : ''}`}
                                placeholder="e.g. 15000"
                              />
                              {showBidError && (
                                <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                                  <i className="bi bi-exclamation-circle-fill"></i> {errors.bidAmount}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <label className="form-label fw-medium small text-dark mb-0">Cover letter</label>
                              <span className={`small ${coverLetter.trim().length >= 30 ? 'text-success fw-medium' : 'text-muted'}`} style={{ fontSize: '12px' }}>
                                {coverLetter.trim().length >= 30 ? (
                                  <><i className="bi bi-check-circle-fill text-success me-1"></i>{coverLetter.trim().length} chars</>
                                ) : (
                                  `${coverLetter.trim().length}/30 min characters`
                                )}
                              </span>
                            </div>
                            <textarea
                              rows="6"
                              disabled={submitting || alreadyApplied}
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              onBlur={() => setTouched((t) => ({ ...t, coverLetter: true }))}
                              className={`form-control bg-light ${showCoverLetterError ? 'is-invalid border-danger' : ''}`}
                              placeholder="Explain why you're a good fit for this job (minimum 30 characters)..."
                              style={{ resize: 'none' }}
                            ></textarea>
                            {showCoverLetterError && (
                              <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                                <i className="bi bi-exclamation-circle-fill"></i> {errors.coverLetter}
                              </div>
                            )}
                          </div>
                          
                          <button
                            type="submit"
                            disabled={submitting || alreadyApplied}
                            className="btn btn-dark w-100 rounded-pill fw-medium py-2"
                          >
                            {alreadyApplied ? 'Already Applied' : submitting ? 'Submitting...' : 'Submit proposal'}
                          </button>
                          
                          {submitResult && (
                            <div className={`alert ${submitResult.type === 'success' ? 'alert-success' : 'alert-danger'} mt-3 mb-0 small py-2`} role="alert">
                              {submitResult.message}
                            </div>
                          )}
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      
    </>
  );
}

function formatDate(value) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

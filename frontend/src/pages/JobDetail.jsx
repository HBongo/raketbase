import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

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
      } catch {}
    }
    checkExistingProposal();
    return () => { cancelled = true; };
  }, [id]);

  function getValidationErrors() {
    const errors = {};
    const amount = Number(bidAmount);
    if (!String(bidAmount).trim() || Number.isNaN(amount) || amount <= 0) {
      errors.bidAmount = 'Enter a bid amount greater than 0.';
    }
    if (!coverLetter.trim()) {
      errors.coverLetter = 'A cover letter is required.';
    } else if (coverLetter.trim().length < 20) {
      errors.coverLetter = `Write a bit more — ${20 - coverLetter.trim().length} characters to go.`;
    }
    return errors;
  }

  const errors = getValidationErrors();
  const showBidError = (touched.bidAmount || submitted) && errors.bidAmount;
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

      const res = await fetch(`${API_BASE_URL}/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: job.job_id,
          bid_amount: Number(bidAmount),
          cover_letter: coverLetter.trim(),
        }),
      });
      const body = await res.json();
      if (res.status === 409 || body.error?.includes('already submitted')) {
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


        <div className="page-header d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Job Details</h1>
            <p className="page-subtitle">Review the requirements and submit your proposal.</p>
          </div>
          <button className="btn btn-outline-dark rounded-pill px-3 d-md-none" onClick={() => navigate('/explore')}>
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>
        </div>

        <div className="px-3 mb-4">
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
                      ₱{job.budget ? Number(job.budget).toLocaleString() : '—'}
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
                    ) : (
                      <>
                        <h5 className="fw-bold text-dark mb-3">Submit a Proposal</h5>
                        
                        <form onSubmit={handleSubmit}>
                          <div className="mb-3">
                            <label className="form-label fw-medium small text-dark">Your bid (₱)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              disabled={submitting || alreadyApplied}
                              value={bidAmount}
                              onChange={(e) => setBidAmount(e.target.value)}
                              onBlur={() => setTouched((t) => ({ ...t, bidAmount: true }))}
                              className={`form-control bg-light ${showBidError ? 'is-invalid' : ''}`}
                              placeholder="e.g. 15000"
                            />
                            {showBidError && (
                              <div className="invalid-feedback">{errors.bidAmount}</div>
                            )}
                          </div>
                          
                          <div className="mb-4">
                            <label className="form-label fw-medium small text-dark">Cover letter</label>
                            <textarea
                              rows="6"
                              disabled={submitting || alreadyApplied}
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              onBlur={() => setTouched((t) => ({ ...t, coverLetter: true }))}
                              className={`form-control bg-light ${showCoverLetterError ? 'is-invalid' : ''}`}
                              placeholder="Explain why you're a good fit for this job."
                              style={{ resize: 'none' }}
                            ></textarea>
                            {showCoverLetterError && (
                              <div className="invalid-feedback">{errors.coverLetter}</div>
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

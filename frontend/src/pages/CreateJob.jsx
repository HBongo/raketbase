import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCategories, createJob, switchRole, getMyJobs, updateJob } from '../services/api';
import { getCached, setCached, clearCached } from '../utils/cache';
import { showToast } from '../utils/toast';

export default function CreateJob() {
  const navigate = useNavigate();
  // Reached via /my-jobs/:id/edit when editing an existing posting
  const { id: editJobId } = useParams();
  const isEditMode = Boolean(editJobId);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const isCustomer = user?.active_role === 'customer';
  const [switchingRole, setSwitchingRole] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [budgetType, setBudgetType] = useState('fixed');
  const [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');

  const cachedCategories = getCached('job_categories');
  const [categories, setCategories] = useState(cachedCategories || []);
  const [loadingCategories, setLoadingCategories] = useState(!cachedCategories || cachedCategories.length === 0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    title: false,
    category: false,
    description: false,
    budget: false,
    deadline: false,
  });

  // Edit mode state
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editBlocked, setEditBlocked] = useState('');
  const [termsLocked, setTermsLocked] = useState(false);
  const [originalDeadline, setOriginalDeadline] = useState('');

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })();

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      const cached = getCached('job_categories');
      if (cached && cached.length > 0) {
        setCategories(cached);
        setLoadingCategories(false);
      }
      try {
        const res = await getCategories();
        if (cancelled) return;
        const data = res.data || [];
        setCategories(data);
        setCached('job_categories', data);
      } catch {
        if (!cancelled && (!cached || cached.length === 0)) {
          setError('Failed to fetch job categories.');
        }
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode || !isCustomer) return;
    let cancelled = false;
    async function loadJobForEdit() {
      setEditLoading(true);
      setEditBlocked('');
      try {
        const res = await getMyJobs();
        if (cancelled) return;
        const job = (res.data || []).find((j) => j.job_id === editJobId);
        if (!job) {
          setEditBlocked("This job posting doesn't exist or isn't yours.");
          return;
        }
        if (job.status !== 'open') {
          setEditBlocked(`This job is ${job.status}. Only open job postings can be edited.`);
          return;
        }
        const jobDeadline = job.deadline ? String(job.deadline).slice(0, 10) : '';
        setTitle(job.title || '');
        setDescription(job.description || '');
        setCategoryId(job.category_id || '');
        setBudgetType(job.budget_type || 'fixed');
        setCurrency(job.currency || 'PHP');
        setBudget(job.budget != null ? String(job.budget) : '');
        setDeadline(jobDeadline);
        setOriginalDeadline(jobDeadline);
        setTermsLocked((job.pending_count || 0) > 0);
      } catch (err) {
        if (!cancelled) setEditBlocked(err.message || 'Could not load this job posting.');
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    }
    loadJobForEdit();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, isCustomer, editJobId]);

  const selectedCategoryObj = categories.find((c) => c.category_id === categoryId);
  const isOtherCategory = selectedCategoryObj && (
    selectedCategoryObj.category_name.toLowerCase() === 'others' || 
    selectedCategoryObj.category_name.toLowerCase() === 'other'
  );

  // Inline validation checks
  const htmlRegex = /<\s*[^>]*[a-zA-Z/][^>]*>|javascript\s*:/i;
  const alphaTitle = title.replace(/[^a-zA-Z]/g, '');
  const isTitleShouting = alphaTitle.length >= 5 && ((alphaTitle.match(/[A-Z]/g) || []).length / alphaTitle.length) > 0.70;
  const isTitleHasHtml = htmlRegex.test(title);
  const isTitleValid = title.trim().length >= 10 && !isTitleHasHtml && !isTitleShouting;

  const isDescHasHtml = htmlRegex.test(description);
  const isDescTooShort = description.trim().length < 30;
  const isDescTooLong = description.length > 2000;
  const hasOffPlatformContacts = /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d{10,}|\bt\.me\/|\btelegram\b|\bwhatsapp\b)/i.test(description);
  const isDescValid = !isDescTooShort && !isDescTooLong && !isDescHasHtml && !hasOffPlatformContacts;

  const minBudget = currency === 'USD' ? 2 : 100;
  const numBudget = Number(budget);
  const isBudgetValid = !isNaN(numBudget) && numBudget >= minBudget;

  // An existing deadline being kept as-is is fine even if it has since passed
  const isDeadlineValid = !deadline || deadline >= tomorrowStr || (isEditMode && deadline === originalDeadline);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTouched({
      title: true,
      category: true,
      description: true,
      budget: true,
      deadline: true,
    });

    if (!isTitleValid) {
      if (isTitleHasHtml) return setError('Job title cannot contain HTML or script tags.');
      if (isTitleShouting) return setError('Job title cannot be in ALL CAPS (shouting).');
      return setError('Job title must be at least 10 characters long.');
    }
    if (!categoryId) {
      return setError('Please select a valid job category.');
    }
    if (isOtherCategory) {
      if (!customCategory.trim() || customCategory.trim().length < 2) {
        return setError('Please specify a name for your custom category (at least 2 characters).');
      }
      if (htmlRegex.test(customCategory)) {
        return setError('Category name cannot contain HTML or script tags.');
      }
    }
    if (!isDescValid) {
      if (isDescHasHtml) return setError('Job description cannot contain HTML or script tags.');
      if (hasOffPlatformContacts) return setError('Contact info (email, phone, Telegram) is not allowed in job descriptions.');
      if (isDescTooLong) return setError('Job description cannot exceed 2,000 characters.');
      return setError('Job description must be at least 30 characters long.');
    }
    if (!isBudgetValid) {
      return setError(`Budget must be at least ${currency === 'USD' ? '$2.00' : '₱100.00'}.`);
    }
    if (!isDeadlineValid) {
      return setError('Deadline must be a future date.');
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        custom_category: isOtherCategory ? customCategory.trim() : null,
        budget_type: budgetType,
        currency,
        budget: Number(budget),
        deadline: deadline || null,
      };
      if (isEditMode) {
        await updateJob(editJobId, payload);
        clearCached('explore_jobs');
        showToast('Job posting updated.', 3000);
        navigate(`/my-jobs/${editJobId}`);
        return;
      }
      await createJob(payload);
      clearCached('explore_jobs');
      navigate('/explore');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleSwitchToCustomer() {
    try {
      setSwitchingRole(true);
      showToast('Switching to Customer Mode...', { loading: true, duration: 0 });
      await switchRole('customer');
      const updatedUser = { ...user, active_role: 'customer' };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to switch to customer mode');
      showToast(err.message || 'Failed to switch mode', { type: 'error' });
      setSwitchingRole(false);
    }
  }

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
              You are currently in <strong>Freelancer Mode</strong>. Job posting is exclusively available to clients and project owners.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                onClick={handleSwitchToCustomer}
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
                onClick={() => navigate('/explore')}
                className="btn btn-outline-secondary px-4 py-2 rounded-pill"
              >
                Explore Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEditMode && (editLoading || editBlocked)) {
    return (
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <div className="card shadow-sm border-0 text-center py-5">
            <div className="card-body">
              <h5 className="fw-bold mb-2">{editLoading ? 'Loading job posting...' : "Can't edit this job"}</h5>
              {!editLoading && <p className="text-muted small mb-4">{editBlocked}</p>}
              {!editLoading && (
                <button onClick={() => navigate('/my-jobs')} className="btn btn-outline-dark">
                  Back to My Jobs
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          {isEditMode && (
            <div className="mb-3">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(`/my-jobs/${editJobId}`)}>
                <i className="bi bi-arrow-left me-1"></i> Back to Job
              </button>
            </div>
          )}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4">
              <h2 className="card-title fw-bold mb-1">{isEditMode ? 'Edit Job Posting' : 'Post a New Job'}</h2>
              <p className="text-muted small mb-0">
                {isEditMode ? 'Update the details freelancers see on this posting.' : 'Reach verified freelancers across RaketBase.'}
              </p>
            </div>
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label small fw-medium text-dark" htmlFor="title">
                      Job Title <span className="text-danger">*</span>
                    </label>
                    <span className="small text-muted" style={{ fontSize: '11px' }}>Min 10 characters</span>
                  </div>
                  <input
                    id="title"
                    type="text"
                    required
                    placeholder="e.g. Full-Stack Node/React Developer Needed"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                    className={`form-control ${touched.title && !isTitleValid ? 'is-invalid border-danger' : ''}`}
                  />
                  {touched.title && !isTitleValid && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                      <i className="bi bi-exclamation-circle-fill"></i>
                      {isTitleHasHtml ? 'HTML and script tags are not allowed.' :
                       isTitleShouting ? 'Title cannot be all uppercase.' :
                       'Title must be at least 10 characters long.'}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium text-dark" htmlFor="category">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    id="category"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, category: true }))}
                    disabled={loadingCategories && categories.length === 0}
                    className={`form-select ${touched.category && !categoryId ? 'is-invalid border-danger' : ''}`}
                  >
                    <option value="">
                      {loadingCategories && categories.length === 0 ? 'Loading categories...' : 'Select Category'}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                  {touched.category && !categoryId && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                      <i className="bi bi-exclamation-circle-fill"></i> Please select a category.
                    </div>
                  )}

                  {isOtherCategory && (
                    <div className="mt-2 p-3 bg-light rounded-3 border">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label small fw-medium text-dark mb-0" htmlFor="customCategory">
                          Specify New Category Name <span className="text-danger">*</span>
                        </label>
                        <span className="small text-muted" style={{ fontSize: '11px' }}>Will appear in Others</span>
                      </div>
                      <input
                        id="customCategory"
                        type="text"
                        required
                        placeholder="e.g. Video Editing, UI/UX Research, Voice Acting..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className={`form-control bg-white ${touched.category && isOtherCategory && (!customCategory.trim() || customCategory.trim().length < 2) ? 'is-invalid border-danger' : ''}`}
                      />
                      {touched.category && isOtherCategory && (!customCategory.trim() || customCategory.trim().length < 2) && (
                        <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                          <i className="bi bi-exclamation-circle-fill"></i> Please enter a category name (at least 2 characters).
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-medium text-dark mb-0" htmlFor="description">
                      Description <span className="text-danger">*</span>
                    </label>
                    <span className={`small ${description.trim().length >= 30 && !isDescTooLong ? 'text-success fw-medium' : isDescTooLong ? 'text-danger fw-medium' : 'text-muted'}`} style={{ fontSize: '12px' }}>
                      {description.trim().length >= 30 ? (
                        <><i className={`bi ${isDescTooLong ? 'bi-exclamation-triangle-fill text-danger' : 'bi-check-circle-fill text-success'} me-1`}></i>{description.length}/2000 chars</>
                      ) : (
                        `${description.trim().length}/30 min (max 2000)`
                      )}
                    </span>
                  </div>
                  <textarea
                    id="description"
                    required
                    maxLength={2000}
                    rows={5}
                    placeholder="Provide a detailed description of the scope, deliverables, and requirements (minimum 30 characters, maximum 2,000 characters)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                    className={`form-control ${touched.description && !isDescValid ? 'is-invalid border-danger' : ''}`}
                  />
                  {touched.description && !isDescValid && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                      <i className="bi bi-exclamation-circle-fill"></i>
                      {isDescHasHtml ? 'HTML/script tags are not allowed.' :
                       hasOffPlatformContacts ? 'Off-platform contact details (email/phone/Telegram) are prohibited.' :
                       isDescTooLong ? 'Description cannot exceed 2,000 characters.' :
                       `Description must be at least 30 characters (need ${30 - description.trim().length} more).`}
                    </div>
                  )}
                </div>

                {termsLocked && (
                  <div className="alert alert-secondary py-2 px-3 small d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-lock-fill flex-shrink-0"></i>
                    <span>Budget, budget type and currency are locked because freelancers have already sent proposals.</span>
                  </div>
                )}

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-medium text-dark" htmlFor="budgetType">
                      Budget Type
                    </label>
                    <select
                      id="budgetType"
                      value={budgetType}
                      onChange={(e) => setBudgetType(e.target.value)}
                      disabled={termsLocked}
                      className="form-select"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="milestone">Milestone Based</option>
                    </select>
                    <div className="form-text mt-1" style={{ fontSize: '11px', color: '#6C7E75', lineHeight: '1.3' }}>
                      {budgetType === 'fixed'
                        ? '💡 Fixed: One payout released upon full project completion.'
                        : '💡 Milestone: Divided into phased stages with partial escrow releases.'}
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-medium text-dark" htmlFor="currency">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={termsLocked}
                      className="form-select"
                    >
                      <option value="PHP">PHP (₱)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-5">
                    <label className="form-label small fw-medium text-dark" htmlFor="budget">
                      Budget ({currency === 'USD' ? '$' : '₱'}) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="budget"
                      type="number"
                      min={minBudget}
                      step="1"
                      required
                      placeholder={currency === 'USD' ? '100' : '5000'}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      onBlur={() => setTouched((prev) => ({ ...prev, budget: true }))}
                      disabled={termsLocked}
                      className={`form-control ${touched.budget && !isBudgetValid ? 'is-invalid border-danger' : ''}`}
                    />
                    {touched.budget && !isBudgetValid && (
                      <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        Min. {currency === 'USD' ? '$2.00' : '₱100.00'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-medium text-dark" htmlFor="deadline">
                    Deadline (Optional)
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    min={tomorrowStr}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, deadline: true }))}
                    className={`form-control ${touched.deadline && !isDeadlineValid ? 'is-invalid border-danger' : ''}`}
                  />
                  {touched.deadline && !isDeadlineValid && (
                    <div className="text-danger small mt-1 d-flex align-items-center gap-1">
                      <i className="bi bi-exclamation-circle-fill"></i> Deadline must be a future date.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn w-100 py-2 fw-semibold"
                  style={{ backgroundColor: '#FF5A1E', borderColor: '#FF5A1E', color: '#fff' }}
                >
                  {isEditMode
                    ? (loading ? 'Saving Changes...' : 'Save Changes')
                    : (loading ? 'Publishing Job...' : 'Publish Job')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


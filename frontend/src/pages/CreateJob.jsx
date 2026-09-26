import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createJob } from '../services/api';

export default function CreateJob() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budgetType, setBudgetType] = useState('fixed');
  const [currency, setCurrency] = useState('PHP');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    title: false,
    category: false,
    description: false,
    budget: false,
    deadline: false,
  });

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await getCategories();
        setCategories(res.data || []);
      } catch {
        setError('Failed to fetch job categories.');
      }
    }
    loadCategories();
  }, []);

  // Inline validation checks
  const htmlRegex = /<\s*[^>]*[a-zA-Z\/][^>]*>|javascript\s*:/i;
  const alphaTitle = title.replace(/[^a-zA-Z]/g, '');
  const isTitleShouting = alphaTitle.length >= 5 && ((alphaTitle.match(/[A-Z]/g) || []).length / alphaTitle.length) > 0.70;
  const isTitleHasHtml = htmlRegex.test(title);
  const isTitleTooShort = title.trim().length > 0 && title.trim().length < 10;
  const isTitleValid = title.trim().length >= 10 && !isTitleHasHtml && !isTitleShouting;

  const isDescHasHtml = htmlRegex.test(description);
  const isDescTooShort = description.trim().length < 30;
  const hasOffPlatformContacts = /(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?\d{10,}|\bt\.me\/|\btelegram\b|\bwhatsapp\b)/i.test(description);
  const isDescValid = !isDescTooShort && !isDescHasHtml && !hasOffPlatformContacts;

  const minBudget = currency === 'USD' ? 2 : 100;
  const numBudget = Number(budget);
  const isBudgetValid = !isNaN(numBudget) && numBudget >= minBudget;

  const isDeadlineValid = !deadline || new Date(deadline).getTime() > Date.now();

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
    if (!isDescValid) {
      if (isDescHasHtml) return setError('Job description cannot contain HTML or script tags.');
      if (hasOffPlatformContacts) return setError('Contact info (email, phone, Telegram) is not allowed in job descriptions.');
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
      await createJob({
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        budget_type: budgetType,
        currency,
        budget: Number(budget),
        deadline: deadline || null,
      });
      navigate('/explore');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4">
              <h2 className="card-title fw-bold mb-1">Post a New Job</h2>
              <p className="text-muted small mb-0">Reach verified freelancers across RaketBase.</p>
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
                      Job Title
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
                    Category
                  </label>
                  <select
                    id="category"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, category: true }))}
                    className={`form-select ${touched.category && !categoryId ? 'is-invalid border-danger' : ''}`}
                  >
                    <option value="">Select Category</option>
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
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label small fw-medium text-dark mb-0" htmlFor="description">
                      Description
                    </label>
                    <span className={`small ${description.trim().length >= 30 ? 'text-success fw-medium' : 'text-muted'}`} style={{ fontSize: '12px' }}>
                      {description.trim().length >= 30 ? (
                        <><i className="bi bi-check-circle-fill text-success me-1"></i>{description.trim().length} chars</>
                      ) : (
                        `${description.trim().length}/30 min characters`
                      )}
                    </span>
                  </div>
                  <textarea
                    id="description"
                    required
                    rows={5}
                    placeholder="Provide a detailed description of the scope, deliverables, and requirements (minimum 30 characters)..."
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
                       `Description must be at least 30 characters (need ${30 - description.trim().length} more).`}
                    </div>
                  )}
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label small fw-medium text-dark" htmlFor="budgetType">
                      Budget Type
                    </label>
                    <select
                      id="budgetType"
                      value={budgetType}
                      onChange={(e) => setBudgetType(e.target.value)}
                      className="form-select"
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="milestone">Milestone Based</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label small fw-medium text-dark" htmlFor="currency">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="form-select"
                    >
                      <option value="PHP">PHP (₱)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-5">
                    <label className="form-label small fw-medium text-dark" htmlFor="budget">
                      Budget ({currency === 'USD' ? '$' : '₱'})
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
                  {loading ? 'Publishing Job...' : 'Publish Job'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
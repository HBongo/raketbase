import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createJob } from '../services/api';

export default function CreateJob() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budgetType, setBudgetType] = useState('fixed');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (title.length < 10) {
      return setError('Job title must be at least 10 characters long.');
    }
    if (!categoryId) {
      return setError('Please select a valid job category.');
    }
    if (Number(budget) <= 0) {
      return setError('Budget must be greater than ₱0.');
    }
    if (deadline && new Date(deadline).getTime() <= Date.now()) {
      return setError('Deadline must be a future date.');
    }

    setLoading(true);
    try {
      await createJob({
        title,
        description,
        category_id: categoryId,
        budget_type: budgetType,
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
                <div className="alert alert-danger py-2 px-3 small" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-medium text-muted" htmlFor="title">
                    Job Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    placeholder="e.g. Full-Stack Node/React Developer Needed"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium text-muted" htmlFor="category">
                    Category
                  </label>
                  <select
                    id="category"
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium text-muted" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    required
                    rows={5}
                    placeholder="Provide a detailed description of the scope, deliverables, and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-medium text-muted" htmlFor="budgetType">
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

                  <div className="col-12 col-md-6">
                    <label className="form-label small fw-medium text-muted" htmlFor="budget">
                      Budget (₱)
                    </label>
                    <input
                      id="budget"
                      type="number"
                      min="1"
                      required
                      placeholder="5000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-medium text-muted" htmlFor="deadline">
                    Deadline (Optional)
                  </label>
                  <input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="form-control"
                  />
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
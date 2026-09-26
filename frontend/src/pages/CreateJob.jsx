import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createJob } from '../services/api';
import Navbar from '../components/Navbar';

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
    <div className="min-h-screen bg-bg text-text">
      <Navbar showBack backTo="/explore" />
      <div className="p-8 flex justify-center items-center">
        <div className="w-full max-w-2xl bg-panel border border-border p-8 rounded-lg shadow-lg">
          <h2 className="font-display text-2xl font-semibold mb-2">Post a New Job</h2>
          <p className="text-text-secondary text-sm mb-6">Reach verified freelancers across RaketBase.</p>

          {error && (
            <div className="text-sm mb-4 px-3 py-2.5 rounded-md bg-error/10 text-error border border-error/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="title">
                Job Title
              </label>
              <input
                id="title"
                type="text"
                required
                placeholder="e.g. Full-Stack Node/React Developer Needed"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                required
                rows={5}
                placeholder="Provide a detailed description of the scope, deliverables, and requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="budgetType">
                  Budget Type
                </label>
                <select
                  id="budgetType"
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                  className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="milestone">Milestone Based</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="budget">
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
                  className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5" htmlFor="deadline">
                Deadline (Optional)
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-surface border border-border text-text px-3 py-2.5 rounded-md text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:bg-border disabled:text-text-secondary text-[#1A1305] font-semibold text-sm py-3 rounded-md mt-4 transition-colors cursor-pointer"
            >
              {loading ? 'Publishing Job...' : 'Publish Job'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
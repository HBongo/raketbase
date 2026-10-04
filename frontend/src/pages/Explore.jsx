import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getCached, setCached } from '../utils/cache';
import BackToTop from '../components/BackToTop';
import Money from '../components/Money';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const CORE_CATEGORY_NAMES = new Set([
  'web development',
  'graphic design',
  'graphic & design',
  'writing & content',
  'writing & translation',
  'mobile development',
  'digital marketing',
]);

function ExploreSkeleton() {
  return (
    <div className="row g-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div className="col-md-6 col-xl-4" key={i}>
          <div className="card shadow-sm border-0 h-100 p-4 bg-white">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div className="skeleton-box" style={{ width: "65%", height: 18 }} />
              <div className="skeleton-box rounded-pill" style={{ width: 60, height: 20 }} />
            </div>
            <div className="skeleton-box mb-2" style={{ width: "100%", height: 12 }} />
            <div className="skeleton-box mb-2" style={{ width: "90%", height: 12 }} />
            <div className="skeleton-box mb-4" style={{ width: "70%", height: 12 }} />
            <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
              <div className="skeleton-box" style={{ width: 80, height: 16 }} />
              <div className="skeleton-box rounded-pill" style={{ width: 70, height: 26 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const setQuery = (newVal) => {
    if (newVal && newVal.trim()) {
      setSearchParams({ q: newVal });
    } else {
      setSearchParams({});
    }
  };

  const cachedJobs = getCached('explore_jobs');

  const [jobs, setJobs] = useState(cachedJobs || []);
  const [loading, setLoading] = useState(!cachedJobs);
  const [loadError, setLoadError] = useState(null);

  const [activeCategory, setActiveCategory] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [budgetType, setBudgetType] = useState('all');
  const [budget, setBudget] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [hideTaken, setHideTaken] = useState(false);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      const cached = getCached('explore_jobs');
      if (!cached) {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/jobs`);
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        if (cancelled) return;

        const data = body.data || [];
        setJobs(data);
        setCached('explore_jobs', data);

        if (data.length) {
          const amounts = data.map((j) => Number(j.budget) || 0);
          setBudget({ min: Math.min(...amounts), max: Math.max(...amounts) });
        } else {
          setBudget({ min: 0, max: 0 });
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Could not load jobs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  const budgetBounds = useMemo(() => {
    if (!jobs.length) return { min: 0, max: 0 };
    const amounts = jobs.map((j) => Number(j.budget) || 0);
    return { min: Math.min(...amounts), max: Math.max(...amounts) };
  }, [jobs]);

  const { coreCategories, otherCategories, otherCategoryIds, othersTotalCount } = useMemo(() => {
    const counts = {};
    for (const j of jobs) {
      const name = j.categories?.category_name || 'Others';
      counts[name] = (counts[name] || 0) + 1;
    }

    const defaultCore = [
      { id: 'all', name: 'All', label: 'All', count: jobs.length },
      { id: 'web-development', name: 'Web Development', label: 'Web Development', count: counts['Web Development'] || 0 },
      { id: 'graphic-design', name: 'Graphic & Design', label: 'Graphic & Design', count: (counts['Graphic & Design'] || counts['Graphic Design'] || 0) },
      { id: 'writing-content', name: 'Writing & Translation', label: 'Writing & Translation', count: (counts['Writing & Translation'] || counts['Writing & Content'] || 0) },
      { id: 'mobile-development', name: 'Mobile Development', label: 'Mobile Development', count: counts['Mobile Development'] || 0 },
      { id: 'digital-marketing', name: 'Digital Marketing', label: 'Digital Marketing', count: counts['Digital Marketing'] || 0 },
    ];

    const others = [];
    const otherIds = new Set();
    let otherCount = 0;

    for (const [name, count] of Object.entries(counts)) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const lowerName = name.toLowerCase();
      if (!CORE_CATEGORY_NAMES.has(lowerName)) {
        others.push({ id: slug, name, label: name, count });
        otherIds.add(slug);
        otherCount += count;
      }
    }

    return {
      coreCategories: defaultCore,
      otherCategories: others,
      otherCategoryIds: otherIds,
      othersTotalCount: otherCount,
    };
  }, [jobs]);

  const selectedOtherCategory = otherCategories.find((c) => c.id === activeCategory);
  const isOthersActive = activeCategory === 'others-all' || !!selectedOtherCategory;

  const visibleJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (hideTaken && isTakenJob(j)) return false;
      if (budgetType !== 'all') {
        const bt = (j.budget_type || 'fixed').toLowerCase();
        if (bt !== budgetType) return false;
      }
      if (activeCategory !== 'all') {
        const catName = (j.categories?.category_name || 'Others').toLowerCase().replace(/\s+/g, '-');
        if (activeCategory === 'others-all') {
          if (coreCategories.some(c => c.id === catName)) return false;
        } else if (otherCategoryIds.has(activeCategory)) {
          if (catName !== activeCategory) return false;
        } else {
          if (catName !== activeCategory) return false;
        }
      }
      if (query) {
        const q = query.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter(Boolean);
        const t = (j.title || '').toLowerCase();
        const d = (j.description || '').toLowerCase();
        const cn = (j.categories?.category_name || '').toLowerCase();
        const bt = (j.budget_type || 'fixed').toLowerCase();

        const matchesAll = tokens.every((token) => {
          if (t.includes(token) || d.includes(token) || cn.includes(token)) return true;
          if (token.startsWith('milestone') && bt === 'milestone') return true;
          if (token.startsWith('fixed') && bt === 'fixed') return true;
          return false;
        });
        if (!matchesAll) return false;
      }
      if (budget) {
        const amount = Number(j.budget) || 0;
        if (amount < budget.min || amount > budget.max) return false;
      }
      if (minRating > 0) {
        // Unrated clients are left out once a minimum rating is picked
        const rating = j.client_rating ?? 0;
        if (rating < minRating) return false;
      }
      return true;
    });
  }, [jobs, activeCategory, query, budget, otherCategoryIds, minRating, hideTaken, budgetType]);

  function resetFilters() {
    setActiveCategory('all');
    setQuery('');
    setBudgetType('all');
    setBudget(budgetBounds);
    setMinRating(0);
    setHideTaken(false);
  }



  return (
    <>
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100, margin: "-1rem -1rem 1rem -1rem" }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Explore Jobs</h1>
          <p className="page-subtitle">Find the right project or talent for your needs.</p>
        </div>
        {user.active_role === 'customer' && (
          <Link to="/jobs/create" className="btn btn-dark fw-bold rounded-pill px-4">
            <i className="bi bi-plus-lg me-1"></i> Post a Job
          </Link>
        )}
      </div>

      <div className="row g-4 px-3 mb-4">
        <div className="col-xl-9 col-lg-8 order-2 order-lg-1">
          {/* Synchronized Search Bar */}
          <div className="mb-2 d-flex gap-2">
            <div className="input-group shadow-sm rounded-pill overflow-hidden border bg-white flex-grow-1">
              <input
                type="text"
                className="form-control border-0 py-2 ps-4 text-dark bg-white shadow-none" style={{ outline: "none" }}
                placeholder="Search jobs by title, description, category, or 'milestone'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="btn btn-white border-0 text-muted shadow-none"
                  title="Clear search" aria-label="Clear search"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
              <span className="input-group-text bg-white border-0 pe-4">
                <i className="bi bi-search text-muted"></i>
              </span>
            </div>
            <button className="btn btn-outline-dark rounded-pill px-4 d-lg-none flex-shrink-0" onClick={() => setFiltersOpen(!filtersOpen)} aria-label="Toggle Filters">
              <i className="bi bi-sliders me-1"></i> Filters
            </button>
          </div>

          {/* Active Search & Filter Badges */}
          {(query || budgetType !== 'all') && (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3 ps-1">
              {query && (
                <span className="badge rounded-pill bg-light text-dark border px-3 py-2 small fw-normal d-inline-flex align-items-center gap-1.5">
                  <i className="bi bi-search text-muted"></i> &ldquo;{query}&rdquo;
                  <button type="button" className="btn-close ms-1" style={{ fontSize: '0.6rem' }} onClick={() => setQuery('')} aria-label="Clear query"></button>
                </span>
              )}
              {budgetType !== 'all' && (
                <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 small fw-medium d-inline-flex align-items-center gap-1.5">
                  {budgetType === 'milestone' ? 'Milestone-Based Jobs' : 'Fixed Price Jobs'}
                  <button type="button" className="btn-close ms-1" style={{ fontSize: '0.6rem' }} onClick={() => setBudgetType('all')} aria-label="Clear project type filter"></button>
                </span>
              )}
              <span className="small text-muted ms-1">
                ({visibleJobs.length} {visibleJobs.length === 1 ? 'job' : 'jobs'} found)
              </span>
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mb-4 pb-2 align-items-center">
            {coreCategories.map((c) => {
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`btn rounded-pill px-4 py-2 flex-shrink-0 fw-medium category-filter-btn ${isActive ? 'is-active' : ''}`}
                  aria-pressed={isActive}
                >
                  {c.label} <span className="small opacity-75">({c.count})</span>
                </button>
              );
            })}

            {/* Others Dropdown for Custom Categories */}
            <div className="dropdown d-inline-block flex-shrink-0">
              <button
                type="button"
                className={`btn rounded-pill px-4 py-2 fw-medium dropdown-toggle category-filter-btn ${isOthersActive ? 'is-active' : ''}`}
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {selectedOtherCategory ? `Others: ${selectedOtherCategory.name}` : 'Others'}
                <span className="ms-2 small opacity-75">({othersTotalCount})</span>
              </button>
              <ul className="dropdown-menu shadow border-0 rounded-3 mt-1 py-2" style={{ minWidth: '220px', zIndex: 1050 }}>
                <li>
                  <button
                    type="button"
                    className={`dropdown-item py-2 px-3 fw-medium d-flex justify-content-between align-items-center ${activeCategory === 'others-all' ? 'active text-white' : ''}`}
                    style={activeCategory === 'others-all' ? { backgroundColor: '#FF5A1E', color: '#fff' } : {}}
                    onClick={() => setActiveCategory('others-all')}
                  >
                    <span>All in Others</span>
                    <span className={`badge rounded-pill ${activeCategory === 'others-all' ? 'bg-white text-dark' : 'bg-light text-dark'}`}>
                      {othersTotalCount}
                    </span>
                  </button>
                </li>
                {otherCategories.length > 0 && <li><hr className="dropdown-divider my-1" /></li>}
                {otherCategories.map((subCat) => {
                  const isSelected = activeCategory === subCat.id;
                  return (
                    <li key={subCat.id}>
                      <button
                        type="button"
                        className={`dropdown-item py-2 px-3 d-flex justify-content-between align-items-center ${isSelected ? 'active text-white' : ''}`}
                        style={isSelected ? { backgroundColor: '#FF5A1E', color: '#fff' } : {}}
                        onClick={() => setActiveCategory(subCat.id)}
                      >
                        <span>{subCat.name}</span>
                        <span className={`badge rounded-pill ${isSelected ? 'bg-white text-dark' : 'bg-light text-dark'}`}>
                          {subCat.count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {loading && <ExploreSkeleton />}

            {!loading && loadError && (
              <StateCard
                title="Couldn't load jobs"
                body={loadError}
                action={{ label: 'Try again', onClick: () => window.location.reload() }}
              />
            )}

            {!loading && !loadError && visibleJobs.length === 0 && (
              <StateCard
                title="No jobs match those filters"
                body="Try widening the budget range or clearing your search."
                action={{ label: 'Reset filters', onClick: resetFilters }}
              />
            )}

            {!loading && !loadError && visibleJobs.length > 0 && (
              <div className="row g-4">
                {visibleJobs.map((job) => (
                  <div className="col-12 col-sm-6 col-xl-6" key={job.job_id}>
                    <JobCard job={job} onOpen={() => navigate(`/jobs/${job.job_id}`)} />
                  </div>
                ))}
              </div>
            )}
          </div>

                      <div className={`col-xl-3 col-lg-4 order-1 sticky-filter ${!filtersOpen ? 'd-none d-lg-block' : 'd-block'}`}>
              {budget && (
                <FiltersSidebar
                  budget={budget}
                  setBudget={setBudget}
                  budgetBounds={budgetBounds}
                  minRating={minRating}
                  setMinRating={setMinRating}
                  hideTaken={hideTaken}
                  setHideTaken={setHideTaken}
                  budgetType={budgetType}
                  setBudgetType={setBudgetType}
                  resetFilters={resetFilters}
                  resultCount={visibleJobs.length}
                  onClose={() => setFiltersOpen(false)}
                />
              )}
                  </div>
      </div>
      <BackToTop />
    </>
  );
}

function FiltersSidebar({ budget, setBudget, budgetBounds, minRating, setMinRating, hideTaken, setHideTaken, budgetType, setBudgetType, resetFilters, resultCount, onClose }) {
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Filters</h5>
        <button onClick={onClose} className="btn-close d-lg-none" aria-label="Close filters"></button>
      </div>
      <div className="card-body">
        <div className="mb-4">
          <label className="form-label fw-medium small mb-2">Project Type</label>
          <div className="d-flex flex-column gap-2">
            {[
              { id: 'all', label: 'All Project Types' },
              { id: 'milestone', label: 'Milestone-Based' },
              { id: 'fixed', label: 'Fixed Price' },
            ].map((type) => (
              <div key={type.id} className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="budgetTypeFilter"
                  id={`budgetType_${type.id}`}
                  checked={budgetType === type.id}
                  onChange={() => setBudgetType(type.id)}
                />
                <label className="form-check-label small fw-medium" htmlFor={`budgetType_${type.id}`} style={{ cursor: 'pointer' }}>
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label fw-medium small mb-2">Client Rating</label>
          <select className="form-select form-select-sm" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
            <option value={0}>All Ratings</option>
            <option value={4.5}>4.5 Stars & Up</option>
            <option value={4}>4 Stars & Up</option>
            <option value={3}>3 Stars & Up</option>
          </select>
        </div>
        <div className="form-check mb-4">
          <input
            id="hideTakenJobs"
            type="checkbox"
            className="form-check-input"
            checked={hideTaken}
            onChange={(e) => setHideTaken(e.target.checked)}
          />
          <label htmlFor="hideTakenJobs" className="form-check-label small fw-medium">
            Hide taken jobs
          </label>
        </div>
        <RangeField
          label="Budget"
          unit="₱"
          value={budget}
          onChange={setBudget}
          bounds={budgetBounds}
          onReset={() => setBudget(budgetBounds)}
        />
        <hr className="my-4" />
        <button
          type="button"
          onClick={onClose}
          className="btn btn-dark w-100 mb-2 fw-medium rounded-pill d-lg-none"
        >
          Show {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </button>
        <div className="text-center small text-muted mb-3 d-none d-lg-block">
          {resultCount} {resultCount === 1 ? 'job' : 'jobs'} found
        </div>
        <button type="button" onClick={resetFilters} className="btn btn-outline-secondary w-100 fw-medium rounded-pill">
          Reset all filters
        </button>
      </div>
    </div>
  );
}

function RangeField({ label, unit, value, onChange, bounds, onReset }) {
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-medium small">{label}</span>
        <button onClick={onReset} className="btn btn-link p-0 text-decoration-none small text-success">Reset</button>
      </div>
      <input
        type="range"
        className="form-range mb-3"
        min={bounds.min}
        max={bounds.max}
        value={value.max}
        onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
      />
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label small text-muted mb-1">From{unit ? `, ${unit}` : ''}</label>
          <input
            type="number"
            className="form-control form-control-sm bg-light"
            value={value.min}
            onChange={(e) => onChange({ ...value, min: Number(e.target.value) })}
          />
        </div>
        <div className="col-6">
          <label className="form-label small text-muted mb-1">To{unit ? `, ${unit}` : ''}</label>
          <input
            type="number"
            className="form-control form-control-sm bg-light"
            value={value.max}
            onChange={(e) => onChange({ ...value, max: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

// A freelancer has already been hired (or the work is done), so it's no longer accepting proposals.
function isTakenJob(job) {
  return job.status === 'assigned' || job.status === 'completed';
}

function JobCard({ job, onOpen }) {
  const isTaken = isTakenJob(job);
  const categoryName = job.categories?.category_name || 'Uncategorized';
  const posted = formatDate(job.created_at);
  const clientName = [job.users?.first_name, job.users?.last_name].filter(Boolean).join(' ') || 'customer';
  const clientInitial = (job.users?.first_name?.[0] || 'C').toUpperCase();
  const avatarUrl = job.users?.client_avatar_url || job.users?.avatar_url;

  return (
    <div className="card h-100 border transition-all" style={{ cursor: 'pointer', opacity: isTaken ? 0.75 : 1 }} onClick={onOpen}>
      <div className="card-body d-flex flex-column p-3">
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
            <span 
              className="badge bg-light border text-dark fw-semibold px-3 py-2 rounded-pill text-truncate" 
              style={{ fontSize: '0.85rem', maxWidth: '65%' }}
              title={categoryName}
            >
              {categoryName}
            </span>
            {posted && (
              <div className="small text-muted d-flex align-items-center flex-shrink-0 text-nowrap mt-1">
                <i className="bi bi-clock me-1"></i>
                <span>{posted}</span>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
            <Link
              to={`/profile/${job.client_id || job.users?.user_id}?as=client`}
              onClick={(e) => e.stopPropagation()}
              className="d-inline-flex align-items-center gap-2 text-decoration-none text-muted text-truncate"
              title={`View ${clientName}'s profile`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={clientName}
                  className="rounded-circle border"
                  style={{ width: 22, height: 22, objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div
                  className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 22, height: 22, fontSize: '10px' }}
                >
                  {clientInitial}
                </div>
              )}
              <span className="small text-truncate">
                Posted by <strong className="text-dark fw-medium" style={{ textDecoration: 'underline' }}>{clientName}</strong>
              </span>
            </Link>
            {job.client_rating != null && (
              <span
                className="small text-muted text-nowrap flex-shrink-0"
                title={`Client rating from ${job.client_rating_count} ${job.client_rating_count === 1 ? 'review' : 'reviews'}`}
              >
                <i className="bi bi-star-fill text-warning me-1"></i>{job.client_rating}
              </span>
            )}
          </div>
        </div>
        {isTaken && (
          <span className="badge rounded-pill bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle align-self-start mb-2 px-3 py-2">
            <i className="bi bi-lock-fill me-1"></i>Job taken
          </span>
        )}
        <h5 className="card-title text-dark fw-bold mb-3" style={{ fontSize: "1.15rem", lineHeight: "1.4" }}>
          {job.title || 'Untitled job'}
        </h5>
        <div className="mb-3 d-flex align-items-center justify-content-between">
          <div>
            <span className="small text-muted">Budget: </span>
            <span className="fw-bold text-success fs-6">{job.budget ? <Money amount={job.budget} currency={job.currency} /> : '—'}</span>
          </div>
          {job.budget_type === 'milestone' ? (
            <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2.5 py-1" style={{ fontSize: '0.78rem' }} title="Milestone-based project">
              Milestone
            </span>
          ) : (
            <span className="badge rounded-pill bg-light text-secondary border px-2.5 py-1" style={{ fontSize: '0.78rem' }} title="Fixed price project">
              Fixed Price
            </span>
          )}
        </div>
        <p className="card-text small text-muted flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {job.description || 'No description provided.'}
        </p>
        {isTaken ? (
          <button type="button" disabled className="btn btn-outline-secondary w-100 mt-3 rounded-pill fw-medium">
            No longer accepting proposals
          </button>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onOpen(); }} className="btn btn-outline-dark w-100 mt-3 rounded-pill fw-medium">View & Apply</button>
        )}
      </div>
    </div>
  );
}

function StateCard({ title, body, action }) {
  return (
    <div className="card text-center py-5 border">
      <div className="card-body">
        <h5 className="card-title fw-medium text-dark">{title}</h5>
        {body && <p className="card-text text-muted">{body}</p>}
        {action && (
          <button onClick={action.onClick} className="btn btn-outline-dark mt-3 rounded-pill px-4">
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}












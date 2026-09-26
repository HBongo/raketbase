import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getTopUsers } from '../services/api';
import { getCached, setCached } from '../utils/cache';
import BackToTop from '../components/BackToTop';

const PAGE_SIZE = 12;

const RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 4.5, label: '4.5 & up' },
  { value: 4, label: '4.0 & up' },
  { value: 3.5, label: '3.5 & up' },
  { value: 3, label: '3.0 & up' },
];

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function TopUsers() {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'clients' ? 'clients' : 'freelancers';
  const role = tab === 'clients' ? 'customer' : 'freelancer';
  const isFreelancer = role === 'freelancer';

  const [minRating, setMinRating] = useState(0);
  const [range, setRange] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedRange = useDebounced(range, 400);
  const apiMin = debouncedRange && bounds && debouncedRange.min > bounds.min ? debouncedRange.min : undefined;
  const apiMax = debouncedRange && bounds && debouncedRange.max < bounds.max ? debouncedRange.max : undefined;

  const cacheKey = `top_users_${role}_${minRating || 0}_${apiMin || ''}_${apiMax || ''}`;
  const cachedUsersData = getCached(cacheKey);

  const [users, setUsers] = useState(cachedUsersData?.users || []);
  const [total, setTotal] = useState(cachedUsersData?.total || 0);
  const [hasMore, setHasMore] = useState(cachedUsersData?.has_more || false);
  const [minReviews, setMinReviews] = useState(cachedUsersData?.min_reviews || 3);
  const [loading, setLoading] = useState(!cachedUsersData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const paramsRef = useRef({ role });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const params = { role, minRating: minRating || undefined, minPrice: apiMin, maxPrice: apiMax };
      paramsRef.current = params;
      const key = `top_users_${role}_${minRating || 0}_${apiMin || ''}_${apiMax || ''}`;
      const cached = getCached(key);
      if (!cached) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getTopUsers({ ...params, limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        setUsers(res.data.users);
        setTotal(res.data.total);
        setHasMore(res.data.has_more);
        setBounds(res.data.price_bounds);
        setMinReviews(res.data.min_reviews);
        setCached(key, res.data);
      } catch (err) {
        if (cancelled) return;
        setUsers([]);
        setError(err.message || 'Could not load the top users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [role, minRating, apiMin, apiMax]);

  async function loadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const res = await getTopUsers({ ...paramsRef.current, limit: PAGE_SIZE, offset: users.length });
      setUsers((prev) => [...prev, ...res.data.users]);
      setTotal(res.data.total);
      setHasMore(res.data.has_more);
    } catch (err) {
      setError(err.message || 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  }

  function changeTab(next) {
    if (next === tab) return;
    setMinRating(0);
    setRange(null);
    setBounds(null);
    const nextRole = next === 'clients' ? 'customer' : 'freelancer';
    const nextKey = `top_users_${nextRole}_0__`;
    const cached = getCached(nextKey);
    if (cached) {
      setUsers(cached.users || []);
      setTotal(cached.total || 0);
      setHasMore(cached.has_more || false);
      setBounds(cached.price_bounds || null);
      setMinReviews(cached.min_reviews || 3);
      setLoading(false);
    } else {
      setUsers([]);
      setLoading(true);
    }
    setSearchParams(next === 'clients' ? { tab: 'clients' } : {});
  }

  function resetFilters() {
    setMinRating(0);
    setRange(null);
  }

  const filtersActive = minRating > 0 || apiMin !== undefined || apiMax !== undefined;
  const who = isFreelancer ? 'freelancers' : 'clients';

function TopUsersSkeleton() {
  return (
    <div className="row g-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div className="col-12 col-md-6 col-xl-4" key={i}>
          <div className="card shadow-sm border-0 h-100 p-4 bg-white">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="skeleton-box rounded-circle flex-shrink-0" style={{ width: 56, height: 56 }} />
              <div className="flex-grow-1">
                <div className="skeleton-box mb-2" style={{ width: "70%", height: 16 }} />
                <div className="skeleton-box" style={{ width: "40%", height: 12 }} />
              </div>
            </div>
            <div className="skeleton-box mb-2" style={{ width: "100%", height: 12 }} />
            <div className="skeleton-box mb-3" style={{ width: "80%", height: 12 }} />
            <div className="d-flex gap-2 mt-auto">
              <div className="skeleton-box rounded-pill" style={{ width: 60, height: 24 }} />
              <div className="skeleton-box rounded-pill" style={{ width: 70, height: 24 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

  return (
    <>
      {loading && (
        <div className="loading-bar-container" style={{ position: "sticky", top: 0, zIndex: 100, margin: "-1rem -1rem 1rem -1rem" }}>
          <div className="loading-bar-indeterminate" />
        </div>
      )}

      <div className="page-header d-flex justify-content-between align-items-center">
        <div>
          <h1 className="page-title">Top users</h1>
          <p className="page-subtitle">
            Ranked by average rating. Only {who} with at least {minReviews} reviews are listed.
          </p>
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="btn btn-outline-secondary d-md-none rounded-pill"
        >
          <i className="bi bi-funnel"></i> Filters{filtersActive ? ' •' : ''}
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-3 col-lg-4 sticky-filter">
          <FiltersSidebar
            isFreelancer={isFreelancer}
            minRating={minRating}
            setMinRating={setMinRating}
            range={range}
            setRange={setRange}
            bounds={bounds}
            resetFilters={resetFilters}
            resultCount={total}
            who={who}
            open={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            filtersActive={filtersActive}
          />
        </div>

        <div className="col-12 col-xl-9 col-lg-8">
          <div className="d-flex gap-2 mb-4 border-bottom pb-2">
            {[
              { id: 'freelancers', label: 'Freelancers' },
              { id: 'clients', label: 'Clients' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => changeTab(t.id)}
                className={`btn rounded-pill px-4 ${
                  tab === t.id
                    ? 'text-white'
                    : 'btn-outline-secondary border-0'
                }`}
                style={tab === t.id ? { backgroundColor: '#FF5A1E' } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && <TopUsersSkeleton />}

          {!loading && error && users.length === 0 && (
              <StateCard
                title="Couldn't load the top users"
                body={error}
                action={{ label: 'Try again', onClick: () => window.location.reload() }}
              />
            )}

            {!loading && !error && users.length === 0 && (
              <StateCard
                title={filtersActive ? 'No one matches those filters' : `No top ${who} yet`}
                body={
                  filtersActive
                    ? 'Try a lower minimum rating or a wider price range.'
                    : `${isFreelancer ? 'Freelancers' : 'Clients'} show up here once they've received at least ${minReviews} reviews.`
                }
                action={filtersActive ? { label: 'Reset filters', onClick: resetFilters } : undefined}
              />
            )}

            {!loading && users.length > 0 && (
              <>
                <div className="row g-4">
                  {users.map((u, i) => (
                    <div className="col-12 col-md-6 col-xl-4" key={u.user_id || u.id || i}>
                      <TopUserCard user={u} role={role} rank={i + 1} />
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="alert alert-danger mt-4 text-center py-2">
                    {error}
                  </div>
                )}

                {hasMore && (
                  <div className="mt-5 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="btn btn-outline-dark rounded-pill px-4"
                    >
                      {loadingMore ? 'Loading...' : `Load more (${total - users.length} left)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <BackToTop />
      </>
    );
  }

function FiltersSidebar({
  isFreelancer,
  minRating,
  setMinRating,
  range,
  setRange,
  bounds,
  resetFilters,
  resultCount,
  who,
  open,
  setFiltersOpen,
  filtersActive
}) {
  const priceLabel = isFreelancer ? 'Average price' : 'Average budget';
  const low = range ? range.min : bounds?.min;
  const high = range ? range.max : bounds?.max;

  return (
    <div className={`card shadow-sm border-0 ${open ? 'd-block' : 'd-none d-md-block'}`}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="card-title fw-bold mb-0">Filters</h5>
          <span className="badge bg-light border text-dark rounded-pill">
            {resultCount} {resultCount === 1 ? who.replace(/s$/, '') : who}
          </span>
        </div>

        <div className="mb-4">
          <label className="form-label text-muted small fw-bold text-uppercase">Star rating</label>
          <div className="d-flex flex-column gap-2">
            {RATING_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`d-flex align-items-center gap-2 rounded-3 border p-2 cursor-pointer ${
                  minRating === o.value
                    ? 'border-warning bg-light'
                    : 'border-secondary-subtle'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="min-rating"
                  className="form-check-input mt-0"
                  checked={minRating === o.value}
                  onChange={() => setMinRating(o.value)}
                />
                {o.value > 0 && <i className="bi bi-star-fill text-warning small"></i>}
                <span className="small">{o.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="form-label text-muted small fw-bold text-uppercase mb-0">{priceLabel}</span>
            {range && (
              <button
                onClick={() => setRange(null)}
                className="btn btn-link btn-sm p-0 text-decoration-none"
                style={{ color: '#FF5A1E' }}
              >
                Reset
              </button>
            )}
          </div>

          {bounds ? (
            <>
              <input
                type="range"
                className="form-range mb-3"
                min={bounds.min}
                max={bounds.max}
                value={Math.min(Math.max(high, bounds.min), bounds.max)}
                onChange={(e) => setRange({ min: low, max: Number(e.target.value) })}
              />
              <div className="row g-2">
                <div className="col-6">
                  <label className="text-muted" style={{ fontSize: '11px' }}>From, ₱</label>
                  <input
                    type="number"
                    min={0}
                    value={low}
                    onChange={(e) => setRange({ min: Number(e.target.value) || 0, max: high })}
                    className="form-control form-control-sm"
                  />
                </div>
                <div className="col-6">
                  <label className="text-muted" style={{ fontSize: '11px' }}>To, ₱</label>
                  <input
                    type="number"
                    min={0}
                    value={high}
                    onChange={(e) => setRange({ min: low, max: Number(e.target.value) || 0 })}
                    className="form-control form-control-sm"
                  />
                </div>
              </div>
              <p className="mt-2 text-muted" style={{ fontSize: '12px' }}>
                Listed range: ₱{Number(bounds.min).toLocaleString()} to ₱{Number(bounds.max).toLocaleString()}
              </p>
            </>
          ) : (
            <p className="text-muted" style={{ fontSize: '12px' }}>
              No {isFreelancer ? 'prices' : 'budgets'} to filter yet. They come from completed contracts.
            </p>
          )}
        </div>

        <button
          onClick={resetFilters}
          className="btn btn-outline-secondary w-100"
        >
          Reset all
        </button>
      </div>
    </div>
  );
}

function StateCard({ title, body, action }) {
  return (
    <div className="card text-center p-5 shadow-sm border-0 mb-4">
      <div className="card-body">
        <h5 className="card-title fw-bold">{title}</h5>
        {body && <p className="card-text text-muted">{body}</p>}
        {action && (
          <button onClick={action.onClick} className="btn mt-3 rounded-pill" style={{ backgroundColor: '#FF5A1E', color: '#fff' }}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function TopUserCard({ user, role, rank }) {
  const isFreelancer = role === 'freelancer';
  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body text-center position-relative p-0">
        <span className="badge bg-light border text-dark rounded-pill position-absolute top-0 start-0 m-3">
          #{rank}
        </span>
        <img 
          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name || user.name || 'User')}&background=random`} 
          alt="Avatar" 
          className="rounded-circle mb-3 border" 
          style={{ width: "80px", height: "80px", objectFit: "cover" }} 
        />
        <h5 className="card-title fw-bold mb-1">{user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.name || user.full_name || 'User'}</h5>
        <div className="mb-2">
           <span className="text-warning"><i className="bi bi-star-fill"></i> {user.average_rating ? Number(user.average_rating).toFixed(1) : "0.0"}</span>
           <span className="text-muted small ms-1">({user.review_count || 0} reviews)</span>
        </div>
        <div className="text-muted small mb-3">
          {isFreelancer ? 'Avg Price: ' : 'Avg Budget: '}
          <span className="fw-medium text-dark">₱{Number(user.average_price || user.average_budget || 0).toLocaleString()}</span>
        </div>
        <Link to={`/profile/${user.user_id || user.id}`} className="btn btn-outline-dark btn-sm w-100 rounded-pill">
          View Profile
        </Link>
      </div>
    </div>
  );
}

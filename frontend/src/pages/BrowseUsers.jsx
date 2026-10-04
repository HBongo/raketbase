import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { browseUsers } from '../services/api';
import Money from '../components/Money';
import BackToTop from '../components/BackToTop';
import TopUsers from './TopUsers';

const PAGE_SIZE = 12;

const SORTS = [
  { id: 'top', label: 'Top rated' },
  { id: 'reviews', label: 'Most reviews' },
  { id: 'newest', label: 'Newest members' },
];

const TABS = [
  { id: 'freelancers', label: 'Freelancers' },
  { id: 'clients', label: 'Clients' },
];

// Browse every freelancer or client, or switch to the ranked Top users view.
// URL params: tab=clients, view=top, q=<search>, sort=<id>
export default function BrowseUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'top' ? 'top' : 'all';
  const tab = searchParams.get('tab') === 'clients' ? 'clients' : 'freelancers';
  const role = tab === 'clients' ? 'customer' : 'freelancer';
  const sort = SORTS.some((s) => s.id === searchParams.get('sort')) ? searchParams.get('sort') : 'top';
  const urlQuery = searchParams.get('q') || '';

  const [search, setSearch] = useState(urlQuery);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  function updateParams(changes) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      return params;
    }, { replace: true });
  }

  // Push the search box into the URL once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== urlQuery) updateParams({ q: search.trim() });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (view !== 'all') return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await browseUsers({ role, q: urlQuery, sort, limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        setUsers(res.data?.users || []);
        setTotal(res.data?.total || 0);
        setHasMore(!!res.data?.has_more);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load profiles.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [view, role, urlQuery, sort]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await browseUsers({ role, q: urlQuery, sort, limit: PAGE_SIZE, offset: users.length });
      setUsers((prev) => [...prev, ...(res.data?.users || [])]);
      setHasMore(!!res.data?.has_more);
    } catch (err) {
      setError(err.message || 'Could not load more profiles.');
    } finally {
      setLoadingMore(false);
    }
  }

  const who = tab === 'clients' ? 'clients' : 'freelancers';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Browse users</h1>
          <p className="page-subtitle">
            {view === 'top'
              ? 'The highest-rated freelancers and clients on RaketBase.'
              : 'Find freelancers and clients, see their ratings and what people say about them.'}
          </p>
        </div>
        <div className="btn-group flex-shrink-0" role="group" aria-label="Choose view">
          <button
            type="button"
            className={`btn btn-sm px-3 fw-medium ${view === 'all' ? 'text-white' : 'btn-outline-secondary'}`}
            style={view === 'all' ? { backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' } : {}}
            onClick={() => updateParams({ view: null })}
            aria-pressed={view === 'all'}
          >
            <i className="bi bi-people me-1"></i>All users
          </button>
          <button
            type="button"
            className={`btn btn-sm px-3 fw-medium ${view === 'top' ? 'text-white' : 'btn-outline-secondary'}`}
            style={view === 'top' ? { backgroundColor: '#FF5A1E', borderColor: '#FF5A1E' } : {}}
            onClick={() => updateParams({ view: 'top' })}
            aria-pressed={view === 'top'}
          >
            <i className="bi bi-trophy me-1"></i>Top users
          </button>
        </div>
      </div>

      {view === 'top' ? (
        <TopUsers embedded />
      ) : (
        <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-4 border-bottom pb-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateParams({ tab: t.id === 'clients' ? 'clients' : null })}
                className={`btn rounded-pill px-4 py-2 fw-medium ${tab === t.id ? 'text-white' : 'btn-outline-secondary border-0'}`}
                style={tab === t.id ? { backgroundColor: '#FF5A1E' } : {}}
              >
                {t.label}
              </button>
            ))}

            <div className="ms-md-auto d-flex flex-wrap gap-2">
              <div className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
                <i className="bi bi-search position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}></i>
                <input
                  type="search"
                  className="form-control rounded-pill ps-5"
                  placeholder={`Search ${who} by name, company or skill`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={`Search ${who}`}
                />
              </div>
              <select
                className="form-select rounded-pill"
                style={{ width: 'auto' }}
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value === 'top' ? null : e.target.value })}
                aria-label="Sort by"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="text-center text-muted py-5">
              <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
              Loading {who}...
            </div>
          )}

          {!loading && error && (
            <div className="alert alert-danger small" role="alert">{error}</div>
          )}

          {!loading && !error && users.length === 0 && (
            <div className="card text-center py-5 border">
              <div className="card-body">
                <h5 className="fw-medium mb-1">{urlQuery ? `No ${who} match "${urlQuery}"` : `No ${who} yet`}</h5>
                {urlQuery && (
                  <button type="button" className="btn btn-outline-dark btn-sm rounded-pill mt-3" onClick={() => setSearch('')}>
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && users.length > 0 && (
            <>
              <p className="text-muted small mb-3">{total} {total === 1 ? who.slice(0, -1) : who}</p>
              <div className="row g-4 mb-4">
                {users.map((u) => (
                  <div className="col-12 col-md-6 col-xxl-4" key={u.user_id}>
                    <UserCard user={u} isFreelancer={role === 'freelancer'} />
                  </div>
                ))}
              </div>
              {hasMore && (
                <div className="text-center mb-4">
                  <button type="button" className="btn btn-outline-dark rounded-pill px-4" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : `Load more (${total - users.length} left)`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <BackToTop />
    </>
  );
}

function UserCard({ user, isFreelancer }) {
  const initial = (user.name?.[0] || 'U').toUpperCase();
  const subtitle = isFreelancer
    ? (user.skills || []).join(' · ')
    : user.company_name;

  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body d-flex flex-column p-4">
        <div className="d-flex align-items-center gap-3 mb-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="rounded-circle border flex-shrink-0" style={{ width: 56, height: 56, objectFit: 'cover' }} />
          ) : (
            <div
              className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
              style={{ width: 56, height: 56, fontSize: '1.3rem' }}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <Link to={`/profile/${user.user_id}`} className="text-decoration-none text-dark">
              <h5 className="fw-bold mb-0 text-truncate">{user.name}</h5>
            </Link>
            {subtitle && <p className="small text-muted mb-0 text-truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="row g-2 mb-3 text-center">
          <div className="col-6">
            <div className="bg-light rounded-3 p-2 h-100">
              <div className="fw-bold">
                {user.count > 0 ? (
                  <><i className="bi bi-star-fill text-warning me-1"></i>{Number(user.average).toFixed(1)}</>
                ) : '—'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                {user.count > 0 ? `${user.count} ${user.count === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="bg-light rounded-3 p-2 h-100">
              <div className="fw-bold text-success">
                {user.avg_price != null ? <Money amount={user.avg_price} currency="PHP" /> : '—'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                {isFreelancer ? 'Avg price' : 'Avg budget'}
                {user.completed_contracts > 0 && ` · ${user.completed_contracts} done`}
              </div>
            </div>
          </div>
        </div>

        <h6 className="small fw-bold text-uppercase text-muted mb-2" style={{ letterSpacing: '0.04em' }}>Latest reviews</h6>
        {user.latest_reviews.length === 0 ? (
          <p className="small text-muted fst-italic mb-3">No reviews yet.</p>
        ) : (
          <ul className="list-unstyled mb-3 d-flex flex-column gap-2">
            {user.latest_reviews.map((r) => (
              <li key={r.review_id} className="border rounded-3 p-2">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <span className="text-warning small text-nowrap" aria-label={`${r.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i key={n} className={n <= r.rating ? 'bi bi-star-fill' : 'bi bi-star'}></i>
                    ))}
                  </span>
                  <span className="text-muted text-nowrap" style={{ fontSize: '0.7rem' }}>{formatDate(r.created_at)}</span>
                </div>
                <p className="small mb-1 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.comment || <span className="text-muted fst-italic">No written comment</span>}
                </p>
                <p className="text-muted mb-0 text-truncate" style={{ fontSize: '0.72rem' }}>
                  — {r.reviewer_name}{r.job_title ? ` · ${r.job_title}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}

        <Link to={`/profile/${user.user_id}`} className="btn btn-outline-dark btn-sm w-100 rounded-pill mt-auto">
          View profile
        </Link>
      </div>
    </div>
  );
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

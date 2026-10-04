// AdminActivityLog.jsx — Everyone's activity for admins: search, filter by type, date and person.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminActivity } from '../services/api';
import { ACTIVITY_CATEGORIES, categoryIcon, formatActivityTime } from '../utils/activity';

import { useLive } from '../utils/useLive';
const PAGE_SIZE = 25;

// userFilter: { id, name } to show one person's activity, or null; onClearUser() removes it
export default function AdminActivityLog({ userFilter, onClearUser }) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // the search actually applied (on submit)
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);

  const userId = userFilter?.id || '';
  // Bumped by live updates so new entries appear without refreshing
  const [liveTick, setLiveTick] = useState(0);
  useLive(['admin'], () => setLiveTick((t) => t + 1), 800);
  const key = [category, query, from, to, page, userId].join('|');

  useEffect(() => {
    let cancelled = false;
    getAdminActivity({ category, q: query, from, to, user_id: userId, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((res) => { if (!cancelled) setResult({ key, ...res.data }); })
      .catch((err) => { if (!cancelled) setResult({ key, error: err.message || 'Could not load the activity log.' }); });
    return () => { cancelled = true; };
  }, [key, category, query, from, to, page, userId, liveTick]);

  // Any filter change goes back to the first page
  const filterSetter = (setter) => (value) => { setter(value); setPage(0); };
  // Keep showing the current page while a live refresh of the same filters loads
  const current = result?.key === key ? result : null;
  const totalPages = current?.total ? Math.ceil(current.total / PAGE_SIZE) : 1;

  return (
    <div className="card shadow-sm mt-4" id="activity-log">
      <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
        <h5 className="mb-0 fw-bold fs-6">Activity Log</h5>
        <small className="text-muted">{current?.total != null ? `${current.total} entries` : ''}</small>
      </div>

      <div className="card-body border-bottom">
        <form
          className="row g-2 align-items-end"
          onSubmit={(e) => { e.preventDefault(); filterSetter(setQuery)(search.trim()); }}
        >
          <div className="col-12 col-md-4">
            <label className="form-label small text-muted mb-1" htmlFor="activity-search">Search</label>
            <div className="input-group input-group-sm">
              <input
                id="activity-search"
                type="search"
                className="form-control"
                placeholder="Name, email, or what happened"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-outline-secondary" aria-label="Search"><i className="bi bi-search"></i></button>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small text-muted mb-1" htmlFor="activity-category">Type</label>
            <select id="activity-category" className="form-select form-select-sm" value={category} onChange={(e) => filterSetter(setCategory)(e.target.value)}>
              {ACTIVITY_CATEGORIES.map((c) => <option key={c.id || 'all'} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-muted mb-1" htmlFor="activity-from">From</label>
            <input id="activity-from" type="date" className="form-control form-control-sm" value={from} onChange={(e) => filterSetter(setFrom)(e.target.value)} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label small text-muted mb-1" htmlFor="activity-to">To</label>
            <input id="activity-to" type="date" className="form-control form-control-sm" value={to} onChange={(e) => filterSetter(setTo)(e.target.value)} />
          </div>
          <div className="col-6 col-md-1">
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none px-0"
              onClick={() => { setCategory(''); setSearch(''); setQuery(''); setFrom(''); setTo(''); setPage(0); onClearUser?.(); }}
            >
              Clear
            </button>
          </div>
        </form>
        {userFilter && (
          <div className="mt-2">
            <span className="badge rounded-pill bg-dark px-3 py-2 fw-medium">
              Only {userFilter.name}
              <button type="button" className="btn-close btn-close-white ms-2" style={{ fontSize: '0.55rem' }} aria-label="Show everyone" onClick={() => { onClearUser(); setPage(0); }}></button>
            </span>
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px', width: '170px' }}>When</th>
              <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Who</th>
              <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>What happened</th>
            </tr>
          </thead>
          <tbody>
            {!current ? (
              <tr><td colSpan={3} className="text-center text-muted small py-4"><span className="spinner-border spinner-border-sm me-2"></span>Loading...</td></tr>
            ) : current.error ? (
              <tr><td colSpan={3} className="text-danger small py-4 px-3">{current.error}</td></tr>
            ) : current.items.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted small py-4">No activity matches these filters.</td></tr>
            ) : (
              current.items.map((item) => (
                <tr key={item.activity_id}>
                  <td className="text-muted text-nowrap" style={{ padding: '12px 16px', fontSize: '13px' }}>{formatActivityTime(item.created_at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    {item.user ? (
                      <>
                        <Link to={`/profile/${item.user_id}`} className="fw-medium text-dark text-decoration-none">{item.user.name}</Link>
                        <div className="text-muted" style={{ fontSize: '12px' }}>{item.user.email}</div>
                      </>
                    ) : (
                      <span className="text-muted">Unknown / deleted</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                    <i className={`bi ${categoryIcon(item.category)} text-muted me-2`}></i>
                    {item.description}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {current && !current.error && current.total > PAGE_SIZE && (
        <div className="card-footer bg-light d-flex justify-content-between align-items-center">
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <i className="bi bi-chevron-left"></i> Newer
          </button>
          <small className="text-muted">Page {page + 1} of {totalPages}</small>
          <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!current.has_more} onClick={() => setPage((p) => p + 1)}>
            Older <i className="bi bi-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}

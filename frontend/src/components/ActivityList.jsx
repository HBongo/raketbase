// ActivityList.jsx — Your own activity log (Profile → Activity), newest first.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyActivity } from '../services/api';
import { ACTIVITY_CATEGORIES, categoryIcon, formatActivityTime } from '../utils/activity';

const PAGE_SIZE = 30;

export default function ActivityList({ isAdmin = false }) {
  const [category, setCategory] = useState('');
  // Results are tagged with the filter they were loaded for, so switching filters never
  // shows the old list while the new one loads
  const [result, setResult] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyActivity({ category, limit: PAGE_SIZE })
      .then((res) => { if (!cancelled) setResult({ category, ...res.data }); })
      .catch((err) => { if (!cancelled) setResult({ category, error: err.message || 'Could not load your activity.' }); });
    return () => { cancelled = true; };
  }, [category]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await getMyActivity({ category, limit: PAGE_SIZE, offset: result.items.length });
      setResult((prev) => ({ ...prev, items: [...prev.items, ...res.data.items], has_more: res.data.has_more }));
    } catch {
      // keep what's already shown
    } finally {
      setLoadingMore(false);
    }
  }

  const current = result?.category === category ? result : null;
  const categories = ACTIVITY_CATEGORIES.filter((c) => c.id !== 'admin' || isAdmin);

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0">
        <h5 className="fw-bold text-dark mb-0"><i className="bi bi-clock-history me-2 text-muted"></i>My Activity</h5>
        <p className="text-muted small mb-0 mt-1">Only you can see this.</p>
      </div>
      <div className="card-body px-4 pb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          {categories.map((c) => (
            <button
              key={c.id || 'all'}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${category === c.id ? 'btn-dark' : 'btn-outline-secondary'}`}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
            >
              {c.label}
            </button>
          ))}
        </div>

        {!current ? (
          <div className="text-center py-4 text-muted small"><span className="spinner-border spinner-border-sm me-2"></span>Loading...</div>
        ) : current.error ? (
          <p className="text-danger small mb-0">{current.error}</p>
        ) : current.items.length === 0 ? (
          <p className="text-muted fst-italic text-center py-3 mb-0">Nothing here yet.</p>
        ) : (
          <>
            <ul className="list-unstyled mb-0">
              {current.items.map((item, i) => (
                <li key={item.activity_id} className={`d-flex gap-3 py-2 ${i > 0 ? 'border-top' : ''}`}>
                  <i className={`bi ${categoryIcon(item.category)} text-muted mt-1`}></i>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="small text-dark">
                      {item.link ? <Link to={item.link} className="text-dark">{item.description}</Link> : item.description}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formatActivityTime(item.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
            {current.has_more && (
              <div className="text-center mt-3">
                <button type="button" className="btn btn-outline-dark btn-sm rounded-pill px-4" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

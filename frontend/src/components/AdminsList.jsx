// AdminsList.jsx — Browse Users → Admins (admins only): every admin account, with a
// Message button that opens (or starts) a private admin team chat.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdmins } from '../services/api';
import StartChatModal from './StartChatModal';

function adminName(a) {
  return [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
}

export default function AdminsList() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [messaging, setMessaging] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAdmins()
      .then((res) => { if (!cancelled) setAdmins(res.data || []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load admin accounts.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const q = search.trim().toLowerCase();
  const shown = admins.filter((a) => !q || adminName(a).toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q));

  function openChat(admin) {
    if (admin.conversation_id) navigate(`/messages/${admin.conversation_id}`);
    else setMessaging(admin);
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4 border-bottom pb-3">
        <span className="text-muted small">
          {loading ? 'Loading admin accounts...' : `${admins.length} admin account${admins.length === 1 ? '' : 's'}`}
        </span>
        <div className="ms-md-auto position-relative" style={{ minWidth: '240px' }}>
          <i className="bi bi-search position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}></i>
          <input
            type="search"
            className="form-control rounded-pill ps-5"
            placeholder="Search admins by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search admins"
          />
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && shown.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="bi bi-shield-lock fs-2 d-block mb-2 opacity-50"></i>
          No admins match your search.
        </div>
      )}

      <div className="row g-3">
        {shown.map((a) => (
          <div key={a.user_id} className="col-md-6 col-xl-4">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body d-flex align-items-center gap-3">
                {a.avatar_url ? (
                  <img src={a.avatar_url} alt="" className="rounded-circle flex-shrink-0" style={{ width: 52, height: 52, objectFit: 'cover' }} />
                ) : (
                  <div className="rounded-circle bg-dark text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold" style={{ width: 52, height: 52 }}>
                    {adminName(a).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-bold text-truncate">
                    {adminName(a)}
                    {a.is_me && <span className="badge rounded-pill bg-secondary ms-2 fw-normal">You</span>}
                  </div>
                  <div className="small text-muted text-truncate">{a.email}</div>
                  <div className="small text-muted">
                    <span className="badge rounded-pill bg-dark me-1"><i className="bi bi-shield-check me-1"></i>Admin</span>
                    {a.status !== 'active' && <span className="badge rounded-pill bg-danger me-1">{a.status}</span>}
                    Since {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
                {!a.is_me && a.status === 'active' && (
                  <button type="button" className="btn btn-sm btn-outline-dark rounded-pill px-3 flex-shrink-0" onClick={() => openChat(a)}>
                    <i className="bi bi-chat-dots me-1"></i>Message
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {messaging && (
        <StartChatModal
          recipientId={messaging.user_id}
          recipientName={adminName(messaging)}
          adminChat
          onClose={() => setMessaging(null)}
        />
      )}
    </>
  );
}

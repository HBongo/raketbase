import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAdminAnalytics,
  getAdminUsers,
  updateUserStatus,
  listDisputes,
  resolveDispute,
} from '../services/api';

const MOCK_ANALYTICS = {
  total_users: 24,
  active_contracts: 6,
  platform_revenue: 128500,
  open_disputes: 2,
};

const MOCK_USERS = [
  { user_id: 'mock-1', email: 'juan.delacruz@example.com', first_name: 'Juan', last_name: 'Dela Cruz', role: 'customer', active_role: 'customer', status: 'active' },
  { user_id: 'mock-2', email: 'maria.santos@example.com', first_name: 'Maria', last_name: 'Santos', role: 'customer', active_role: 'freelancer', status: 'active' },
  { user_id: 'mock-3', email: 'pedro.reyes@example.com', first_name: 'Pedro', last_name: 'Reyes', role: 'customer', active_role: 'freelancer', status: 'suspended' },
];

const MOCK_DISPUTES = [
  {
    dispute_id: 'mock-d1',
    status: 'open',
    reason: '[Incomplete Work] Freelancer delivered only half of the agreed scope and stopped responding after the deadline passed.',
    created_at: new Date().toISOString(),
    contracts: { agreed_amount: 15000, jobs: { title: 'Logo & Brand Kit Design' } },
  },
  {
    dispute_id: 'mock-d2',
    status: 'under_review',
    reason: '[Non-Payment] Work was submitted and approved but escrow funds were never released.',
    created_at: new Date().toISOString(),
    contracts: { agreed_amount: 8000, jobs: { title: 'Landing Page Development' } },
  },
];

const STATUS_STYLES = {
  open: 'bg-danger text-white',
  under_review: 'bg-warning text-dark',
  resolved: 'bg-success text-white',
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actioningId, setActioningId] = useState(null);
  const [resolvingDispute, setResolvingDispute] = useState(null); // dispute object mid-resolution
  const [resolutionNotes, setResolutionNotes] = useState('');

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const [analyticsRes, disputesRes, usersRes] = await Promise.all([
        getAdminAnalytics(),
        listDisputes(),
        getAdminUsers(),
      ]);

      setAnalytics(analyticsRes.data);
      setDisputes(disputesRes.data || []);
      setUsers(usersRes.data || []);
      setUsingMockData(false);
    } catch (err) {
      console.warn('Admin data fetch failed, showing mock data:', err.message);
      setAnalytics(MOCK_ANALYTICS);
      setDisputes(MOCK_DISPUTES);
      setUsers(MOCK_USERS);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleResolve(resolution) {
    if (!resolvingDispute) return;
    setActionError('');
    setActionSuccess('');
    setActioningId(resolvingDispute.dispute_id);

    if (usingMockData) {
      setDisputes((prev) =>
        prev.map((d) =>
          d.dispute_id === resolvingDispute.dispute_id ? { ...d, status: 'resolved' } : d
        )
      );
      setActionSuccess('(Mock) Dispute marked as resolved.');
      setResolvingDispute(null);
      setResolutionNotes('');
      setActioningId(null);
      return;
    }

    try {
      await resolveDispute(resolvingDispute.dispute_id, { resolution, notes: resolutionNotes });
      setActionSuccess('Dispute resolved successfully.');
      setResolvingDispute(null);
      setResolutionNotes('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to resolve dispute.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleToggleUserStatus(targetUser) {
    const nextStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    setActionError('');
    setActionSuccess('');
    setActioningId(targetUser.user_id);

    if (usingMockData) {
      setUsers((prev) =>
        prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, status: nextStatus } : u))
      );
      setActionSuccess(`(Mock) User marked as ${nextStatus}.`);
      setActioningId(null);
      return;
    }

    try {
      await updateUserStatus(targetUser.user_id, nextStatus);
      setActionSuccess(`User ${targetUser.email} is now ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to update user status.');
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center">
        <p className="text-muted">Loading platform metrics...</p>
      </div>
    );
  }

  const openDisputes = disputes.filter((d) => d.status !== 'resolved');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

  return (
    <>
      {/* Sidebar */}
      <div className="sidebar-wrapper" id="sidebar">
        <Link to="/" className="sidebar-brand text-decoration-none d-flex align-items-center gap-1" style={{ padding: "10px 0" }}>
          <img src="/racketbaseSVG.svg" alt="RaketBase Logo" style={{ height: "50px", objectFit: "contain", marginTop: "-8px" }} />
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "24px", color: "#fff", letterSpacing: "0.5px", display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 800 }}>RAKET</span>
            <span style={{ fontWeight: 400 }}>BASE</span>
          </div>
        </Link>
        <div className="flex-grow-1 overflow-y-auto mt-4">
          {/* Menu Section */}
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Menu</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/dashboard" className="sidebar-menu-link active">
                  <i className="bi bi-grid-fill"></i><span>Dashboard</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className="sidebar-menu-link">
                  <i className="bi bi-chat-dots"></i><span>Messages</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/top-users" className="sidebar-menu-link">
                  <i className="bi bi-star"></i><span>Top Freelancers</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to={`/freelancer/${user?.user_id || user?.id}`} className="sidebar-menu-link">
                  <i className="bi bi-person"></i><span>My Account</span>
                </Link>
              </li>
            </ul>
          </div>
          {/* Jobs Section */}
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Jobs</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/explore" className="sidebar-menu-link">
                  <i className="bi bi-search"></i><span>Explore Jobs</span>
                </Link>
              </li>
              {user?.active_role === "freelancer" && (
                <li className="sidebar-menu-item">
                  <Link to="/my-proposals" className="sidebar-menu-link">
                    <i className="bi bi-file-earmark-text"></i><span>My Proposals</span>
                  </Link>
                </li>
              )}
              {user?.active_role === "customer" && (
                <>
                  <li className="sidebar-menu-item">
                    <Link to="/my-jobs" className="sidebar-menu-link">
                      <i className="bi bi-briefcase"></i><span>My Postings</span>
                    </Link>
                  </li>
                  <li className="sidebar-menu-item">
                    <Link to="/jobs/create" className="sidebar-menu-link">
                      <i className="bi bi-plus-circle"></i><span>Post a Job</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-wrapper">
        <div className="header-container fixed-top" style={{ position: "sticky" }}>
          <header className="header navbar navbar-expand-sm expand-header">
            <div className="navbar-left">
              <button className="sidebar-toggle-btn me-2" id="sidebar-toggle">
                <i className="bi bi-list"></i>
              </button>
            </div>
            <div className="navbar-search-wrapper">
              <input type="text" className="navbar-search-input" placeholder="Search..." />
              <i className="bi bi-search search-icon"></i>
            </div>
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                <div className="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border">
                  <span className="small text-muted fw-medium text-capitalize">{user?.active_role || 'Admin'} Mode</span>
                </div>
              </li>
              <li className="nav-item">
                <Link to={`/freelancer/${user?.user_id}`} className="nav-link d-flex align-items-center">
                  <img src={user?.avatar_url || "https://ui-avatars.com/api/?name=Admin&background=random"} alt="Profile" className="rounded-circle border" style={{ width: "36px", height: "36px", objectFit: "cover" }} />
                </Link>
              </li>
            </ul>
          </header>
        </div>

        {/* Page Content Here */}
        <div className="row g-4 mb-4">
          <div className="col-12">
            
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 border-bottom pb-3">
              <div>
                <h2 className="fw-bold mb-1">Admin Dashboard</h2>
                <p className="text-muted small mb-0">
                  Platform metrics, dispute resolution, and user management.
                </p>
              </div>
              <span className="badge bg-light border text-dark rounded-pill py-2 px-3 text-uppercase tracking-wider">
                {user.role || 'Admin'} access
              </span>
            </div>

            {/* Mock data banner */}
            {usingMockData && (
              <div className="alert alert-warning small d-flex align-items-center" role="alert">
                <i className="bi bi-info-circle-fill me-2"></i>
                <div>
                  Showing sample data — the backend or database isn't reachable yet. Actions here are simulated locally and won't persist.
                </div>
              </div>
            )}

            {/* Feedback toasts */}
            {actionSuccess && (
              <div className="alert alert-success alert-dismissible fade show small" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                {actionSuccess}
                <button type="button" className="btn-close" onClick={() => setActionSuccess('')} aria-label="Close"></button>
              </div>
            )}
            {actionError && (
              <div className="alert alert-danger alert-dismissible fade show small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {actionError}
                <button type="button" className="btn-close" onClick={() => setActionError('')} aria-label="Close"></button>
              </div>
            )}

            {/* Metric Summary Cards */}
            <div className="row g-3 mb-5">
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Total Users</h6>
                    <h3 className="fw-bold mb-1">{analytics.total_users}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Registered accounts</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Active Contracts</h6>
                    <h3 className="fw-bold mb-1 text-warning">{analytics.active_contracts}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>In progress or submitted</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Platform Revenue</h6>
                    <h3 className="fw-bold mb-1 text-success">
                      ₱{Number(analytics.platform_revenue).toLocaleString()}
                    </h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>From completed contracts</small>
                  </div>
                </div>
              </div>
              <div className="col-12 col-sm-6 col-xl-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h6 className="card-title text-muted small mb-1 fw-medium">Open Disputes</h6>
                    <h3 className="fw-bold mb-1 text-danger">{analytics.open_disputes}</h3>
                    <small className="text-muted" style={{ fontSize: '11px' }}>Needing review</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Disputes Panel */}
            <div className="card shadow-sm mb-5">
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold fs-6">Dispute Resolution</h5>
                <small className="text-muted d-none d-sm-inline">
                  {openDisputes.length} open · {resolvedDisputes.length} resolved
                </small>
              </div>

              {disputes.length === 0 ? (
                <div className="card-body text-center py-5">
                  <h6 className="fw-bold mb-1">No disputes filed</h6>
                  <p className="text-muted small mb-0">All contracts are running smoothly.</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {disputes.map((d) => (
                    <div key={d.dispute_id} className="list-group-item py-4 px-4">
                      <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                        <div>
                          <h6 className="fw-bold mb-0">
                            {d.contracts?.jobs?.title || 'Contract dispute'}
                          </h6>
                          <p className="text-muted mt-1 mb-0" style={{ fontSize: '12px' }}>
                            ₱{Number(d.contracts?.agreed_amount || 0).toLocaleString()} in escrow ·{' '}
                            {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`badge rounded-pill fw-medium text-uppercase ${
                            STATUS_STYLES[d.status] || STATUS_STYLES.open
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-muted small mb-3">{d.reason}</p>
                      {d.resolution_notes && (
                        <p className="text-success small mb-3"><strong>Resolution:</strong> {d.resolution_notes}</p>
                      )}
                      {d.status !== 'resolved' && (
                        <button
                          onClick={() => setResolvingDispute(d)}
                          className="btn btn-sm btn-dark fw-medium mt-2"
                        >
                          Review & Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Management Table */}
            <div className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold fs-6">User Management</h5>
                <small className="text-muted d-none d-sm-inline">{users.length} accounts</small>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Name</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Email</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Role</th>
                      <th className="text-muted text-uppercase fw-medium" style={{ fontSize: '12px', padding: '12px 16px' }}>Status</th>
                      <th className="text-muted text-uppercase fw-medium text-end" style={{ fontSize: '12px', padding: '12px 16px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.user_id}>
                        <td className="fw-medium" style={{ padding: '12px 16px', fontSize: '14px' }}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                        </td>
                        <td className="text-muted" style={{ padding: '12px 16px', fontSize: '14px' }}>{u.email}</td>
                        <td className="text-muted text-capitalize" style={{ padding: '12px 16px', fontSize: '14px' }}>
                          {u.role}
                          {u.role === 'customer' && u.active_role ? ` (${u.active_role})` : ''}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            className={`badge rounded-pill fw-medium text-uppercase ${
                              u.status === 'suspended'
                                ? 'bg-danger text-white'
                                : 'bg-success text-white'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="text-end" style={{ padding: '12px 16px' }}>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={actioningId === u.user_id}
                              className="btn btn-sm btn-outline-secondary fw-medium"
                              style={{ fontSize: '12px' }}
                            >
                              {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Resolve Dispute Modal */}
        {resolvingDispute && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Resolve Dispute</h5>
                  <button type="button" className="btn-close" onClick={() => { setResolvingDispute(null); setResolutionNotes(''); }}></button>
                </div>
                <div className="modal-body">
                  <p className="text-muted small mb-4">
                    {resolvingDispute.contracts?.jobs?.title} — ₱
                    {Number(resolvingDispute.contracts?.agreed_amount || 0).toLocaleString()} in escrow
                  </p>

                  <div className="mb-4">
                    <label className="form-label small fw-medium text-muted mb-2">
                      Resolution notes (optional)
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      className="form-control"
                      placeholder="Add context for the resolution log..."
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      onClick={() => handleResolve('release_freelancer')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-success fw-medium"
                    >
                      Release to Freelancer
                    </button>
                    <button
                      onClick={() => handleResolve('refund_client')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-warning fw-medium"
                      style={{ backgroundColor: '#FF5A1E', color: 'white', borderColor: '#FF5A1E' }}
                    >
                      Refund Client
                    </button>
                    <button
                      onClick={() => handleResolve('split')}
                      disabled={actioningId === resolvingDispute.dispute_id}
                      className="btn btn-outline-dark fw-medium"
                    >
                      Split Funds
                    </button>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0 justify-content-center">
                  <button
                    onClick={() => { setResolvingDispute(null); setResolutionNotes(''); }}
                    className="btn btn-link text-muted text-decoration-none small"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { clearCached } from '../utils/cache';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [navSearch, setNavSearch] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setNavSearch(searchParams.get('q') || '');
  }, [searchParams]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = navSearch.trim();
    if (location.pathname.startsWith('/top-users')) {
      navigate(q ? `/top-users?q=${encodeURIComponent(q)}` : '/top-users');
    } else {
      navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    }
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setNavSearch(val);
    if (location.pathname.startsWith('/explore')) {
      navigate(val.trim() ? `/explore?q=${encodeURIComponent(val)}` : '/explore', { replace: true });
    } else if (location.pathname.startsWith('/top-users')) {
      navigate(val.trim() ? `/top-users?q=${encodeURIComponent(val)}` : '/top-users', { replace: true });
    }
  }

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const isProfileActive = location.pathname.startsWith('/freelancer') || location.pathname.startsWith('/profile');

  return (
    <>
      <div className="sidebar-wrapper" id="sidebar">
        <Link to="/dashboard" className="sidebar-brand text-decoration-none d-flex align-items-center gap-1" style={{ padding: '10px 0' }}>
          <img src="/racketbaseSVG.svg" alt="RaketBase Logo" style={{ height: '50px', objectFit: 'contain', marginTop: '-8px' }} />
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '24px', color: '#fff', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>RAKET</span>
            <span style={{ fontWeight: 400 }}>BASE</span>
          </div>
        </Link>
        <div className="flex-grow-1 overflow-y-auto mt-4">
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Menu</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/dashboard" className={`sidebar-menu-link ${isActive('/dashboard')}`}>
                  <i className="bi bi-grid-fill"></i><span>Dashboard</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i><span>Messages</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/top-users" className={`sidebar-menu-link ${isActive('/top-users')}`}>
                  <i className="bi bi-star"></i><span>Top Freelancers</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to={`/profile/${user.user_id || user.id}`} className={`sidebar-menu-link ${isProfileActive ? 'active' : ''}`}>
                  <i className="bi bi-person"></i><span>My Account</span>
                </Link>
              </li>
            </ul>
          </div>
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Jobs</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/explore" className={`sidebar-menu-link ${isActive('/explore') || isActive('/jobs') ? 'active' : ''}`}>
                  <i className="bi bi-search"></i><span>Explore Jobs</span>
                </Link>
              </li>
              {user.active_role === "freelancer" && (
                <li className="sidebar-menu-item">
                  <Link to="/my-proposals" className={`sidebar-menu-link ${isActive('/my-proposals')}`}>
                    <i className="bi bi-file-earmark-text"></i><span>My Proposals</span>
                  </Link>
                </li>
              )}
              {user.active_role === 'customer' && (
                <>
                  <li className="sidebar-menu-item">
                    <Link to="/my-jobs" className={`sidebar-menu-link ${isActive('/my-jobs') && !isActive('/jobs/create') ? 'active' : ''}`}>
                      <i className="bi bi-briefcase"></i><span>My Postings</span>
                    </Link>
                  </li>
                  <li className="sidebar-menu-item">
                    <Link to="/jobs/create" className={`sidebar-menu-link ${isActive('/jobs/create')}`}>
                      <i className="bi bi-plus-circle"></i><span>Post a Job</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className={`main-wrapper d-flex flex-column ${location.pathname.startsWith('/messages') ? 'messages-wrapper' : ''}`} style={location.pathname.startsWith('/messages') ? { height: "100vh", overflow: "hidden" } : { minHeight: "100vh" }}>
        <header className="navbar-custom" style={{ position: "sticky", top: 0, zIndex: 1020 }}>
          <div className="navbar-left">
            <button className="sidebar-toggle-btn me-2" id="sidebar-toggle">
              <i className="bi bi-list"></i>
            </button>
            {(location.pathname.includes('/messages') || location.pathname.includes('/explore/') || location.pathname.includes('/jobs/') || location.pathname.includes('/profile/') || location.pathname.includes('/my-jobs/')) && (
              <button className="btn btn-light rounded-pill px-3 ms-2 d-none d-md-flex align-items-center" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            )}
          </div>

          <div className="navbar-search-wrapper mx-3">
            {(location.pathname.includes('/explore') || location.pathname.includes('/top-users') || location.pathname.includes('/messages') || location.pathname.includes('/my-proposals')) && (
              <form onSubmit={handleSearchSubmit} className="d-flex align-items-center w-100 position-relative">
                <input
                  type="text"
                  className="navbar-search-input"
                  placeholder="Search open jobs, keywords, skills..."
                  value={navSearch}
                  onChange={handleSearchChange}
                />
                <button type="submit" className="navbar-search-btn" aria-label="Search">
                  <i className="bi bi-search"></i>
                </button>
              </form>
            )}
          </div>

          <div className="navbar-actions d-flex align-items-center gap-3">
            <div className="d-none d-md-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border">
              <span className="small text-muted fw-medium text-capitalize">{user?.active_role || 'freelancer'} Mode</span>
            </div>
            <div className="dropdown">
              <button className="navbar-profile-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src={user?.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"} alt="Profile" className="navbar-profile-img" />
                <span className="navbar-profile-name d-none d-md-inline">{user?.first_name || 'User'}</span>
                <i className="bi bi-chevron-down navbar-profile-caret"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-profile">
                <li className="dropdown-header">
                  <div className="fw-bold text-dark">{user?.first_name || 'User'} {user?.last_name || ''}</div>
                  <div className="small text-muted">{user?.email || 'user@example.com'}</div>
                </li>
                <li><Link className="dropdown-item" to={`/profile/${user?.user_id || user?.id}`}><i className="bi bi-person"></i> My Profile</Link></li>
                <li><Link className="dropdown-item" to="#"><i className="bi bi-gear"></i> Settings</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item text-danger" to="/login" onClick={() => { clearCached(); localStorage.removeItem('token'); localStorage.removeItem('user'); }}><i className="bi bi-box-arrow-right"></i> Logout</Link></li>
              </ul>
            </div>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <Outlet />

      </div>
    </>
  );
}


import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { clearCached } from '../utils/cache';
import { switchRole, getProfile } from '../services/api';
import { showToast } from '../utils/toast';
import NotificationBell from './NotificationBell';
import CurrencySelector from './CurrencySelector';

const FreelancerIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="1" width="20" height="22" rx="4" fill="#198754"/>
    <rect x="9" y="4" width="6" height="3" rx="1.5" fill="#fff"/>
    <circle cx="12" cy="11" r="3.5" fill="#fff"/>
    <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21H6Z" fill="#fff"/>
  </svg>
);

const CustomerIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 6V4C16 2.89543 15.1046 2 14 2H10C8.89543 2 8 2.89543 8 4V6H4C2.89543 6 2 6.89543 2 8V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V8C22 6.89543 21.1046 6 20 6H16ZM10 4H14V6H10V4Z" fill="#0d6efd"/>
    <path d="M2 9.5L11.2929 13.7929C11.7383 13.9984 12.2617 13.9984 12.7071 13.7929L22 9.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const [navSearch, setNavSearch] = useState(qParam);
  const [prevQ, setPrevQ] = useState(qParam);

  if (prevQ !== qParam) {
    setPrevQ(qParam);
    setNavSearch(qParam);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = navSearch.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setNavSearch(val);
    if (location.pathname.startsWith('/explore')) {
      navigate(val.trim() ? `/explore?q=${encodeURIComponent(val)}` : '/explore', { replace: true });
    }
  }

  // Re-check the account when the user changes pages or comes back to the tab, so someone an admin
  // suspends gets logged out even if they're idle. getProfile() logs out on a suspended response.
  // At most once every 30 seconds.
  const lastAccountCheck = useRef(0);
  useEffect(() => {
    function checkAccount() {
      if (document.visibilityState === 'hidden' || !localStorage.getItem('token')) return;
      const now = Date.now();
      if (now - lastAccountCheck.current < 30000) return;
      lastAccountCheck.current = now;
      getProfile().catch(() => {});
    }
    checkAccount();
    document.addEventListener('visibilitychange', checkAccount);
    window.addEventListener('focus', checkAccount);
    return () => {
      document.removeEventListener('visibilitychange', checkAccount);
      window.removeEventListener('focus', checkAccount);
    };
  }, [location.pathname]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

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
  const isExploreActive = location.pathname.startsWith('/explore') || (location.pathname.startsWith('/jobs') && !location.pathname.startsWith('/jobs/create'));

  useEffect(() => {
    if (isSidebarMinimized) {
      document.body.classList.add('sidebar-minimized');
    } else {
      document.body.classList.remove('sidebar-minimized');
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }, [isSidebarMinimized]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error(`Error attempting to exit fullscreen mode: ${err.message}`);
        });
      }
    }
  };

  const [isSwitchingRole, setIsSwitchingRole] = useState(false);

  const handleToggleRole = async () => {
    const currentRole = user?.active_role || 'freelancer';
    const newRole = currentRole === 'customer' ? 'freelancer' : 'customer';
    const targetLabel = newRole === 'customer' ? 'customer' : 'Freelancer';
    try {
      setIsSwitchingRole(true);
      showToast(`Switching to ${targetLabel} Mode...`, { loading: true, duration: 0 });
      await switchRole(newRole);
      const updatedUser = { ...user, active_role: newRole };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Redirect if the current page is role-restricted
      if (newRole === 'freelancer' && (location.pathname.startsWith('/jobs/create') || location.pathname.startsWith('/my-jobs'))) {
        window.location.href = '/explore';
      } else if (newRole === 'customer' && location.pathname.startsWith('/my-proposals')) {
        window.location.href = '/dashboard';
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
      showToast(err.message || 'Failed to switch role', { type: 'error' });
      setIsSwitchingRole(false);
    }
  };

  return (
    <>
      <div className={`sidebar-wrapper ${isMobileSidebarOpen ? 'show' : ''}`} id="sidebar">
        <Link to="/dashboard" className="sidebar-brand text-decoration-none d-flex align-items-center gap-1" style={{ padding: '10px 0' }}>
          <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="logo-shake" style={{ height: '48px', objectFit: 'contain', marginTop: '-8px' }} />
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '23px', color: '#fff', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>RAKET</span><span style={{ fontWeight: 400 }}>BASE</span>
          </div>
        </Link>
        <div className="flex-grow-1 overflow-y-auto mt-4">
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Menu</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/dashboard" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/dashboard')}`}>
                  <i className="bi bi-grid-fill"></i><span>Dashboard</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/messages" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/messages')}`}>
                  <i className="bi bi-chat-dots"></i><span>Messages</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to="/browse" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/browse')}`}>
                  <i className="bi bi-people"></i><span>Browse Users</span>
                </Link>
              </li>
              <li className="sidebar-menu-item">
                <Link to={`/profile/${user.user_id || user.id}`} onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isProfileActive ? 'active' : ''}`}>
                  <i className="bi bi-person"></i><span>My Account</span>
                </Link>
              </li>
            </ul>
          </div>
          <div className="sidebar-menu-section">
            <div className="sidebar-menu-title">Jobs</div>
            <ul className="sidebar-menu-list">
              <li className="sidebar-menu-item">
                <Link to="/explore" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isExploreActive ? 'active' : ''}`}>
                  <i className="bi bi-search"></i><span>Explore Jobs</span>
                </Link>
              </li>
              {user.active_role === "freelancer" && (
                <li className="sidebar-menu-item">
                  <Link to="/my-proposals" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/my-proposals')}`}>
                    <i className="bi bi-file-earmark-text"></i><span>My Proposals</span>
                  </Link>
                </li>
              )}
              {user.active_role === 'customer' && (
                <>
                  <li className="sidebar-menu-item">
                    <Link to="/my-jobs" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/my-jobs')}`}>
                      <i className="bi bi-briefcase"></i><span>My Postings</span>
                    </Link>
                  </li>
                  <li className="sidebar-menu-item">
                    <Link to="/jobs/create" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/jobs/create')}`}>
                      <i className="bi bi-plus-circle"></i><span>Post a Job</span>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
          {user.role === 'admin' && (
            <div className="sidebar-menu-section">
              <div className="sidebar-menu-title">Admin</div>
              <ul className="sidebar-menu-list">
                <li className="sidebar-menu-item">
                  <Link to="/admin" onClick={() => setIsMobileSidebarOpen(false)} className={`sidebar-menu-link ${isActive('/admin')}`}>
                    <i className="bi bi-shield-lock"></i><span>Admin Panel</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div 
          className="sidebar-overlay d-xl-none show" 
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1025 }}
        ></div>
      )}

      <div className={`main-wrapper d-flex flex-column ${location.pathname.startsWith('/messages') ? 'messages-wrapper' : ''}`} style={location.pathname.startsWith('/messages') ? { height: "100vh", overflow: "hidden", padding: 0 } : { minHeight: "100vh" }}>
        <header className={`navbar-custom flex-shrink-0 ${location.pathname.startsWith('/messages') ? 'messages-navbar' : ''}`} style={{ position: "sticky", top: 0, zIndex: 1020 }}>
          <div className="navbar-left">
            <button className="btn-desktop-toggle d-none d-xl-flex align-items-center justify-content-center me-3" 
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} aria-label="Minimize Sidebar">
              <i className={isSidebarMinimized ? "bi bi-chevron-bar-right" : "bi bi-chevron-bar-left"}></i>
            </button>
            <button className="sidebar-toggle-btn me-2 d-xl-none" id="sidebar-toggle" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
              <i className="bi bi-list"></i>
            </button>
            {(location.pathname.includes('/messages') || location.pathname.includes('/explore/') || location.pathname.includes('/jobs/') || location.pathname.includes('/profile/') || location.pathname.includes('/my-jobs/')) && (
              <button className="btn btn-light rounded-pill px-3 ms-2 d-none d-md-flex align-items-center" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left me-1"></i> Back
              </button>
            )}
          </div>

          <div className="navbar-search-wrapper mx-3">
            {!location.pathname.startsWith('/explore') &&
             (location.pathname.includes('/messages') || location.pathname.includes('/my-proposals')) && (
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
            <CurrencySelector />
            <NotificationBell />
            <button
              type="button"
              className="navbar-action-btn d-flex align-items-center justify-content-center"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle Dark Mode"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <i className={isDarkMode ? "bi bi-sun-fill" : "bi bi-moon-fill"}></i>
            </button>
            <button
              className="navbar-action-btn me-1 d-none d-md-flex align-items-center justify-content-center"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              <i className={isFullscreen ? "bi bi-fullscreen-exit" : "bi bi-arrows-fullscreen"}></i>
            </button>
            
            {/* Which mode you're in; switching still happens from the profile menu */}
            <span
              className="badge rounded-pill d-inline-flex align-items-center gap-1 me-2 px-2 py-1 fw-semibold"
              style={{ backgroundColor: user?.active_role === 'customer' ? '#C2410C' : '#146C43', color: '#fff', fontSize: '0.72rem' }}
              title={`You're in ${user?.active_role === 'customer' ? 'Client' : 'Freelancer'} mode`}
            >
              <i className={`bi ${user?.active_role === 'customer' ? 'bi-briefcase' : 'bi-person-workspace'}`}></i>
              {user?.active_role === 'customer' ? 'Client' : 'Freelancer'}
            </span>

            <div className="dropdown">
              <button className="navbar-profile-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <img src={(user?.active_role === "customer" && user?.client_avatar_url) || user?.avatar_url || "/default-avatar.png"} alt="Profile" className="navbar-profile-img" />
                <span className="navbar-profile-name d-none d-md-inline">{user?.first_name || 'User'}</span>
                <i className="bi bi-chevron-down navbar-profile-caret"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end dropdown-menu-profile shadow-sm border-0" style={{ minWidth: '240px', padding: '0.5rem 0', borderRadius: '12px' }}>
                <li className="dropdown-header px-4 py-3 border-bottom mb-2">
                  <div className="fw-bold text-dark text-truncate text-uppercase" style={{ letterSpacing: '0.5px' }} title={`${user?.first_name || 'User'} ${user?.last_name || ''}`}>
                    {user?.first_name || 'User'} {user?.last_name || ''}
                  </div>
                  <div className="small text-muted text-truncate text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }} title={user?.email || 'user@example.com'}>
                    {user?.email || 'user@example.com'}
                  </div>
                </li>
                
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-3 px-4 py-2" to={`/profile/${user?.user_id || user?.id}`}>
                    <i className="bi bi-person fs-5 text-muted"></i>
                    <span className="fw-medium text-dark">My Profile</span>
                  </Link>
                </li>
                <li>
                  <button type="button" className="dropdown-item d-flex align-items-center gap-3 px-4 py-2" onClick={handleToggleRole} disabled={isSwitchingRole}>
                    {isSwitchingRole ? (
                      <span className="spinner-border spinner-border-sm text-primary mx-1" role="status" aria-hidden="true"></span>
                    ) : user?.active_role === 'customer' ? (
                      <FreelancerIcon />
                    ) : (
                      <CustomerIcon />
                    )}
                    <span className="fw-medium text-dark">
                      Switch Role ({user?.active_role === 'customer' ? 'Freelancer' : 'Customer'})
                    </span>
                  </button>
                </li>
                
                <li><hr className="dropdown-divider my-2 mx-3" /></li>
                
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-3 px-4 py-2 text-danger" to="/login" onClick={() => { clearCached(); localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); }}>
                    <i className="bi bi-box-arrow-right fs-5"></i>
                    <span className="fw-medium">Logout</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Page Content Rendered Here */}
        <Outlet />

        {/* Global Footer */}
        {!location.pathname.startsWith('/messages') && (
          <footer className="footer mt-auto py-3 border-top" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
            <div className="container-fluid px-4 d-flex flex-column flex-md-row justify-content-between align-items-center small text-muted">
              <div className="mb-2 mb-md-0 fw-medium">
                &copy; {new Date().getFullYear()} RaketBase. All rights reserved.
              </div>
              <div className="d-flex gap-3 gap-md-4">
                <Link to="/terms" className="text-decoration-none text-muted">Terms</Link>
                <Link to="/privacy" className="text-decoration-none text-muted">Privacy</Link>
                <Link to="/help" className="text-decoration-none text-muted">Help & Support</Link>
              </div>
            </div>
          </footer>
        )}

      </div>
    </>
  );
}









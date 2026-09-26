import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, SearchIcon, ChevronDownIcon } from './Icons';
import { clearCached } from '../utils/cache';

export default function Navbar({
  showBack = false,
  backTo = null,
  showSearch = false,
  searchQuery = '',
  setSearchQuery = () => {},
  showFilters = false,
  filtersOpen = false,
  setFiltersOpen = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.email?.split('@')[0] ||
    'User';
  const email = user.email || (token ? 'Logged In' : '');
  const initial = (user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    // Clear tokens, session, cookies, and memory cache
    clearCached();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    setDropdownOpen(false);
    navigate('/login');
  }

  function handleBack() {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  }

  const isDashboard = location.pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/90 px-5 py-3 backdrop-blur md:px-8">
      {/* Left side: Brand Logo and Filters button only */}
      <div className="flex items-center gap-5 md:gap-6">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-[13px] font-medium text-text-secondary hover:text-text cursor-pointer transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        <Link
          to={token ? '/dashboard' : '/login'}
          className="font-display text-2xl font-semibold tracking-tight cursor-pointer hover:opacity-90 transition-opacity"
        >
          RaketBase
        </Link>

        {showFilters && (
          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:border-accent/40 cursor-pointer transition-colors"
          >
            <span>Filters</span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Right side: Search bar, Dashboard link (on the left of user avatar), and Avatar */}
      <div className="flex items-center gap-5">
        {showSearch && (
          <div className="relative hidden w-64 md:w-80 md:block">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search open jobs, keywords, skills..."
              className="w-full rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text placeholder-text-secondary outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Explore Jobs link */}
        <Link
          to="/explore"
          className={`text-sm font-medium transition-colors cursor-pointer ${
            location.pathname === '/explore' ? 'text-accent font-semibold' : 'text-text-secondary hover:text-text'
          }`}
        >
          Explore Jobs
        </Link>

        {/* My Postings link: where a client reviews and acts on incoming proposals */}
        {user.active_role === 'customer' && (
          <Link
            to="/my-jobs"
            className={`hidden text-sm font-medium transition-colors cursor-pointer sm:inline ${
              location.pathname.startsWith('/my-jobs') ? 'text-accent font-semibold' : 'text-text-secondary hover:text-text'
            }`}
          >
            My Postings
          </Link>
        )}

        {/* Admin panel link (admin accounts only) */}
        {user.role === 'admin' && (
          <Link
            to="/admin"
            className={`text-sm font-medium transition-colors cursor-pointer ${
              location.pathname === '/admin'
                ? 'text-accent font-semibold'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Admin
          </Link>
        )}
        
        {/* Dashboard link directly to the left of the user avatar */}
        <Link
          to="/dashboard"
          className={`text-sm font-medium transition-colors cursor-pointer ${
            isDashboard ? 'text-accent font-semibold' : 'text-text-secondary hover:text-text'
          }`}
        >
          Dashboard
        </Link>

        {/* Post a Job button (customers only) */}
        {user.active_role === 'customer' && (
          <Link
            to="/jobs/create"
            className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-[#1A1305] hover:bg-accent-hover transition-colors cursor-pointer"
          >
            + Post a Job
          </Link>
        )}

        {/* User Profile Avatar with Pure Logout & Identity Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            aria-label="User profile menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-[#1A1305] cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all focus:outline-none"
          >
            {initial}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-border bg-panel p-2 shadow-2xl z-50">
              {/* User Identity Details */}
              <div className="px-3 py-2.5">
                <p className="font-display text-sm font-semibold text-text truncate">
                  {displayName}
                </p>
                {email && (
                  <p className="text-xs text-text-secondary truncate mt-0.5">{email}</p>
                )}
                <span className="inline-block mt-1.5 rounded bg-surface border border-border px-2 py-0.5 text-[10px] font-medium text-accent uppercase tracking-wider">
                  {user.role || 'Freelancer'}
                </span>
              </div>

              {/* Log Out Action */}
              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
                >
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

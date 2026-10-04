import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loginUser } from '../services/api';
import LegalModal from '../components/LegalModal';
import '../styles/auth.css';

export default function Login() {
<<<<<<< HEAD
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
=======
  // Auth pages always open in light mode; the corner button toggles dark mode for this page only.
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
>>>>>>> merged-features
  }, [isDarkMode]);

  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const sessionExpired = searchParams.get('expired') === '1';
  const accountSuspended = searchParams.get('suspended') === '1';
  const accountDeleted = searchParams.get('deleted') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState('terms');

  const openLegalModal = (docType) => {
    setLegalModalDoc(docType);
    setLegalModalOpen(true);
  };

<<<<<<< HEAD
  useEffect(() => {
    let interval = null;
    if (lockoutSeconds > 0) {
      interval = setInterval(() => {
        setLockoutSeconds((prev) => prev - 1);
      }, 1000);
    } else if (lockoutSeconds === 0 && failedAttempts >= 3) {
      setFailedAttempts(0);
      setError('');
    }
    return () => clearInterval(interval);
  }, [lockoutSeconds, failedAttempts]);

=======
>>>>>>> merged-features
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem('token', res.token);
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      window.location.href = '/dashboard';
    } catch (err) {
<<<<<<< HEAD
=======
      // Wrong password, attempts left, or a 15-minute lock: the server's message says which
>>>>>>> merged-features
      setLoading(false);
      setError(err.message);
    }
  }

  async function handleDemoLogin(role) {
    setError('');
    setLoading(true);
    const demoEmail = role === 'customer' ? 'demo.client@raketbase.com' : 'demo.freelancer@raketbase.com';
    const demoPass = 'Password123!';
    setEmail(demoEmail);
    setPassword(demoPass);
    try {
      const res = await loginUser({ email: demoEmail, password: demoPass });
      localStorage.setItem('token', res.token);
      if (res.refreshToken) {
        localStorage.setItem('refreshToken', res.refreshToken);
      }
      if (res.user) {
        localStorage.setItem('user', JSON.stringify(res.user));
      }
      window.location.href = '/dashboard';
    } catch (err) {
<<<<<<< HEAD
=======
      // Wrong password, attempts left, or a 15-minute lock: the server's message says which
>>>>>>> merged-features
      setLoading(false);
      setError(err.message);
    }
  }

  const isFormValid = email.trim() !== '' && password.length >= 8;

  return (
<<<<<<< HEAD
    <div className={`rb-auth ${isDarkMode ? 'rb-auth--dark' : ''}`}>
      <div className="rb-auth__sidebar">
        <Link to="/" className="rb-auth__brand" style={{ textDecoration: 'none' }}>
          <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
          <div className="rb-auth__brand-text">
            <span className="rb-auth__brand-bold">RAKET</span>
            <span className="rb-auth__brand-light">BASE</span>
          </div>
        </Link>
        <div className="rb-auth__hero">
          <h1 className="rb-auth__tagline">
            Launch your <span className="rb-auth__tagline-accent">raket</span>.<br />
            Build your <span className="rb-auth__tagline-accent">base</span>.
          </h1>
          <p className="rb-auth__subtitle">
            The freelance marketplace where talent meets opportunity. Post work, find work, get paid — all in one place.
          </p>
          <div className="rb-auth__stats">
            <div className="rb-auth__stat-card">
              <span className="rb-auth__stat-value">50K+</span>
              <span className="rb-auth__stat-label">Freelancers</span>
            </div>
            <div className="rb-auth__stat-card">
              <span className="rb-auth__stat-value">120K+</span>
              <span className="rb-auth__stat-label">Projects</span>
            </div>
            <div className="rb-auth__stat-card">
              <span className="rb-auth__stat-value">4.9/5</span>
              <span className="rb-auth__stat-label">Rating</span>
            </div>
          </div>
        </div>
        <div className="rb-auth__sidebar-footer">
          <button onClick={() => openLegalModal('terms')}>Terms</button>
          <button onClick={() => openLegalModal('privacy')}>Privacy</button>
        </div>
      </div>

      <div className="rb-auth__main">
        <button
          className="rb-auth__theme-toggle"
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label="Toggle dark mode"
        >
          <i className={isDarkMode ? 'bi bi-sun-fill' : 'bi bi-moon-fill'} />
        </button>
        
        <div className="rb-auth__form-container">
          <Link to="/" className="rb-auth__mobile-brand" style={{ textDecoration: 'none' }}>
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
            <div className="rb-auth__brand-text">
              <span className="rb-auth__brand-bold">RAKET</span>
              <span className="rb-auth__brand-light">BASE</span>
            </div>
          </Link>
          
          <h2 className="rb-auth__title">Welcome back</h2>
          <p className="rb-auth__description">Log in to your RaketBase account.</p>
          
          {justRegistered && (
            <div className="rb-auth__alert rb-auth__alert--success">
              <i className="bi bi-check-circle-fill" /> Account created! Log in below.
=======
    <div className="auth-split-wrapper position-relative">
      <button
        type="button"
        className="btn btn-outline-secondary position-absolute top-0 end-0 m-4 rounded-circle d-flex align-items-center justify-content-center border-0 shadow-sm "
        style={{ width: '40px', height: '40px', zIndex: 1000, transition: 'all 0.2s', backgroundColor: isDarkMode ? '#1D2129' : '#FFFFFF', borderColor: isDarkMode ? '#262B36' : '#E2E8F0', border: '1px solid' }}
        onClick={() => setIsDarkMode(!isDarkMode)}
        aria-label="Toggle Dark Mode"
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <i className={isDarkMode ? "bi bi-sun-fill text-warning" : "bi bi-moon-fill text-secondary"} style={{ fontSize: '1.2rem' }}></i>
      </button>
      {/* Left branding banner (GitHub main split layout) */}
      <div className="hidden md:flex auth-split-sidebar">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/racketbaseSVG.svg" 
            alt="RaketBase Logo" 
            className="logo-shake" 
            style={{ height: '46px', width: 'auto', objectFit: 'contain' }} 
          />
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.5rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: 'var(--auth-text)' }}>RAKET</span>
            <span style={{ fontWeight: 400, color: 'var(--auth-text)' }}>BASE</span>
          </div>
        </div>

        <div style={{ maxWidth: '320px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 500, lineHeight: 1.3, marginBottom: '0.75rem', color: 'var(--auth-text)' }}>
            Built for the people who get things done.
          </h1>
          <p style={{ color: 'var(--auth-muted)', fontSize: '15px', lineHeight: 1.6 }}>
            Post the work. Find the work. RaketBase connects clients and freelancers directly.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: 'var(--auth-border)', width: '70%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: 'var(--auth-border)', width: '45%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: 'var(--auth-border)', width: '85%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: 'var(--auth-border)', width: '30%' }} />
        </div>
      </div>

      {/* Right form container */}
      <div className="auth-split-content">
        <div className="auth-split-card">
          {/* Brand header for mobile */}
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <img 
                src="/racketbaseSVG.svg" 
                alt="RaketBase Logo" 
                className="logo-shake" 
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }} 
              />
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.35rem', letterSpacing: '0.5px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: 'var(--auth-text)' }}>RAKET</span>
                <span style={{ fontWeight: 400, color: 'var(--auth-text)' }}>BASE</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--auth-text)' }}>
            Log in
          </h2>
          <p style={{ color: 'var(--auth-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Welcome back. Enter your details to continue.
          </p>

          {justRegistered && (
            <div style={{ backgroundColor: 'rgba(231, 178, 75, 0.1)', borderColor: 'rgba(231, 178, 75, 0.3)', color: 'var(--auth-accent)' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border">
              Account created successfully. Log in below.
>>>>>>> merged-features
            </div>
          )}
          {sessionExpired && (
<<<<<<< HEAD
            <div className="rb-auth__alert rb-auth__alert--info">
              <i className="bi bi-clock-history" /> Session expired. Log in again.
            </div>
          )}
=======
            <div style={{ backgroundColor: 'rgba(231, 178, 75, 0.1)', borderColor: 'rgba(231, 178, 75, 0.3)', color: 'var(--auth-accent)' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border flex items-center gap-2">
              <i className="bi bi-clock-history"></i>
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {accountDeleted && (
            <div role="status" style={{ backgroundColor: 'rgba(78, 186, 111, 0.1)', borderColor: 'rgba(78, 186, 111, 0.3)', color: 'var(--auth-text, inherit)' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border flex items-center gap-2">
              <i className="bi bi-check-circle"></i>
              <span>Your account has been deleted. Thanks for using RaketBase.</span>
            </div>
          )}

          {accountSuspended && (
            <div role="alert" style={{ backgroundColor: 'rgba(229, 72, 77, 0.1)', borderColor: 'rgba(229, 72, 77, 0.3)', color: '#E5484D' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border flex items-center gap-2">
              <i className="bi bi-slash-circle"></i>
              <span>Your account has been suspended by an admin, so you've been logged out.</span>
            </div>
          )}

>>>>>>> merged-features
          {error && (
            <div className="rb-auth__alert rb-auth__alert--error">
              <i className="bi bi-exclamation-circle-fill" /> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
<<<<<<< HEAD
            <div className="rb-auth__field">
              <label className="rb-auth__label" htmlFor="email">Email</label>
=======
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="email">
                Email
              </label>
>>>>>>> merged-features
              <input
                className="rb-auth__input"
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
<<<<<<< HEAD
            
            <div className="rb-auth__field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="rb-auth__label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                <button
                  className="rb-auth__btn-ghost"
                  type="button"
                  onClick={() => alert('Forgot password clicked')}
=======

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', margin: 0 }} htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '12px', color: 'var(--auth-muted)', textDecoration: 'none' }}
                  className="hover:underline"
>>>>>>> merged-features
                >
                  Forgot password?
                </Link>
              </div>
              <div className="rb-auth__input-wrapper">
                <input
                  className="rb-auth__input"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="rb-auth__input-icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
<<<<<<< HEAD
=======
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', padding: 0 }}
>>>>>>> merged-features
                >
                  <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} />
                </button>
              </div>
            </div>
<<<<<<< HEAD
            
            <button
              className="rb-auth__btn-primary"
              type="submit"
              disabled={!isFormValid || loading || lockoutSeconds > 0}
            >
              {loading && <span className="spinner-border spinner-border-sm" style={{marginRight: '8px'}} role="status" aria-hidden="true" />}
              {lockoutSeconds > 0 ? `Locked out (${lockoutSeconds}s)` : loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          <div className="rb-auth__divider">or continue with</div>
          
          <div className="rb-auth__demo-row">
=======

                          <button
                type="submit"
                disabled={!isFormValid || loading}
                className="auth-btn-primary"
                style={{ opacity: (!isFormValid || loading) ? 0.6 : 1, cursor: (!isFormValid || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                {loading ? 'Logging in...' : 'Log in'}
              </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--auth-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--auth-muted)', textAlign: 'center', marginBottom: '0.65rem' }}>
              Or one-click demo access
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDemoLogin('customer')}
                disabled={loading}
                className="auth-btn-secondary"
                style={{ flex: 1 }}
                title="Log in immediately as a pre-configured Client"
              >
                <i className="bi bi-briefcase-fill" style={{ color: 'var(--auth-accent)' }}></i>
                <span>Demo Client</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('freelancer')}
                disabled={loading}
                className="auth-btn-secondary"
                style={{ flex: 1 }}
                title="Log in immediately as a pre-configured Freelancer"
              >
                <i className="bi bi-laptop-fill" style={{ color: 'var(--auth-accent)' }}></i>
                <span>Demo Freelancer</span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--auth-muted)', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--auth-accent)', fontWeight: 500 }} className="hover:underline">
              Create one
            </Link>
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '12px', color: 'var(--auth-muted)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
>>>>>>> merged-features
            <button
              className="rb-auth__btn-secondary"
              type="button"
<<<<<<< HEAD
              onClick={() => handleDemoLogin('customer')}
              disabled={loading}
              title="Demo Client"
=======
              onClick={() => openLegalModal('terms')}
              style={{ background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              className="hover:underline"
>>>>>>> merged-features
            >
              <i className="bi bi-briefcase-fill" style={{ color: 'var(--rb-primary)', marginRight: '6px' }} /> Demo Client
            </button>
            <button
              className="rb-auth__btn-secondary"
              type="button"
              onClick={() => handleDemoLogin('freelancer')}
              disabled={loading}
              title="Demo Freelancer"
            >
              <i className="bi bi-laptop-fill" style={{ color: 'var(--rb-primary)', marginRight: '6px' }} /> Demo Freelancer
            </button>
          </div>
          
          <div className="rb-auth__footer-text">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
          
          <div className="rb-auth__legal-row">
            <button type="button" className="rb-auth__btn-ghost" onClick={() => openLegalModal('terms')}>Terms</button>
            <span>•</span>
<<<<<<< HEAD
            <button type="button" className="rb-auth__btn-ghost" onClick={() => openLegalModal('privacy')}>Privacy</button>
=======
            <button
              type="button"
              onClick={() => openLegalModal('privacy')}
              style={{ background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              className="hover:underline"
            >
              Privacy Notice
            </button>
>>>>>>> merged-features
          </div>
        </div>
      </div>
      
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        defaultTab={legalModalDoc}
      />
    </div>
  );
}

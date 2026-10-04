import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loginUser } from '../services/api';
import LegalModal from '../components/LegalModal';
import '../styles/auth.css';

export default function Login() {
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

  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const sessionExpired = searchParams.get('expired') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState('terms');

  const openLegalModal = (docType) => {
    setLegalModalDoc(docType);
    setLegalModalOpen(true);
  };

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
      setLoading(false);
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= 3) {
        setLockoutSeconds(30);
        setError('Too many failed attempts. Please try again in 30 seconds.');
      } else {
        setError(err.message);
      }
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
      setLoading(false);
      const newFails = failedAttempts + 1;
      setFailedAttempts(newFails);
      if (newFails >= 3) {
        setLockoutSeconds(30);
        setError('Too many failed attempts. Please try again in 30 seconds.');
      } else {
        setError(err.message);
      }
    }
  }

  const isFormValid = email.trim() !== '' && password.length >= 8;

  return (
    <div className={`rb-auth ${isDarkMode ? 'rb-auth--dark' : ''}`}>
      <div className="rb-auth__sidebar">
        <a href="/" className="rb-auth__brand" style={{ textDecoration: 'none' }}>
          <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
          <div className="rb-auth__brand-text">
            <span className="rb-auth__brand-bold">RAKET</span>
            <span className="rb-auth__brand-light">BASE</span>
          </div>
        </a>
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
          <a href="/" className="rb-auth__mobile-brand" style={{ textDecoration: 'none' }}>
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
            <div className="rb-auth__brand-text">
              <span className="rb-auth__brand-bold">RAKET</span>
              <span className="rb-auth__brand-light">BASE</span>
            </div>
          </a>
          
          <h2 className="rb-auth__title">Welcome back</h2>
          <p className="rb-auth__description">Log in to your RaketBase account.</p>
          
          {justRegistered && (
            <div className="rb-auth__alert rb-auth__alert--success">
              <i className="bi bi-check-circle-fill" /> Account created! Log in below.
            </div>
          )}
          {sessionExpired && (
            <div className="rb-auth__alert rb-auth__alert--info">
              <i className="bi bi-clock-history" /> Session expired. Log in again.
            </div>
          )}
          {error && (
            <div className="rb-auth__alert rb-auth__alert--error">
              <i className="bi bi-exclamation-circle-fill" /> {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="rb-auth__field">
              <label className="rb-auth__label" htmlFor="email">Email</label>
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
            
            <div className="rb-auth__field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="rb-auth__label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                <button
                  className="rb-auth__btn-ghost"
                  type="button"
                  onClick={() => alert('Forgot password clicked')}
                >
                  Forgot password?
                </button>
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
                >
                  <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'} />
                </button>
              </div>
            </div>
            
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
            <button
              className="rb-auth__btn-secondary"
              type="button"
              onClick={() => handleDemoLogin('customer')}
              disabled={loading}
              title="Demo Client"
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
            <button type="button" className="rb-auth__btn-ghost" onClick={() => openLegalModal('privacy')}>Privacy</button>
          </div>
        </div>
      </div>
      
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialDoc={legalModalDoc}
        isDarkMode={isDarkMode}
        onThemeToggle={() => setIsDarkMode(!isDarkMode)}
      />
    </div>
  );
}

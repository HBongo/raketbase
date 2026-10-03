import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loginUser } from '../services/api';
import LegalModal from '../components/LegalModal';

export default function Login() {
  useEffect(() => {
    document.body.classList.remove('dark-mode');
  }, []);

  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const sessionExpired = searchParams.get('expired') === '1';

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
      setError(err.message);
      setLoading(false);
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
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="auth-split-wrapper">
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
            <span style={{ fontWeight: 800, color: '#EDEEF2' }}>RAKET</span>
            <span style={{ fontWeight: 400, color: '#EDEEF2' }}>BASE</span>
          </div>
        </div>

        <div style={{ maxWidth: '320px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', fontWeight: 500, lineHeight: 1.3, marginBottom: '0.75rem', color: '#EDEEF2' }}>
            Built for the people who get things done.
          </h1>
          <p style={{ color: '#8D93A3', fontSize: '15px', lineHeight: 1.6 }}>
            Post the work. Find the work. RaketBase connects clients and freelancers directly.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: '#262B36', width: '70%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: '#262B36', width: '45%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: '#262B36', width: '85%' }} />
          <div style={{ height: '10px', borderRadius: '3px', backgroundColor: '#262B36', width: '30%' }} />
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
                <span style={{ fontWeight: 800, color: '#EDEEF2' }}>RAKET</span>
                <span style={{ fontWeight: 400, color: '#EDEEF2' }}>BASE</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, marginBottom: '0.35rem', color: '#EDEEF2' }}>
            Log in
          </h2>
          <p style={{ color: '#8D93A3', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Welcome back. Enter your details to continue.
          </p>

          {justRegistered && (
            <div style={{ backgroundColor: 'rgba(231, 178, 75, 0.1)', borderColor: 'rgba(231, 178, 75, 0.3)', color: '#E7B24B' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border">
              Account created successfully. Log in below.
            </div>
          )}

          {sessionExpired && (
            <div style={{ backgroundColor: 'rgba(231, 178, 75, 0.1)', borderColor: 'rgba(231, 178, 75, 0.3)', color: '#E7B24B' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border flex items-center gap-2">
              <i className="bi bi-clock-history"></i>
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: 'rgba(229, 72, 77, 0.1)', borderColor: 'rgba(229, 72, 77, 0.3)', color: '#E5484D' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#8D93A3', margin: 0 }} htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("A password reset link has been sent to your email.")}
                  style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '12px', color: '#8D93A3', cursor: 'pointer' }}
                  className="hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#8D93A3', cursor: 'pointer', padding: 0 }}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn-primary"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #262B36' }}>
            <div style={{ fontSize: '12px', color: '#8D93A3', textAlign: 'center', marginBottom: '0.65rem' }}>
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
                <i className="bi bi-briefcase-fill" style={{ color: '#E7B24B' }}></i>
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
                <i className="bi bi-laptop-fill" style={{ color: '#E7B24B' }}></i>
                <span>Demo Freelancer</span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#8D93A3', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: '#E7B24B', fontWeight: 500 }} className="hover:underline">
              Create one
            </Link>
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '12px', color: '#8D93A3', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => openLegalModal('terms')}
              style={{ background: 'transparent', border: 'none', color: '#8D93A3', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              className="hover:underline"
            >
              Terms of Service
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => openLegalModal('privacy')}
              style={{ background: 'transparent', border: 'none', color: '#8D93A3', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              className="hover:underline"
            >
              Privacy Notice
            </button>
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
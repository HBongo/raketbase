import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Minimal centered card for the password reset pages, using the same auth-* styles
// and light-mode colors as Login/Register.
export default function AuthCard({ title, subtitle, children }) {
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDark);
  }, []);

  return (
    <div className="auth-split-wrapper">
      <div className="auth-split-content">
        <div className="auth-split-card">
          <Link to="/" className="text-decoration-none d-inline-flex align-items-center gap-2 mb-4">
            <img src="/raketbase-icon.svg" alt="RaketBase" style={{ height: '36px', objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.35rem', letterSpacing: '0.5px', color: 'var(--auth-text)' }}>
              <span style={{ fontWeight: 800 }}>RAKET</span>
              <span style={{ fontWeight: 400 }}>BASE</span>
            </span>
          </Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--auth-text)' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ color: 'var(--auth-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthAlert({ tone = 'error', children }) {
  const colors = tone === 'success'
    ? { bg: 'rgba(78, 186, 111, 0.1)', border: 'rgba(78, 186, 111, 0.35)', text: '#2F8A4C' }
    : { bg: 'rgba(229, 72, 77, 0.1)', border: 'rgba(229, 72, 77, 0.3)', text: '#E5484D' };
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
      className="small mb-3 px-3 py-2 rounded border"
    >
      {children}
    </div>
  );
}


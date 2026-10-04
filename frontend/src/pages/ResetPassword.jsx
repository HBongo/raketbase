import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../services/api';
import AuthCard, { AuthAlert } from '../components/AuthCard';

const authLabelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' };

// Supabase's reset email sends the user here with the recovery token in the URL hash:
//   /reset-password#access_token=...&type=recovery   (or #error=...&error_description=... if it expired)
function readResetLink() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    accessToken: params.get('access_token'),
    linkError: params.get('error_description') ? params.get('error_description').replace(/\+/g, ' ') : null,
  };
}

const RULES = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /\d/.test(p), label: 'One number' },
  { test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p), label: 'One special character (like ! @ # $ %)' },
];

export default function ResetPassword() {
  const [{ accessToken, linkError }] = useState(readResetLink);

  // Don't leave the token sitting in the address bar or browser history.
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const rulesMet = RULES.every((r) => r.test(password));
  const canSubmit = rulesMet && password === confirm && !saving;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setSaving(true);
    try {
      await resetPassword(accessToken, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset your password.');
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken) {
    return (
      <AuthCard title="Reset link not valid">
        <AuthAlert>{linkError || 'This page needs the link from your password reset email.'} Please request a new link.</AuthAlert>
        <Link to="/forgot-password" className="auth-btn-primary text-decoration-none">Request a new link</Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title="Password updated">
        <AuthAlert tone="success">Your password has been reset. You can now log in with your new password.</AuthAlert>
        <Link to="/login" className="auth-btn-primary text-decoration-none">Go to log in</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose a new password for your RaketBase account.">
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <AuthAlert>
            {error} {/expired|already used|not a password reset/i.test(error) && <Link to="/forgot-password">Request a new link</Link>}
          </AuthAlert>
        )}
        <div className="mb-3">
          <label htmlFor="new-password" style={authLabelStyle}>New password</label>
          <div className="position-relative">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="btn btn-link p-0 position-absolute"
              style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--auth-muted)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
            </button>
          </div>
        </div>
        <ul className="auth-checklist list-unstyled mb-3">
          {RULES.map((r) => (
            <li key={r.label} style={{ color: r.test(password) ? '#4EBA6F' : 'var(--auth-subtle)' }}>
              <i className={`bi ${r.test(password) ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}></i>{r.label}
            </li>
          ))}
        </ul>
        <div className="mb-3">
          <label htmlFor="confirm-password" style={authLabelStyle}>Confirm new password</label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            className={`auth-input ${confirm && confirm !== password ? 'auth-input-error' : ''}`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {confirm && confirm !== password && (
            <div className="small mt-1" style={{ color: '#E5484D' }}>Passwords don't match.</div>
          )}
        </div>
        <button type="submit" className="auth-btn-primary" disabled={!canSubmit}>
          {saving ? 'Saving...' : 'Set new password'}
        </button>
      </form>
    </AuthCard>
  );
}

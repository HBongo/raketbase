import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import AuthCard, { AuthAlert } from '../components/AuthCard';

const authLabelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' };

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter the email you signed up with and we'll send you a link to set a new password."
    >
      {sent ? (
        <>
          <AuthAlert tone="success">
            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Check your inbox and spam folder. The link expires after a while, so use it soon.
          </AuthAlert>
          <button type="button" className="auth-btn-secondary w-100 mb-3" onClick={() => setSent(false)}>
            Send to a different email
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert>{error}</AuthAlert>}
          <div className="mb-3">
            <label htmlFor="email" style={authLabelStyle}>Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <button type="submit" className="auth-btn-primary mb-3" disabled={sending || !email.trim()}>
            {sending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="small text-center mb-0" style={{ color: 'var(--auth-muted)' }}>
        Remembered it? <Link to="/login" style={{ color: 'var(--auth-accent)', fontWeight: 500 }}>Back to log in</Link>
      </p>
    </AuthCard>
  );
}

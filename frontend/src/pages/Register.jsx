import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
  });

  // Real-time validation rules
  const nameRegex = /^[A-Za-z\s\-']+$/;
  const isFirstNameValid = firstName.trim().length > 0 && nameRegex.test(firstName.trim());
  const isLastNameValid = lastName.trim().length > 0 && nameRegex.test(lastName.trim());

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim().length > 0 && emailRegex.test(email.trim());

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setTouched({ firstName: true, lastName: true, email: true, password: true });

    if (!isFirstNameValid) {
      return setError('First name must contain only letters, hyphens, and spaces.');
    }
    if (!isLastNameValid) {
      return setError('Last name must contain only letters, hyphens, and spaces.');
    }
    if (!isEmailValid) {
      return setError('Please enter a valid email address.');
    }
    if (!isPasswordValid) {
      return setError('Password does not meet the security requirements.');
    }

    setLoading(true);
    try {
      await registerUser({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, role });
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-bg-shape login-bg-shape-1"></div>
      <div className="login-bg-shape login-bg-shape-2"></div>
      
      <div className="login-card">
        
        <div className="text-center mb-4 mt-2">
          <Link to="/" className="text-decoration-none d-flex flex-column align-items-center">
            <div className="d-flex align-items-center justify-content-center mb-2">
              <img src="/racketbaseSVG.svg" alt="RaketBase Logo" className="logo-shake" style={{ height: '100px', objectFit: 'contain', marginRight: '5px', marginTop: '-15px' }} />
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '36px', color: '#072F1F', letterSpacing: '1px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: 800 }}>RAKET</span>
                <span style={{ fontWeight: 400 }}>BASE</span>
              </div>
            </div>
            <p className="login-subtitle" style={{ marginTop: '5px', fontSize: '15px' }}>The Homebase for Your Next Big Raket.</p>
          </Link>
        </div>
        
        {error && (
          <div className="alert alert-danger py-2 mb-4 d-flex align-items-center gap-2" role="alert">
            <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="registerForm" noValidate>
          
          <div className="row mb-3">
            <div className="col-6">
              <label htmlFor="first-name" className="login-form-label">First Name</label>
              <div className={`login-input-group ${touched.firstName && !isFirstNameValid ? 'border border-danger' : ''}`}>
                <i className="bi bi-person input-icon"></i>
                <input 
                  type="text" 
                  id="first-name" 
                  className="login-input" 
                  placeholder="First" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, firstName: true }))}
                  required 
                />
              </div>
              {touched.firstName && !isFirstNameValid && (
                <div className="text-danger mt-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                  <i className="bi bi-exclamation-circle-fill"></i> Letters only
                </div>
              )}
            </div>
            <div className="col-6">
              <label htmlFor="last-name" className="login-form-label">Last Name</label>
              <div className={`login-input-group ${touched.lastName && !isLastNameValid ? 'border border-danger' : ''}`}>
                <i className="bi bi-person input-icon"></i>
                <input 
                  type="text" 
                  id="last-name" 
                  className="login-input" 
                  placeholder="Last" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, lastName: true }))}
                  required 
                />
              </div>
              {touched.lastName && !isLastNameValid && (
                <div className="text-danger mt-1 d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
                  <i className="bi bi-exclamation-circle-fill"></i> Letters only
                </div>
              )}
            </div>
          </div>
          
          <div className="login-form-group mb-3">
            <label htmlFor="email" className="login-form-label">Email Address</label>
            <div className={`login-input-group ${touched.email && !isEmailValid ? 'border border-danger' : ''}`}>
              <i className="bi bi-envelope input-icon"></i>
              <input 
                type="email" 
                id="email" 
                className="login-input" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                required 
              />
            </div>
            {touched.email && !isEmailValid && (
              <div className="text-danger mt-1 d-flex align-items-center gap-1" style={{ fontSize: '12px' }}>
                <i className="bi bi-exclamation-circle-fill"></i> Please enter a valid email address.
              </div>
            )}
          </div>
          
          <div className="login-form-group mb-3">
            <label htmlFor="password" className="login-form-label">Password</label>
            <div className={`login-input-group ${touched.password && !isPasswordValid ? 'border border-danger' : ''}`}>
              <i className="bi bi-shield-lock input-icon"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                className="login-input login-input-password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                required 
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                aria-label="Show password"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            
            {/* Live Password Requirements Checklist */}
            <div className="p-2 mt-2 bg-light rounded border" style={{ fontSize: '12px' }}>
              <div className="fw-medium text-muted mb-1">Password requirements:</div>
              <div className="d-flex flex-column gap-1">
                <span className={hasMinLength ? 'text-success fw-medium' : 'text-muted'}>
                  <i className={`bi ${hasMinLength ? 'bi-check-circle-fill text-success' : 'bi-circle'} me-1`}></i>
                  At least 8 characters
                </span>
                <span className={hasUppercase ? 'text-success fw-medium' : 'text-muted'}>
                  <i className={`bi ${hasUppercase ? 'bi-check-circle-fill text-success' : 'bi-circle'} me-1`}></i>
                  At least 1 uppercase letter
                </span>
                <span className={hasNumber ? 'text-success fw-medium' : 'text-muted'}>
                  <i className={`bi ${hasNumber ? 'bi-check-circle-fill text-success' : 'bi-circle'} me-1`}></i>
                  At least 1 number
                </span>
              </div>
            </div>
          </div>
          
          <div className="login-form-group">
            <label htmlFor="role" className="login-form-label">I want to join as a:</label>
            <div className="login-input-group">
              <i className={`bi ${role === 'freelancer' ? 'bi-laptop' : 'bi-briefcase'} input-icon`}></i>
              <select 
                id="role" 
                className="login-input bg-transparent" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="customer" style={{color: 'black'}}>Client (Customer)</option>
                <option value="freelancer" style={{color: 'black'}}>Freelancer</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn-login mt-4" id="btn-submit" disabled={loading}>
            <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            <i className="bi bi-arrow-right"></i>
          </button>
          
        </form>
        
        <div className="login-divider">Or register with</div>
        
        <div className="social-login-grid" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn-social" type="button" id="btn-google">
            <i className="bi bi-google text-danger"></i>
            <span>Google</span>
          </button>
        </div>
        
        <p className="login-footer-text">
          Already have an account? <Link to="/login" id="link-login">Log in</Link>
        </p>
        
      </div>
    </div>
  );
}
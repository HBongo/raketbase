const fs = require('fs');

const fileContent = `import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('freelancer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isNameValid = (name) => /^[A-Za-z]{2,50}$/.test(name);
  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isPasswordValid = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/.test(p);

  const isFormComplete = isNameValid(firstName) && isNameValid(lastName) && isEmailValid(email) && isPasswordValid(password) && role !== '';
  const hasInput = firstName || lastName || email || password || role !== 'freelancer';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isFormComplete) return;
    setError('');
    setLoading(true);
    try {
      await registerUser({ firstName, lastName, email, password, role });
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleClear() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('freelancer');
    setError('');
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
          <div className="alert alert-danger py-2 mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} id="registerForm" noValidate>
          
          <div className="row mb-3">
            <div className="col-6">
              <label htmlFor="first-name" className="login-form-label">First Name <span className="text-danger">*</span></label>
              <div className="login-input-group">
                <i className="bi bi-person input-icon"></i>
                <input 
                  type="text" 
                  id="first-name" 
                  className="login-input" 
                  placeholder="First" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value.replace(/[^A-Za-z]/g, ''))}
                  required 
                />
              </div>
              {firstName && !isNameValid(firstName) && <div className="text-danger small mt-1">2-50 alphabetical characters only.</div>}
            </div>
            <div className="col-6">
              <label htmlFor="last-name" className="login-form-label">Last Name <span className="text-danger">*</span></label>
              <div className="login-input-group">
                <i className="bi bi-person input-icon"></i>
                <input 
                  type="text" 
                  id="last-name" 
                  className="login-input" 
                  placeholder="Last" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value.replace(/[^A-Za-z]/g, ''))}
                  required 
                />
              </div>
              {lastName && !isNameValid(lastName) && <div className="text-danger small mt-1">2-50 alphabetical characters only.</div>}
            </div>
          </div>
          
          <div className="login-form-group">
            <label htmlFor="email" className="login-form-label">Email Address <span className="text-danger">*</span></label>
            <div className="login-input-group">
              <i className="bi bi-envelope input-icon"></i>
              <input 
                type="email" 
                id="email" 
                className="login-input" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            {email && !isEmailValid(email) && <div className="text-danger small mt-1">Enter a valid email address.</div>}
          </div>
          
          <div className="login-form-group">
            <label htmlFor="password" className="login-form-label">Password <span className="text-danger">*</span></label>
            <div className="login-input-group">
              <i className="bi bi-shield-lock input-icon"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                className="login-input login-input-password" 
                placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {password && !isPasswordValid(password) && <div className="text-danger small mt-1">Must contain at least 8 characters, an uppercase, lowercase, and number.</div>}
          </div>

          <div className="login-form-group mb-4">
            <label htmlFor="role" className="login-form-label">I want to join as a: <span className="text-danger">*</span></label>
            <div className="login-input-group">
              <i className={`bi ${role === 'freelancer' ? 'bi-laptop' : 'bi-briefcase'} input-icon`}></i>
              <select 
                id="role" 
                className="form-select login-input bg-transparent" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="freelancer" style={{color: 'black'}}>Freelancer</option>
                <option value="customer" style={{color: 'black'}}>Client (Customer)</option>
              </select>
            </div>
          </div>
          
          <div className="d-flex gap-2">
            <button 
              type="button" 
              className="btn btn-outline-secondary w-100 rounded-pill fw-bold" 
              onClick={handleClear}
              disabled={!hasInput}
            >
              Clear
            </button>
            <button 
              type="submit" 
              className="btn-login m-0" 
              style={{ backgroundColor: isFormComplete ? '#FF5A1E' : '#6c757d', cursor: isFormComplete ? 'pointer' : 'not-allowed' }}
              disabled={!isFormComplete || loading}
            >
              <span>{loading ? 'Registering...' : 'Create Account'}</span>
              <i className="bi bi-arrow-right"></i>
            </button>
          </div>
          
        </form>
        
        <div className="login-divider">Or register with</div>
        
        <div className="social-login-grid" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn-social" type="button" id="btn-google" onClick={() => alert("Google Sign-In is currently under maintenance. Please register with your email.")}>
            <i className="bi bi-google text-danger"></i>
            <span>Google</span>
          </button>
        </div>
        
        <p className="login-footer-text">
          Already have an account? <Link to="/login" id="link-login">Log In Instead</Link>
        </p>
        
      </div>
    </div>
  );
}
`;
fs.writeFileSync('c:/Users/mspau/OneDrive/Documents/GitHub/raketbase/frontend/src/pages/Register.jsx', fileContent);
console.log('Register.jsx updated');

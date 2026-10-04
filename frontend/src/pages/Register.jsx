import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, updateProfile } from '../services/api';
import LegalModal from '../components/LegalModal';
import '../styles/auth.css';

function CustomAutocomplete({ value, onChange, options, placeholder, disabled, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div className="rb-auth__autocomplete">
      <input 
        type="text" 
        className="rb-auth__input" 
        placeholder={isLoading ? "Loading..." : placeholder}
        value={value || ''}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        autoComplete="off"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <ul className="rb-auth__autocomplete-list">
          {filteredOptions.map((opt, i) => (
            <li key={i}>
              <button 
                type="button" 
                className="rb-auth__autocomplete-item"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.ph', 'ymail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'zoho.com', 'aol.com',
];

export default function Register() {
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

  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('freelancer');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [over18, setOver18] = useState(false);

  // Freelancer fields
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  // Locations Data
  const [regionsList, setRegionsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  // Client fields
  const [companyName, setCompanyName] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState('terms');

  const openLegalModal = (docType) => {
    setLegalModalDoc(docType);
    setLegalModalOpen(true);
  };

  useEffect(() => {
    if (step === 2 && role === 'freelancer' && regionsList.length === 0) {
      fetch('https://psgc.gitlab.io/api/regions/')
        .then(res => res.json())
        .then(data => {
          const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
          setRegionsList(sorted);
        })
        .catch(err => console.error('Failed to fetch regions', err));
    }
  }, [step, role, regionsList.length]);

  useEffect(() => {
    let cancelled = false;
    if (region) {
      const selectedRegion = regionsList.find(r => r.name === region);
      if (selectedRegion) {
        Promise.resolve().then(() => {
          if (!cancelled) setIsFetchingCities(true);
        });
        fetch(`https://psgc.gitlab.io/api/regions/${selectedRegion.code}/cities-municipalities/`)
          .then(res => res.json())
          .then(data => {
            if (cancelled) return;
            const cleanedCities = data.map(c => ({
              ...c,
              name: c.name.replace(/^City of /i, '').replace(/ City$/i, '').trim()
            }));
            cleanedCities.sort((a, b) => a.name.localeCompare(b.name));
            setCitiesList(cleanedCities);
            setIsFetchingCities(false);
            if (city && !cleanedCities.some(c => c.name === city)) {
              setCity('');
            }
          })
          .catch(err => {
            if (cancelled) return;
            console.error('Failed to fetch cities', err);
            setIsFetchingCities(false);
          });
      } else {
        setCitiesList([]);
      }
    } else {
      setCitiesList([]);
    }
    return () => { cancelled = true; };
  }, [region, regionsList, city]);

  const isNameValid = (name) => /^[A-Za-z\s\-']{2,50}$/.test(name.trim());
  const isEmailFormatValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isLegitEmailDomain = (e) => {
    if (!isEmailFormatValid(e)) return false;
    const parts = e.trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    if (!domain || !domain.includes('.')) return false;
    if (domain.endsWith('.edu') || domain.endsWith('.edu.ph') || domain.endsWith('.ac.uk')) {
      return true;
    }
    return ALLOWED_EMAIL_DOMAINS.includes(domain);
  };
  const isPasswordValid = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(p);

  const isStep1Complete = isNameValid(firstName) && isNameValid(lastName) && isEmailFormatValid(email) && isLegitEmailDomain(email) && Boolean(role);
  const isStep2Complete = isPasswordValid(password) && password === confirmPassword && over18;

  function handleNext(e) {
    e.preventDefault();
    if (!isStep1Complete) return;
    setError('');
    setStep(2);
  }

  function handleBack() {
    setError('');
    setStep(1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isStep2Complete) return;
    setError('');
    setLoading(true);
    try {
      const res = await registerUser({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        email: email.trim(), 
        password, 
        role 
      });
      
      if (res.token) {
        localStorage.setItem('token', res.token);
        const updates = {};
        if (role === 'freelancer') {
          if (professionalTitle) updates.professional_title = professionalTitle;
          if (hourlyRate) updates.hourly_rate = Number(hourlyRate);
          if (region) updates.region = region;
          if (city) updates.city = city;
        } else if (role === 'customer') {
          if (companyName) updates.company_name = companyName;
        }
        if (Object.keys(updates).length > 0) {
          try { await updateProfile(updates); } catch (e) { console.error(e); }
        }
        localStorage.removeItem('token');
      }
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

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
            Launch your <span className="rb-auth__tagline-accent">raket</span>.<br/>
            Build your <span className="rb-auth__tagline-accent">base</span>.
          </h1>
          <p className="rb-auth__subtitle">
            Join thousands of professionals. Whether you hire or get hired, RaketBase is your launchpad.
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
          <button type="button" className="rb-auth__btn-ghost" onClick={() => openLegalModal('terms')}>Terms</button>
          <button type="button" className="rb-auth__btn-ghost" onClick={() => openLegalModal('privacy')}>Privacy</button>
        </div>
      </div>

      <div className="rb-auth__main">
        <button 
          type="button"
          className="rb-auth__theme-toggle" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label="Toggle theme"
        >
          <i className={`bi ${isDarkMode ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
        </button>

        <div className="rb-auth__form-container">
          <a href="/" className="rb-auth__mobile-brand" style={{ textDecoration: 'none' }}>
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
            <div className="rb-auth__brand-text">
              <span className="rb-auth__brand-bold">RAKET</span>
              <span className="rb-auth__brand-light">BASE</span>
            </div>
          </a>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <h2 className="rb-auth__title">Create your account</h2>
            <span className="rb-auth__step-badge">Step {step} of 2</span>
          </div>
          
          <p className="rb-auth__description">
            {step === 1 ? 'Start posting jobs or picking up work.' : 'Set up your credentials.'}
          </p>

          {error && (
            <div className="rb-auth__alert rb-auth__alert--error">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext}>
              <div className="rb-auth__row">
                <div className="rb-auth__field">
                  <label className="rb-auth__label">First name</label>
                  <input
                    type="text"
                    className={`rb-auth__input ${firstName && !isNameValid(firstName) ? 'rb-auth__input--error' : ''}`}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                    autoFocus
                  />
                  {firstName && !isNameValid(firstName) && (
                    <div className="rb-auth__error-text">2-50 letters/spaces allowed</div>
                  )}
                </div>
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Last name</label>
                  <input
                    type="text"
                    className={`rb-auth__input ${lastName && !isNameValid(lastName) ? 'rb-auth__input--error' : ''}`}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dela Cruz"
                  />
                  {lastName && !isNameValid(lastName) && (
                    <div className="rb-auth__error-text">2-50 letters/spaces allowed</div>
                  )}
                </div>
              </div>

              <div className="rb-auth__field">
                <label className="rb-auth__label">Email</label>
                <input
                  type="email"
                  className={`rb-auth__input ${email && (!isEmailFormatValid(email) || !isLegitEmailDomain(email)) ? 'rb-auth__input--error' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juandelacruz@example.com"
                />
                {email && !isEmailFormatValid(email) && (
                  <div className="rb-auth__error-text">Invalid email format</div>
                )}
                {email && isEmailFormatValid(email) && !isLegitEmailDomain(email) && (
                  <div className="rb-auth__error-text">Please use a recognized email provider</div>
                )}
              </div>

              <div className="rb-auth__field">
                <label className="rb-auth__label">I want to join as a:</label>
                <select
                  className="rb-auth__input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="freelancer">Freelancer — I want to find work</option>
                  <option value="customer">Client — I want to hire someone</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="rb-auth__btn-primary"
                disabled={!isStep1Complete}
              >
                Continue <i className="bi bi-arrow-right" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              {role === 'freelancer' ? (
                <>
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Professional Title <span className="rb-auth__label-optional">(Optional)</span></label>
                      <input
                        type="text"
                        className="rb-auth__input"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        placeholder="e.g. Graphic Designer"
                      />
                    </div>
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Hourly Rate ($) <span className="rb-auth__label-optional">(Optional)</span></label>
                      <input
                        type="number"
                        className="rb-auth__input"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Region <span className="rb-auth__label-optional">(Optional)</span></label>
                      <CustomAutocomplete
                        value={region}
                        onChange={setRegion}
                        options={regionsList.map(r => r.name)}
                        placeholder="Select Region"
                      />
                    </div>
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">City <span className="rb-auth__label-optional">(Optional)</span></label>
                      <CustomAutocomplete
                        value={city}
                        onChange={setCity}
                        options={citiesList.map(c => c.name)}
                        placeholder={region ? "Select City" : "Select Region first"}
                        disabled={!region}
                        isLoading={isFetchingCities}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Company Name <span className="rb-auth__label-optional">(Optional)</span></label>
                  <input
                    type="text"
                    className="rb-auth__input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Inc."
                  />
                </div>
              )}

              <div className="rb-auth__row">
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Password</label>
                  <div className="rb-auth__input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="rb-auth__input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="rb-auth__toggle-pwd"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex="-1"
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Confirm</label>
                  <div className="rb-auth__input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`rb-auth__input ${confirmPassword && password !== confirmPassword ? 'rb-auth__input--error' : ''}`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      className="rb-auth__toggle-pwd"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                    >
                      <i className={`bi ${showConfirmPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <div className="rb-auth__error-text">Passwords do not match</div>
                  )}
                </div>
              </div>

              <div className="rb-auth__checklist">
                <p className="rb-auth__checklist-title">Password must contain:</p>
                <div className="rb-auth__checklist-grid">
                  <div className={`rb-auth__check-item ${/.{8,}/.test(password) ? 'rb-auth__check-item--pass' : 'rb-auth__check-item--fail'}`}>
                    <i className={`bi ${/.{8,}/.test(password) ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> 8+ chars
                  </div>
                  <div className={`rb-auth__check-item ${/[A-Z]/.test(password) ? 'rb-auth__check-item--pass' : 'rb-auth__check-item--fail'}`}>
                    <i className={`bi ${/[A-Z]/.test(password) ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> Uppercase
                  </div>
                  <div className={`rb-auth__check-item ${/[a-z]/.test(password) ? 'rb-auth__check-item--pass' : 'rb-auth__check-item--fail'}`}>
                    <i className={`bi ${/[a-z]/.test(password) ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> Lowercase
                  </div>
                  <div className={`rb-auth__check-item ${/\d/.test(password) ? 'rb-auth__check-item--pass' : 'rb-auth__check-item--fail'}`}>
                    <i className={`bi ${/\d/.test(password) ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> Number
                  </div>
                  <div className={`rb-auth__check-item ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'rb-auth__check-item--pass' : 'rb-auth__check-item--fail'}`}>
                    <i className={`bi ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i> Special
                  </div>
                </div>
              </div>

              <p className="rb-auth__legal-disclaimer">
                By creating an account, you agree to our <button type="button" className="rb-auth__link-btn" onClick={() => openLegalModal('terms')}>Terms</button> and <button type="button" className="rb-auth__link-btn" onClick={() => openLegalModal('privacy')}>Privacy Policy</button>.
              </p>

              <div className="rb-auth__checkbox-row">
                <input
                  type="checkbox"
                  id="over18"
                  checked={over18}
                  onChange={(e) => setOver18(e.target.checked)}
                />
                <label htmlFor="over18">I confirm that I am at least 18 years of age.</label>
              </div>

              <div className="rb-auth__action-row">
                <button
                  type="button"
                  className="rb-auth__btn-secondary"
                  onClick={handleBack}
                >
                  <i className="bi bi-arrow-left"></i> Back
                </button>
                <button
                  type="submit"
                  className="rb-auth__btn-primary"
                  disabled={!isStep2Complete || loading}
                >
                  {loading ? (
                    <span className="rb-auth__spinner"></span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="rb-auth__footer-text">
            Already have an account? <Link to="/login">Log in</Link>
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

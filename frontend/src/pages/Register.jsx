import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, updateProfile } from '../services/api';
import LegalModal from '../components/LegalModal';

function CustomAutocomplete({ value, onChange, options, placeholder, disabled, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div style={{ position: 'relative', overflow: 'visible' }}>
      <input 
        type="text" 
        className="auth-input" 
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
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          maxHeight: '180px',
          overflowY: 'auto',
          backgroundColor: '#1D2129',
          border: '1px solid #262B36',
          borderRadius: '6px',
          listStyle: 'none',
          padding: '4px 0',
          margin: '4px 0 0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {filteredOptions.map((opt, i) => (
            <li key={i}>
              <button 
                type="button" 
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: '#EDEEF2',
                  padding: '7px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#252B37'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.com.ph',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
];

export default function Register() {
  useEffect(() => {
    document.body.classList.remove('dark-mode');
  }, []);

  const navigate = useNavigate();

  // Step state (1: Core details, 2: Role profile & Password)
  const [step, setStep] = useState(1);

  // Step 1 fields (No middle initial, no suffix)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('freelancer');

  // Step 2 fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step 2 freelancer fields
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  
  // Locations Data
  const [regionsList, setRegionsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);
  
  // Step 2 client fields
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

  // Fetch Regions when reaching Step 2 as Freelancer
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

  // Fetch Cities when a valid Region is selected
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
  }, [region, regionsList]);

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
  const isStep2Complete = isPasswordValid(password) && password === confirmPassword;

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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, margin: 0, color: '#EDEEF2' }}>
              Create your account
            </h2>
            <span style={{ fontSize: '12px', color: '#8D93A3', padding: '3px 8px', borderRadius: '12px', border: '1px solid #262B36', backgroundColor: '#141824' }}>
              Step {step} of 2
            </span>
          </div>
          <p style={{ color: '#8D93A3', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {step === 1 ? 'Start posting jobs or picking up work.' : 'Complete your profile credentials.'}
          </p>

          {error && (
            <div style={{ backgroundColor: 'rgba(229, 72, 77, 0.1)', borderColor: 'rgba(229, 72, 77, 0.3)', color: '#E5484D' }} className="text-sm mb-4 px-3 py-2.5 rounded-md border">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="first-name">
                    First name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="First"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.replace(/[^A-Za-z\s\-']/g, ''))}
                    className="auth-input"
                  />
                  {firstName && !isNameValid(firstName) && (
                    <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '4px' }}>2-50 letters.</div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="last-name">
                    Last name
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.replace(/[^A-Za-z\s\-']/g, ''))}
                    className="auth-input"
                  />
                  {lastName && !isNameValid(lastName) && (
                    <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '4px' }}>2-50 letters.</div>
                  )}
                </div>
              </div>

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
                  className={`auth-input ${email && (!isEmailFormatValid(email) || !isLegitEmailDomain(email)) ? 'auth-input-error' : ''}`}
                />
                {email && !isEmailFormatValid(email) && (
                  <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '4px' }}>Please enter a valid email.</div>
                )}
                {email && isEmailFormatValid(email) && !isLegitEmailDomain(email) && (
                  <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '4px' }}>
                    Please use a recognized provider (Gmail, Yahoo, Outlook, etc.) or school email (.edu). Disposable emails are not allowed.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="role">
                  I want to join as a:
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="auth-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="freelancer">I want to work as a freelancer</option>
                  <option value="customer">I want to hire talent</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!isStep1Complete}
                className="auth-btn-primary"
              >
                <span>Continue to Step 2</span>
                <i className="bi bi-arrow-right"></i>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              {role === 'freelancer' ? (
                <>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="title">
                        Title <span style={{ color: '#6A7285', fontSize: '11px' }}>(Optional)</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        placeholder="e.g. Web Developer"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="rate">
                        Rate (₱) <span style={{ color: '#6A7285', fontSize: '11px' }}>(Optional)</span>
                      </label>
                      <input
                        id="rate"
                        type="number"
                        placeholder="0.00"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }}>
                        Region <span style={{ color: '#6A7285', fontSize: '11px' }}>(Optional)</span>
                      </label>
                      <CustomAutocomplete
                        value={region}
                        onChange={setRegion}
                        options={regionsList.map(r => r.name)}
                        placeholder="Search region..."
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }}>
                        City <span style={{ color: '#6A7285', fontSize: '11px' }}>(Optional)</span>
                      </label>
                      <CustomAutocomplete
                        value={city}
                        onChange={setCity}
                        options={citiesList.map(c => c.name)}
                        placeholder={!region ? "Pick region first" : "Search city..."}
                        disabled={!region || isFetchingCities}
                        isLoading={isFetchingCities}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="company">
                    Company Name <span style={{ color: '#6A7285', fontSize: '11px' }}>(Optional)</span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    placeholder="Your Company Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="auth-input"
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="password">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#8D93A3', cursor: 'pointer', padding: 0 }}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '12px' }}></i>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8D93A3', marginBottom: '0.35rem' }} htmlFor="confirmPassword">
                    Confirm
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                      style={{ paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle confirm password visibility"
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#8D93A3', cursor: 'pointer', padding: 0 }}
                    >
                      <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '12px' }}></i>
                    </button>
                  </div>
                </div>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <div style={{ color: '#E5484D', fontSize: '11px', marginBottom: '0.5rem' }}>Passwords do not match.</div>
              )}

              {/* Password checklist in clean dark panel */}
              <div className="auth-checklist" style={{ marginBottom: '1rem' }}>
                <div style={{ color: '#8D93A3', fontWeight: 500, marginBottom: '4px' }}>Password must have:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                  <span style={{ color: password.length >= 8 ? '#4EBA6F' : '#6A7285' }}>
                    <i className={`bi ${password.length >= 8 ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    8+ chars
                  </span>
                  <span style={{ color: /[A-Z]/.test(password) ? '#4EBA6F' : '#6A7285' }}>
                    <i className={`bi ${/[A-Z]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 uppercase
                  </span>
                  <span style={{ color: /\d/.test(password) ? '#4EBA6F' : '#6A7285' }}>
                    <i className={`bi ${/\d/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 number
                  </span>
                  <span style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#4EBA6F' : '#6A7285' }}>
                    <i className={`bi ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 symbol
                  </span>
                </div>
              </div>

              {/* Legal disclaimer */}
              <div style={{ fontSize: '11.5px', color: '#8D93A3', marginBottom: '1rem', lineHeight: 1.5, textAlign: 'center' }}>
                By creating an account, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => openLegalModal('terms')}
                  style={{ background: 'transparent', border: 'none', color: '#E7B24B', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 500 }}
                  className="hover:underline"
                >
                  Terms of Service
                </button>{' '}
                and acknowledge our{' '}
                <button
                  type="button"
                  onClick={() => openLegalModal('privacy')}
                  style={{ background: 'transparent', border: 'none', color: '#E7B24B', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 500 }}
                  className="hover:underline"
                >
                  Privacy Notice
                </button>
                .
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="auth-btn-secondary"
                  style={{ flex: '0 0 auto', padding: '0.75rem 1rem' }}
                >
                  <i className="bi bi-arrow-left"></i>
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={!isStep2Complete || loading}
                  className="auth-btn-primary"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#8D93A3', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#E7B24B', fontWeight: 500 }} className="hover:underline">
              Log in
            </Link>
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





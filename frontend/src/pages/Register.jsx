import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
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
<<<<<<< HEAD
        <ul className="rb-auth__autocomplete-list">
=======
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 50,
          maxHeight: '180px',
          overflowY: 'auto',
          backgroundColor: 'var(--auth-surface)',
          border: '1px solid var(--auth-border)',
          borderRadius: '6px',
          listStyle: 'none',
          padding: '4px 0',
          margin: '4px 0 0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
>>>>>>> merged-features
          {filteredOptions.map((opt, i) => (
            <li key={i}>
              <button 
                type="button" 
                className="rb-auth__autocomplete-item"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
<<<<<<< HEAD
=======
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: 'var(--auth-text)',
                  padding: '7px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--auth-surface-alt)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
>>>>>>> merged-features
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
  const [phone, setPhone] = useState('');
  // Where released escrow is paid out
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutProvider, setPayoutProvider] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  // Locations Data
  const [regionsList, setRegionsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  // Client fields
  const [companyName, setCompanyName] = useState('');
  const [clientType, setClientType] = useState('');
  // How the client funds escrow (separate from a freelancer's payout details)
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [paymentAccountName, setPaymentAccountName] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

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
  // Same rules as the backend (utils/payout.js)
  const digitsOnly = (v) => v.replace(/[\s-]/g, '');
  const isMobileValid = (v) => /^(09\d{9}|\+639\d{9})$/.test(digitsOnly(v));
  const isPayoutValid =
    Boolean(payoutMethod) &&
    (payoutMethod !== 'bank' || payoutProvider.trim().length >= 2) &&
    accountName.trim().length >= 2 &&
    (payoutMethod === 'bank' ? /^\d{6,20}$/.test(digitsOnly(accountNumber)) : isMobileValid(accountNumber));
  const isPaymentMethodValid =
    Boolean(paymentMethod) &&
    paymentAccountName.trim().length >= 2 &&
    (paymentMethod === 'card'
      ? /^\d{13,19}$/.test(digitsOnly(paymentAccountNumber)) && /^\d{1,2}\/\d{2}$/.test(cardExpiry.trim())
      : paymentMethod === 'bank'
        ? paymentProvider.trim().length >= 2 && /^\d{6,20}$/.test(digitsOnly(paymentAccountNumber))
        : isMobileValid(paymentAccountNumber));
  const isRoleDetailsValid = role === 'freelancer'
    ? isMobileValid(phone) && isPayoutValid
    : Boolean(clientType) && (clientType === 'individual' || companyName.trim().length >= 2) && isPaymentMethodValid;

  const isStep2Complete = isPasswordValid(password) && password === confirmPassword && over18 && isRoleDetailsValid;

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
      // Step-2 onboarding details go in the same request; the backend stores them on the new account.
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
      };
      if (role === 'freelancer') {
        payload.title = professionalTitle.trim();
        payload.location = [city, region].filter(Boolean).join(', ');
        payload.phone = phone.trim();
        payload.payoutMethod = payoutMethod;
        payload.payoutProvider = payoutProvider.trim();
        payload.accountName = accountName.trim();
        payload.accountNumber = accountNumber.trim();
      } else if (role === 'customer') {
        payload.clientType = clientType;
        payload.companyName = companyName.trim();
        payload.paymentMethod = paymentMethod;
        payload.paymentProvider = paymentProvider.trim();
        payload.paymentAccountName = paymentAccountName.trim();
        payload.paymentAccountNumber = paymentAccountNumber.trim();
        payload.cardExpiry = cardExpiry.trim();
      }

      await registerUser(payload);
      navigate('/login?registered=1');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

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
          <Link to="/" className="rb-auth__mobile-brand" style={{ textDecoration: 'none' }}>
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" className="rb-auth__logo" />
            <div className="rb-auth__brand-text">
              <span className="rb-auth__brand-bold">RAKET</span>
              <span className="rb-auth__brand-light">BASE</span>
            </div>
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <h2 className="rb-auth__title">Create your account</h2>
            <span className="rb-auth__step-badge">Step {step} of 2</span>
          </div>
          
          <p className="rb-auth__description">
            {step === 1 ? 'Start posting jobs or picking up work.' : 'Set up your credentials.'}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 500, margin: 0, color: 'var(--auth-text)' }}>
              Create your account
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--auth-muted)', padding: '3px 8px', borderRadius: '12px', border: '1px solid var(--auth-border)', backgroundColor: 'var(--auth-surface-alt)' }}>
              Step {step} of 2
            </span>
          </div>
          <p style={{ color: 'var(--auth-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {step === 1 ? 'Start posting jobs or picking up work.' : 'Complete your profile credentials.'}
>>>>>>> merged-features
          </p>

          {error && (
            <div className="rb-auth__alert rb-auth__alert--error">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext}>
<<<<<<< HEAD
              <div className="rb-auth__row">
                <div className="rb-auth__field">
                  <label className="rb-auth__label">First name</label>
=======
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="first-name">
                    First name
                  </label>
>>>>>>> merged-features
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
<<<<<<< HEAD
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Last name</label>
=======

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="last-name">
                    Last name
                  </label>
>>>>>>> merged-features
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

<<<<<<< HEAD
              <div className="rb-auth__field">
                <label className="rb-auth__label">Email</label>
=======
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="email">
                  Email
                </label>
>>>>>>> merged-features
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

<<<<<<< HEAD
              <div className="rb-auth__field">
                <label className="rb-auth__label">I want to join as a:</label>
=======
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="role">
                  I want to join as a:
                </label>
>>>>>>> merged-features
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
<<<<<<< HEAD
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Professional Title <span className="rb-auth__label-optional">(Optional)</span></label>
=======
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="title">
                        Title <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
                      </label>
>>>>>>> merged-features
                      <input
                        type="text"
                        className="rb-auth__input"
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        placeholder="e.g. Graphic Designer"
                      />
                    </div>
<<<<<<< HEAD
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
=======
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="phone">
                        Mobile number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="09171234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="auth-input"
>>>>>>> merged-features
                      />
                      {phone && !isMobileValid(phone) && (
                        <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '0.25rem' }}>Use a PH mobile number like 09171234567.</div>
                      )}
                    </div>
                  </div>
<<<<<<< HEAD
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Region <span className="rb-auth__label-optional">(Optional)</span></label>
=======

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }}>
                        Region <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
                      </label>
>>>>>>> merged-features
                      <CustomAutocomplete
                        value={region}
                        onChange={setRegion}
                        options={regionsList.map(r => r.name)}
                        placeholder="Select Region"
                      />
                    </div>
<<<<<<< HEAD
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">City <span className="rb-auth__label-optional">(Optional)</span></label>
=======
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }}>
                        City <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
                      </label>
>>>>>>> merged-features
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

                  {/* Payout details: where released escrow goes */}
                  <div style={{ fontSize: '12px', color: 'var(--auth-muted)', fontWeight: 600, margin: '0.25rem 0 0.5rem' }}>
                    Payout details <span style={{ color: 'var(--auth-subtle)', fontWeight: 400 }}>· where your earnings are sent; only the last 4 digits are ever shown</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="payoutMethod">Payout method</label>
                      <select
                        id="payoutMethod"
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="auth-input"
                      >
                        <option value="">Choose...</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank">Bank account</option>
                      </select>
                    </div>
                    {payoutMethod === 'bank' && (
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="payoutProvider">Bank name</label>
                        <input
                          id="payoutProvider"
                          type="text"
                          placeholder="e.g. BDO, BPI"
                          maxLength={60}
                          value={payoutProvider}
                          onChange={(e) => setPayoutProvider(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                    )}
                  </div>
                  {payoutMethod && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="accountName">Account name</label>
                        <input
                          id="accountName"
                          type="text"
                          placeholder="Name on the account"
                          maxLength={100}
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="accountNumber">
                          {payoutMethod === 'bank' ? 'Account number' : `${payoutMethod === 'gcash' ? 'GCash' : 'Maya'} number`}
                        </label>
                        <input
                          id="accountNumber"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder={payoutMethod === 'bank' ? '6 to 20 digits' : '09171234567'}
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
<<<<<<< HEAD
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Company Name <span className="rb-auth__label-optional">(Optional)</span></label>
                  <input
                    type="text"
                    className="rb-auth__input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company Inc."
                  />
=======
                <>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="clientType">
                      Hiring as
                    </label>
                    <select
                      id="clientType"
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                      className="auth-input"
                    >
                      <option value="">Choose...</option>
                      <option value="individual">Individual</option>
                      <option value="small_business">Small Business</option>
                      <option value="major_contractor">Major Contractor</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="company">
                      Business name{' '}
                      {clientType === 'individual' && <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>}
                    </label>
                    <input
                      id="company"
                      type="text"
                      placeholder={clientType === 'individual' ? 'Leave blank if none' : 'Your Company Inc.'}
                      maxLength={100}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="auth-input"
                    />
                  </div>
>>>>>>> merged-features
                </div>

                {/* Payment method: how escrow is funded when hiring */}
                <div style={{ fontSize: '12px', color: 'var(--auth-muted)', fontWeight: 600, margin: '0.25rem 0 0.5rem' }}>
                  Payment method <span style={{ color: 'var(--auth-subtle)', fontWeight: 400 }}>· used to fund escrow when you hire; only the last 4 digits are ever shown</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="paymentMethod">Pay with</label>
                    <select
                      id="paymentMethod"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="auth-input"
                    >
                      <option value="">Choose...</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank">Bank account</option>
                      <option value="card">Debit / credit card</option>
                    </select>
                  </div>
                  {paymentMethod === 'bank' && (
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="paymentProvider">Bank name</label>
                      <input
                        id="paymentProvider"
                        type="text"
                        placeholder="e.g. BDO, BPI"
                        maxLength={60}
                        value={paymentProvider}
                        onChange={(e) => setPaymentProvider(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  )}
                </div>
                {paymentMethod && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="paymentAccountName">{paymentMethod === 'card' ? 'Name on card' : 'Account name'}</label>
                      <input
                        id="paymentAccountName"
                        type="text"
                        maxLength={100}
                        value={paymentAccountName}
                        onChange={(e) => setPaymentAccountName(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                    <div style={{ flex: paymentMethod === 'card' ? 1.4 : 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="paymentAccountNumber">
                        {paymentMethod === 'card' ? 'Card number' : paymentMethod === 'bank' ? 'Account number' : `${paymentMethod === 'gcash' ? 'GCash' : 'Maya'} number`}
                      </label>
                      <input
                        id="paymentAccountNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete={paymentMethod === 'card' ? 'cc-number' : 'off'}
                        placeholder={paymentMethod === 'card' ? '4242 4242 4242 4242' : paymentMethod === 'bank' ? '6 to 20 digits' : '09171234567'}
                        value={paymentAccountNumber}
                        onChange={(e) => setPaymentAccountNumber(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                    {paymentMethod === 'card' && (
                      <div style={{ flex: 0.6 }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="cardExpiry">Expiry</label>
                        <input
                          id="cardExpiry"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="auth-input"
                        />
                      </div>
                    )}
                  </div>
                )}
                </>
              )}

<<<<<<< HEAD
              <div className="rb-auth__row">
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Password</label>
                  <div className="rb-auth__input-wrapper">
=======
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="password">
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
>>>>>>> merged-features
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
<<<<<<< HEAD
                      tabIndex="-1"
=======
                      aria-label="Toggle password visibility"
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', padding: 0 }}
>>>>>>> merged-features
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                    </button>
                  </div>
                </div>
<<<<<<< HEAD
                <div className="rb-auth__field">
                  <label className="rb-auth__label">Confirm</label>
                  <div className="rb-auth__input-wrapper">
=======

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="confirmPassword">
                    Confirm
                  </label>
                  <div style={{ position: 'relative' }}>
>>>>>>> merged-features
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
<<<<<<< HEAD
                      tabIndex="-1"
=======
                      aria-label="Toggle confirm password visibility"
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', padding: 0 }}
>>>>>>> merged-features
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

<<<<<<< HEAD
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
=======
              {/* Password checklist in clean dark panel */}
              <div className="auth-checklist" style={{ marginBottom: '1rem' }}>
                <div style={{ color: 'var(--auth-muted)', fontWeight: 500, marginBottom: '4px' }}>Password must have:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
                  <span style={{ color: password.length >= 8 ? '#4EBA6F' : 'var(--auth-subtle)' }}>
                    <i className={`bi ${password.length >= 8 ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    8+ chars
                  </span>
                  <span style={{ color: /[A-Z]/.test(password) ? '#4EBA6F' : 'var(--auth-subtle)' }}>
                    <i className={`bi ${/[A-Z]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 uppercase
                  </span>
                  <span style={{ color: /\d/.test(password) ? '#4EBA6F' : 'var(--auth-subtle)' }}>
                    <i className={`bi ${/\d/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 number
                  </span>
                  <span style={{ color: /[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#4EBA6F' : 'var(--auth-subtle)' }}>
                    <i className={`bi ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'}`} style={{ marginRight: '4px' }}></i>
                    1 symbol
                  </span>
                </div>
              </div>

              {/* Legal disclaimer */}
              <div style={{ fontSize: '11.5px', color: 'var(--auth-muted)', marginBottom: '1rem', lineHeight: 1.5, textAlign: 'center' }}>
                By creating an account, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => openLegalModal('terms')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--auth-accent)', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 500 }}
                  className="hover:underline"
                >
                  Terms of Service
                </button>{' '}
                and acknowledge our{' '}
                <button
                  type="button"
                  onClick={() => openLegalModal('privacy')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--auth-accent)', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: 500 }}
                  className="hover:underline"
                >
                  Privacy Notice
                </button>
                .
              </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
              <input 
                type="checkbox" 
                id="over18" 
                checked={over18} 
                onChange={(e) => setOver18(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#FF5A1E' }}
              />
              <label htmlFor="over18" style={{ fontSize: '13px', color: 'var(--auth-text)', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                I confirm that I am at least 18 years of age.
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
>>>>>>> merged-features
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

<<<<<<< HEAD
          <div className="rb-auth__footer-text">
            Already have an account? <Link to="/login">Log in</Link>
=======
          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--auth-muted)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--auth-accent)', fontWeight: 500 }} className="hover:underline">
              Log in
            </Link>
>>>>>>> merged-features
          </div>
        </div>
      </div>
      
      <LegalModal 
        isOpen={legalModalOpen} 
        onClose={() => setLegalModalOpen(false)} 
        docType={legalModalDoc} 
      />
    </div>
  );
}

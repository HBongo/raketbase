import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
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
          backgroundColor: 'var(--auth-surface)',
          border: '1px solid var(--auth-border)',
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
                  color: 'var(--auth-text)',
                  padding: '7px 12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--auth-surface-alt)'}
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
  // Auth pages always open in light mode; the corner button toggles dark mode for this page only.
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
  }, [isDarkMode]);

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
  const [over18, setOver18] = useState(false);
  
  // Step 2 freelancer fields
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
  
  // Step 2 client fields
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="first-name">
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="last-name">
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="email">
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="role">
                  I want to join as a:
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="auth-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="freelancer">Freelancer — I want to find work</option>
                  <option value="customer">Client — I want to hire someone</option>
                </select>
              </div>

                              <button
                  type="submit"
                  disabled={!isStep1Complete}
                  className="auth-btn-primary"
                  style={{ opacity: !isStep1Complete ? 0.6 : 1, cursor: !isStep1Complete ? 'not-allowed' : 'pointer' }}
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
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="title">
                        Title <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
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
                      />
                      {phone && !isMobileValid(phone) && (
                        <div style={{ color: '#E5484D', fontSize: '11px', marginTop: '0.25rem' }}>Use a PH mobile number like 09171234567.</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }}>
                        Region <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
                      </label>
                      <CustomAutocomplete
                        value={region}
                        onChange={setRegion}
                        options={regionsList.map(r => r.name)}
                        placeholder="Search region..."
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }}>
                        City <span style={{ color: 'var(--auth-subtle)', fontSize: '11px' }}>(Optional)</span>
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

              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="password">
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
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} style={{ fontSize: '12px' }}></i>
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--auth-muted)', marginBottom: '0.35rem' }} htmlFor="confirmPassword">
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
                      style={{ position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--auth-muted)', cursor: 'pointer', padding: 0 }}
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
                  style={{ flex: 1, opacity: (!isStep2Complete || loading) ? 0.6 : 1, cursor: (!isStep2Complete || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--auth-muted)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--auth-accent)', fontWeight: 500 }} className="hover:underline">
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






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
  // Persist dark mode preference in localStorage and sync with document.body
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  // Where released escrow is paid out (required for freelancers)
  const [payoutMethod, setPayoutMethod] = useState('');
  const [payoutProvider, setPayoutProvider] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Locations Data
  const [regionsList, setRegionsList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  // Client fields
  const [companyName, setCompanyName] = useState('');
  const [clientType, setClientType] = useState('');
  // How the client funds escrow (required for clients)
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
    if (step === 2 && (role === 'freelancer' || role === 'both') && regionsList.length === 0) {
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
  // "Both" signs up as a freelancer; every account can switch to Client mode anytime
  const needsPhone = role === 'freelancer' || role === 'both';
  const isPhoneValid = (v) => /^(09\d{9}|\+639\d{9})$/.test(v.replace(/[\s-]/g, ''));
  const digitsOnly = (v) => v.replace(/[\s-]/g, '');
  const isBankNumberValid = (v) => /^\d{6,20}$/.test(digitsOnly(v));
  const isCardNumberValid = (v) => /^\d{13,19}$/.test(digitsOnly(v));
  const isExpiryValid = (v) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v.trim());

  const isPayoutComplete = Boolean(payoutMethod)
    && accountName.trim().length >= 2
    && (payoutMethod === 'bank'
      ? payoutProvider.trim().length >= 2 && isBankNumberValid(accountNumber)
      : isPhoneValid(accountNumber));

  const isPaymentComplete = Boolean(paymentMethod)
    && paymentAccountName.trim().length >= 2
    && (paymentMethod === 'card'
      ? isCardNumberValid(paymentAccountNumber) && isExpiryValid(cardExpiry)
      : paymentMethod === 'bank'
        ? paymentProvider.trim().length >= 2 && isBankNumberValid(paymentAccountNumber)
        : isPhoneValid(paymentAccountNumber));

  const isClientInfoComplete = Boolean(clientType)
    && (clientType === 'individual' || companyName.trim().length >= 2)
    && isPaymentComplete;

  const isStep2Complete = isPasswordValid(password) && password === confirmPassword && over18
    && (needsPhone ? isPhoneValid(phone) && isPayoutComplete : isClientInfoComplete);

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
    if (!isStep2Complete || loading) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role: needsPhone ? 'freelancer' : 'customer',
      };
      if (needsPhone) {
        payload.title = professionalTitle.trim();
        payload.location = [city, region].filter(Boolean).join(', ');
        payload.phone = phone.trim();
        payload.payoutMethod = payoutMethod;
        payload.payoutProvider = payoutProvider.trim();
        payload.accountName = accountName.trim();
        payload.accountNumber = accountNumber.trim();
      } else {
        payload.clientType = clientType;
        payload.companyName = companyName.trim();
        payload.paymentMethod = paymentMethod;
        payload.paymentProvider = paymentProvider.trim();
        payload.paymentAccountName = paymentAccountName.trim();
        payload.paymentAccountNumber = paymentAccountNumber.trim();
        if (paymentMethod === 'card') payload.cardExpiry = cardExpiry.trim();
      }
      await registerUser(payload);

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
                  <option value="both">Both — I want to find work and hire</option>
                </select>
                {role === 'both' && (
                  <div style={{ color: 'var(--auth-muted)', fontSize: '12px', marginTop: '6px' }}>
                    <i className="bi bi-info-circle me-1"></i> Every RaketBase account gives you access to both Freelancer and Client modes with instant switching.
                  </div>
                )}
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
              {role === 'both' && (
                <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#34D399', fontSize: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid' }}>
                  <i className="bi bi-stars me-1"></i> <strong>Dual-Role Account:</strong> Set up your freelancer profile below. You can seamlessly switch to Client mode to hire anytime!
                </div>
              )}
              {role === 'freelancer' || role === 'both' ? (
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
                      <label className="rb-auth__label">Mobile Number</label>
                      <input
                        type="tel"
                        className="rb-auth__input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 09171234567"
                        autoComplete="tel"
                        required
                      />
                      {phone && !isPhoneValid(phone) && (
                        <div className="rb-auth__field-error">
                          Enter a PH mobile number, like 09171234567 or +639171234567.
                        </div>
                      )}
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

                  {/* Payout details: where the freelancer gets paid when escrow is released */}
                  <p className="rb-auth__label" style={{ marginTop: '0.5rem' }}>
                    <i className="bi bi-wallet2 me-1"></i> Payout details <span className="rb-auth__label-optional">(where you get paid; only shown masked)</span>
                  </p>
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Payout Method</label>
                      <select className="rb-auth__input" value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} required>
                        <option value="">Select method</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank">Bank account</option>
                      </select>
                    </div>
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Account Holder Name</label>
                      <input
                        type="text"
                        className="rb-auth__input"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Name on the account"
                        required
                      />
                    </div>
                  </div>
                  {/* The number (and bank name) fields only appear once a method is chosen */}
                  {payoutMethod && (
                  <div className="rb-auth__row">
                    {payoutMethod === 'bank' && (
                      <div className="rb-auth__field">
                        <label className="rb-auth__label">Bank Name</label>
                        <input
                          type="text"
                          className="rb-auth__input"
                          value={payoutProvider}
                          onChange={(e) => setPayoutProvider(e.target.value)}
                          placeholder="e.g. BDO, BPI"
                          required
                        />
                      </div>
                    )}
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">{payoutMethod === 'bank' ? 'Account Number' : 'GCash / Maya Number'}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="rb-auth__input"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder={payoutMethod === 'bank' ? '6 to 20 digits' : 'e.g. 09171234567'}
                        required
                      />
                      {accountNumber && !(payoutMethod === 'bank' ? isBankNumberValid(accountNumber) : isPhoneValid(accountNumber)) && (
                        <div className="rb-auth__field-error">
                          {payoutMethod === 'bank' ? 'Account number must be 6 to 20 digits.' : 'Enter a mobile number like 09171234567.'}
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </>
              ) : (
                <>
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Hiring As</label>
                      <select className="rb-auth__input" value={clientType} onChange={(e) => setClientType(e.target.value)} required>
                        <option value="">Select one</option>
                        <option value="individual">Individual</option>
                        <option value="small_business">Small Business</option>
                        <option value="major_contractor">Major Contractor</option>
                      </select>
                    </div>
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">
                        Business Name {clientType === 'individual' && <span className="rb-auth__label-optional">(Optional)</span>}
                      </label>
                      <input
                        type="text"
                        className="rb-auth__input"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your Company Inc."
                        required={clientType !== 'individual'}
                      />
                    </div>
                  </div>

                  {/* Payment method: how the client funds escrow when hiring */}
                  <p className="rb-auth__label" style={{ marginTop: '0.5rem' }}>
                    <i className="bi bi-credit-card me-1"></i> Payment method <span className="rb-auth__label-optional">(used to fund escrow; only shown masked)</span>
                  </p>
                  <div className="rb-auth__row">
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">Method</label>
                      <select className="rb-auth__input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                        <option value="">Select method</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank">Bank account</option>
                        <option value="card">Debit / credit card</option>
                      </select>
                    </div>
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">{paymentMethod === 'card' ? 'Name on Card' : 'Account Holder Name'}</label>
                      <input
                        type="text"
                        className="rb-auth__input"
                        value={paymentAccountName}
                        onChange={(e) => setPaymentAccountName(e.target.value)}
                        placeholder={paymentMethod === 'card' ? 'As printed on the card' : 'Name on the account'}
                        required
                      />
                    </div>
                  </div>
                  {/* The number / bank / card fields only appear once a method is chosen */}
                  {paymentMethod && (
                  <div className="rb-auth__row">
                    {paymentMethod === 'bank' && (
                      <div className="rb-auth__field">
                        <label className="rb-auth__label">Bank Name</label>
                        <input
                          type="text"
                          className="rb-auth__input"
                          value={paymentProvider}
                          onChange={(e) => setPaymentProvider(e.target.value)}
                          placeholder="e.g. BDO, BPI"
                          required
                        />
                      </div>
                    )}
                    <div className="rb-auth__field">
                      <label className="rb-auth__label">
                        {paymentMethod === 'card' ? 'Card Number' : paymentMethod === 'bank' ? 'Account Number' : 'GCash / Maya Number'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="rb-auth__input"
                        value={paymentAccountNumber}
                        onChange={(e) => setPaymentAccountNumber(e.target.value)}
                        placeholder={paymentMethod === 'card' ? 'Card number' : paymentMethod === 'bank' ? '6 to 20 digits' : 'e.g. 09171234567'}
                        autoComplete={paymentMethod === 'card' ? 'cc-number' : 'off'}
                        required
                      />
                    </div>
                    {paymentMethod === 'card' && (
                      <div className="rb-auth__field">
                        <label className="rb-auth__label">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          className="rb-auth__input"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="08/28"
                          autoComplete="cc-exp"
                          maxLength={5}
                          required
                        />
                      </div>
                    )}
                  </div>
                  )}
                  {paymentMethod === 'card' && (
                    <div className="rb-auth__label-optional" style={{ fontSize: '12px', marginTop: '-0.25rem', marginBottom: '0.75rem' }}>
                      <i className="bi bi-shield-lock me-1"></i> Only the card brand, last 4 digits, and expiry are saved, never the full number.
                    </div>
                  )}
                </>
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

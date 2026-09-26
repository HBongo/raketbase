import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, updateProfile } from '../services/api';

function CustomAutocomplete({ value, onChange, options, placeholder, icon, disabled, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  // Sync internal search state with external value changes
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="login-input-group position-relative" style={{ overflow: 'visible' }}>
      <i className={`bi ${icon} input-icon`}></i>
      <input 
        type="text" 
        className="login-input" 
        placeholder={isLoading ? "Loading..." : placeholder}
        value={search}
        disabled={disabled}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay closing so that the click event on a list item can fire
          setTimeout(() => setIsOpen(false), 200);
        }}
        autoComplete="off"
      />
      {isOpen && !disabled && filteredOptions.length > 0 && (
        <ul className="custom-autocomplete-menu m-0 p-0">
          {filteredOptions.map((opt, i) => (
            <li key={i}>
              <button 
                type="button" 
                onClick={() => {
                  onChange(opt);
                  setSearch(opt);
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

export default function Register() {
  useEffect(() => {
    document.body.classList.remove('dark-mode');
  }, []);

  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [suffix, setSuffix] = useState('');
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

  // Fetch Regions when reaching Step 2 as Freelancer
  useEffect(() => {
    if (step === 2 && role === 'freelancer' && regionsList.length === 0) {
      fetch('https://psgc.gitlab.io/api/regions/')
        .then(res => res.json())
        .then(data => {
          // Sort regions alphabetically
          const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
          setRegionsList(sorted);
        })
        .catch(err => console.error('Failed to fetch regions', err));
    }
  }, [step, role, regionsList.length]);

  // Fetch Cities when a valid Region is selected
  useEffect(() => {
    if (region) {
      const selectedRegion = regionsList.find(r => r.name === region);
      if (selectedRegion) {
        setIsFetchingCities(true);
        // Only clear city if the new regions cities list doesn't contain the current city
        fetch(`https://psgc.gitlab.io/api/regions/${selectedRegion.code}/cities-municipalities/`)
          .then(res => res.json())
          .then(data => {
            const cleanedCities = data.map(c => ({
              ...c,
              name: c.name.replace(/^City of /i, '').replace(/ City$/i, '').trim()
            }));
            cleanedCities.sort((a, b) => a.name.localeCompare(b.name));
            setCitiesList(cleanedCities);
            setIsFetchingCities(false);
            
            // If the currently typed city isn't in this new region, clear it
            if (city && !cleanedCities.some(c => c.name === city)) {
              setCity('');
            }
          })
          .catch(err => {
            console.error('Failed to fetch cities', err);
            setIsFetchingCities(false);
          });
      } else {
        setCitiesList([]);
      }
    } else {
      setCitiesList([]);
    }
    // We intentionally leave 'city' out of the dependency array so it doesn't trigger on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, regionsList]);

  const isNameValid = (name) => /^[A-Za-z\s\-']{2,50}$/.test(name.trim());
  const isEmailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isPasswordValid = (p) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(p);

  const isStep1Complete = isNameValid(firstName) && isNameValid(lastName) && isEmailValid(email) && Boolean(role);
  
  const isStep2Complete = isPasswordValid(password) && password === confirmPassword;

  const hasStep1Input = firstName || lastName || middleInitial || suffix || email || role !== 'freelancer';
  
  const hasStep2Input = professionalTitle || hourlyRate || region || city || companyName || password || confirmPassword;

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
      const res = await registerUser({ firstName, lastName, email, password, role });
      
      if (res.token) {
        localStorage.setItem('token', res.token);
        const updates = {};
        if (middleInitial && middleInitial.toLowerCase() !== 'n/a') updates.middle_initial = middleInitial;
        if (suffix && suffix.toLowerCase() !== 'n/a') updates.suffix = suffix;
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

  function handleClear() {
    setFirstName('');
    setLastName('');
    setMiddleInitial('');
    setSuffix('');
    setEmail('');
    setRole('freelancer');
    setError('');
  }

  function handleClearStep2() {
    setProfessionalTitle('');
    setHourlyRate('');
    setRegion('');
    setCity('');
    setCompanyName('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }

  return (
    <div className="login-wrapper">
      <div className="login-bg-shape login-bg-shape-1"></div>
      <div className="login-bg-shape login-bg-shape-2"></div>
      
      <div className="login-card register-card">
        
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

        {step === 1 ? (
          <form onSubmit={handleNext} id="registerFormStep1" noValidate>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="first-name" className="login-form-label">First Name <span className="text-danger">*</span></label>
                <div className="login-input-group">
                  <i className="bi bi-person input-icon"></i>
                  <input type="text" id="first-name" className="login-input" placeholder="First" value={firstName} onChange={(e) => setFirstName(e.target.value.replace(/[^A-Za-z\s\-']/g, ''))} required />
                </div>
                {firstName && !isNameValid(firstName) && <div className="text-danger small mt-1">2-50 letters.</div>}
              </div>

              <div className="col-md-6">
                <label htmlFor="last-name" className="login-form-label">Last Name <span className="text-danger">*</span></label>
                <div className="login-input-group">
                  <i className="bi bi-person input-icon"></i>
                  <input type="text" id="last-name" className="login-input" placeholder="Last" value={lastName} onChange={(e) => setLastName(e.target.value.replace(/[^A-Za-z\s\-']/g, ''))} required />
                </div>
                {lastName && !isNameValid(lastName) && <div className="text-danger small mt-1">2-50 letters.</div>}
              </div>

              <div className="col-md-6">
                <label htmlFor="middle-initial" className="login-form-label">
                  Middle Initial <span className="text-muted fw-normal" style={{ fontSize: '11px' }}>(write n/a if not applicable)</span>
                </label>
                <div className="login-input-group">
                  <input type="text" id="middle-initial" className="login-input text-center px-2" placeholder="e.g. M" maxLength="3" value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value.replace(/[^A-Za-z/]/g, '').toUpperCase())} />
                </div>
              </div>

              <div className="col-md-6">
                <label htmlFor="suffix" className="login-form-label">
                  Suffix <span className="text-muted fw-normal" style={{ fontSize: '11px' }}>(write n/a if not applicable)</span>
                </label>
                <div className="login-input-group">
                  <input type="text" id="suffix" className="login-input px-3" placeholder="e.g. Jr., III" value={suffix} onChange={(e) => setSuffix(e.target.value)} />
                </div>
              </div>
            </div>
            
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="login-form-group mb-0">
                  <label htmlFor="email" className="login-form-label">Email Address <span className="text-danger">*</span></label>
                  <div className="login-input-group">
                    <i className="bi bi-envelope input-icon"></i>
                    <input type="email" id="email" className="login-input" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  {email && !isEmailValid(email) && <div className="text-danger small mt-1">Enter a valid email address.</div>}
                </div>
              </div>

              <div className="col-md-6">
                <div className="login-form-group mb-0">
                  <label htmlFor="role" className="login-form-label">I want to join as a: <span className="text-danger">*</span></label>
                  <div className="login-input-group">
                    <i className={`bi ${role === 'freelancer' ? 'bi-laptop' : 'bi-briefcase'} input-icon`}></i>
                    <select id="role" className="form-select login-input bg-transparent" value={role} onChange={(e) => setRole(e.target.value)} required>
                      <option value="freelancer" style={{color: 'black'}}>Freelancer</option>
                      <option value="customer" style={{color: 'black'}}>Client (Customer)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="d-flex gap-2 justify-content-center">
              <button type="button" className="btn btn-outline-secondary register-btn" onClick={handleClear} disabled={!hasStep1Input}>Clear</button>
              <button type="submit" className="btn btn-login register-btn" style={{ backgroundColor: isStep1Complete ? '#FF5A1E' : '#6c757d', borderColor: isStep1Complete ? '#FF5A1E' : '#6c757d', cursor: isStep1Complete ? 'pointer' : 'not-allowed' }} disabled={!isStep1Complete}>Next Step <i className="bi bi-arrow-right"></i></button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} id="registerFormStep2" noValidate>
            <div className="mb-4 text-center">
              <h5 className="fw-bold mb-1" style={{ color: '#072F1F' }}>{role === 'freelancer' ? 'Freelancer Profile' : 'Client Profile'}</h5>
              <p className="text-muted small mb-0">Just a few more details to secure your account.</p>
            </div>

            <div className="row g-3 mb-3">
              {role === 'freelancer' ? (
                <>
                  <div className="col-md-6">
                    <label htmlFor="title" className="login-form-label">Professional Title <span className="text-muted fw-normal">(Optional)</span></label>
                    <div className="login-input-group">
                      <i className="bi bi-person-badge input-icon"></i>
                      <input type="text" id="title" className="login-input" placeholder="e.g. Full-Stack Developer" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="rate" className="login-form-label">Hourly Rate (Γé▒) <span className="text-muted fw-normal">(Optional)</span></label>
                    <div className="login-input-group">
                      <i className="bi bi-currency-dollar input-icon"></i>
                      <input type="number" id="rate" className="login-input" placeholder="0.00" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="region" className="login-form-label">Region <span className="text-muted fw-normal">(Optional)</span></label>
                    <CustomAutocomplete 
                      value={region}
                      onChange={setRegion}
                      options={regionsList.map(r => r.name)}
                      placeholder="Type to search region..."
                      icon="bi-geo-alt"
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="city" className="login-form-label">City/Municipality <span className="text-muted fw-normal">(Optional)</span></label>
                    <CustomAutocomplete 
                      value={city}
                      onChange={setCity}
                      options={citiesList.map(c => c.name)}
                      placeholder={!region ? "Select region first..." : "Type to search city..."}
                      icon="bi-geo"
                      disabled={!region || isFetchingCities}
                      isLoading={isFetchingCities}
                    />
                  </div>
                </>
              ) : (
                <div className="col-12">
                  <label htmlFor="company" className="login-form-label">Company Name <span className="text-muted fw-normal">(Optional)</span></label>
                  <div className="login-input-group">
                    <i className="bi bi-building input-icon"></i>
                    <input type="text" id="company" className="login-input" placeholder="Your Company Inc." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label htmlFor="password" className="login-form-label">Password <span className="text-danger">*</span></label>
                <div className="login-input-group">
                  <i className="bi bi-shield-lock input-icon"></i>
                  <input type={showPassword ? "text" : "password"} id="password" className="login-input login-input-password" placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="password-toggle-btn" aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
                
                {/* Dynamic Password Checklist */}
                <ul className="list-unstyled mt-2 mb-0 px-1" style={{ fontSize: '0.75rem', color: 'var(--text-muted-green)' }}>
                  <li className={`d-flex align-items-start mb-2 ${password.length >= 8 ? "text-success fw-medium" : "text-muted"}`}>
                    <i className={`bi ${password.length >= 8 ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} style={{ fontSize: '0.8rem', marginTop: '1px' }}></i>
                    <span><strong>Minimum Length:</strong> At least 8 characters long (12+ recommended for maximum security).</span>
                  </li>
                  <li className={`d-flex align-items-start mb-2 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-success fw-medium" : "text-muted"}`}>
                    <i className={`bi ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} style={{ fontSize: '0.8rem', marginTop: '1px' }}></i>
                    <span><strong>Mixed Case:</strong> Must contain at least one uppercase letter (A-Z) and one lowercase letter (a-z).</span>
                  </li>
                  <li className={`d-flex align-items-start mb-2 ${/\d/.test(password) ? "text-success fw-medium" : "text-muted"}`}>
                    <i className={`bi ${/\d/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} style={{ fontSize: '0.8rem', marginTop: '1px' }}></i>
                    <span><strong>Numbers:</strong> Must include at least one numeric digit (0-9).</span>
                  </li>
                  <li className={`d-flex align-items-start ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-success fw-medium" : "text-muted"}`}>
                    <i className={`bi ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bi-check-circle-fill' : 'bi-circle'} me-2`} style={{ fontSize: '0.8rem', marginTop: '1px' }}></i>
                    <span><strong>Special Characters:</strong> Must include at least one symbol (e.g., !, @, #, $, %, ^, &, *).</span>
                  </li>
                </ul>

              </div>

              <div className="col-md-6">
                <label htmlFor="confirmPassword" className="login-form-label">Confirm Password <span className="text-danger">*</span></label>
                <div className="login-input-group">
                  <i className="bi bi-shield-check input-icon"></i>
                  <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" className="login-input login-input-password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                  <button type="button" className="password-toggle-btn" aria-label="Show password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <div className="text-danger small mt-1">Passwords do not match.</div>}
              </div>
            </div>
            
            <div className="d-flex gap-2 justify-content-center">
              <button type="button" className="btn btn-outline-secondary register-btn" onClick={handleBack} disabled={loading}>Back</button>
              <button type="button" className="btn btn-outline-secondary register-btn" onClick={handleClearStep2} disabled={!hasStep2Input || loading}>Clear</button>
              <button type="submit" className="btn btn-login register-btn" style={{ backgroundColor: isStep2Complete ? '#FF5A1E' : '#6c757d', borderColor: isStep2Complete ? '#FF5A1E' : '#6c757d', cursor: isStep2Complete ? 'pointer' : 'not-allowed' }} disabled={!isStep2Complete || loading}>{loading ? 'Registering...' : 'Register'}{loading ? null : <i className="bi bi-check-lg"></i>}</button>
            </div>
            
          </form>
        )}
        
        <div className="login-divider">Or register with</div>
        
        <div className="social-login-grid" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn-social" type="button" id="btn-google" onClick={() => alert("Google Sign-In is currently under maintenance. Please register with your email.")}>
            <i className="bi bi-google text-danger"></i>
            <span>Google</span>
          </button>
        </div>
        
        <p className="login-footer-text">
          Already have an account? <Link to="/login" className="login-footer-link">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

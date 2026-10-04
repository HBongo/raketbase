import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LegalDocViewer from '../components/LegalDocViewer';
import '../styles/legal.css';

export default function LegalPage({ defaultDoc = 'terms' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true' || localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'true');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'false');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const isLoggedIn = !!localStorage.getItem('token');
  const backLink = isLoggedIn ? '/dashboard' : '/register';
  const backText = isLoggedIn ? 'Back to RaketBase' : 'Back to Register';
  
  const goBack = (e) => {
    if (isLoggedIn && window.history.length > 1) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const isPrivacyPath = location.pathname.includes('privacy');
  const [docType, setDocType] = useState(isPrivacyPath ? 'privacy' : defaultDoc);

  useEffect(() => {
    if (location.pathname.includes('privacy')) {
      setDocType('privacy');
    } else if (location.pathname.includes('terms')) {
      setDocType('terms');
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleTabChange = (type) => {
    setDocType(type);
    navigate(type === 'privacy' ? '/privacy' : '/terms', { replace: true });
    window.scrollTo(0, 0);
  };

  return (
<<<<<<< HEAD
    <div className="legal-page-wrapper min-vh-100">
      <style>{`
        .legal-page-wrapper { min-height: 100vh; background-color: #F8FAFC; color: #1E293B; }
        .legal-navbar { background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0; }
        .legal-card { background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; }
        
        body.dark-mode .legal-page-wrapper { background-color: #10131A !important; color: #EDEEF2 !important; }
        body.dark-mode .legal-navbar { background-color: #141824 !important; border-bottom-color: #262B36 !important; }
        body.dark-mode .legal-navbar .navbar-brand { color: #EDEEF2 !important; }
        body.dark-mode .legal-card { background-color: #141824 !important; border-color: #262B36 !important; color: #EDEEF2 !important; }
        body.dark-mode .legal-card h1, body.dark-mode .legal-card h2, body.dark-mode .legal-card h3,
        body.dark-mode .legal-card h4, body.dark-mode .legal-card h5, body.dark-mode .legal-card h6 { color: #EDEEF2 !important; }
        body.dark-mode .legal-card p, body.dark-mode .legal-card li { color: #CBD5E1 !important; }
        body.dark-mode .legal-card .alert { background-color: #1D2129 !important; border-color: #262B36 !important; color: #EDEEF2 !important; }
        body.dark-mode .legal-card .text-secondary { color: #94A3B8 !important; }
        body.dark-mode .legal-tab-btn-inactive { background-color: #1D2129 !important; border-color: #262B36 !important; color: #EDEEF2 !important; }
      `}</style>

      {/* Basic Navbar */}
      <nav className="navbar legal-navbar py-2">
        <div className="container-lg d-flex align-items-center justify-content-between">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="navbar-brand fw-bold mb-0">
            RaketBase
=======
    <div className={`legal-page ${isDarkMode ? 'legal-dark' : ''}`}>
      <nav className="legal-navbar">
        <div className="legal-nav-content">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="legal-brand">
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" />
            <div className="legal-brand-text">
              <span className="legal-brand-bold">RAKET</span>
              <span className="legal-brand-light">BASE</span>
            </div>
>>>>>>> paulaver2+missingfeatures
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ background: 'none', border: 'none', color: 'var(--legal-text)', cursor: 'pointer', fontSize: '1.25rem' }}
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <i className={isDarkMode ? 'bi bi-sun-fill' : 'bi bi-moon-fill'} />
            </button>
            <Link to={backLink} onClick={goBack} className="legal-back-btn">
              &larr; {backText}
            </Link>
          </div>
        </div>
      </nav>

<<<<<<< HEAD
      {/* Main Container */}
      <div className="container-lg py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            {/* Simple Tab Switcher */}
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className={`btn btn-sm ${docType === 'terms' ? 'btn-dark' : 'btn-light border legal-tab-btn-inactive'}`}
                onClick={() => handleTabChange('terms')}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'privacy' ? 'btn-dark' : 'btn-light border legal-tab-btn-inactive'}`}
                onClick={() => handleTabChange('privacy')}
              >
                Privacy Notice
              </button>
            </div>

            {/* Document Content */}
            <div className="card legal-card shadow-sm p-4 p-md-5">
              <LegalDocViewer docType={docType} />
            </div>

            <div className="text-center mt-3">
              <Link to={backLink} onClick={goBack} className="text-muted small">
                {backText}
              </Link>
            </div>
          </div>
=======
      <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <div className="legal-tabs" style={{ display: 'inline-flex', marginBottom: '2rem' }}>
          <button
            type="button"
            className={`legal-tab ${docType === 'terms' ? 'legal-tab--active' : ''}`}
            onClick={() => handleTabChange('terms')}
          >
            Terms of Service
          </button>
          <button
            type="button"
            className={`legal-tab ${docType === 'privacy' ? 'legal-tab--active' : ''}`}
            onClick={() => handleTabChange('privacy')}
          >
            Privacy Notice
          </button>
        </div>

        <div className="legal-page-container">
          <LegalDocViewer docType={docType} />
>>>>>>> paulaver2+missingfeatures
        </div>
      </div>
    </div>
  );
}

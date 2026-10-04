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
    <div className={`legal-page ${isDarkMode ? 'legal-dark' : ''}`}>
      <nav className="legal-navbar">
        <div className="legal-nav-content">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="legal-brand">
            <img src="/raketbase-icon.svg" alt="RaketBase Logo" />
            <div className="legal-brand-text">
              <span className="legal-brand-bold">RAKET</span>
              <span className="legal-brand-light">BASE</span>
            </div>
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
        </div>
      </div>
    </div>
  );
}

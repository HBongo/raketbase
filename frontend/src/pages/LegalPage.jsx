import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LegalDocViewer from '../components/LegalDocViewer';

export default function LegalPage({ defaultDoc = 'terms' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem('token');
  const backLink = isLoggedIn ? '/dashboard' : '/register';
  const backText = isLoggedIn ? 'Back to RaketBase' : 'Back to Register';
  // Logged-in users usually arrive from the footer, so take them back to the page they were on
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
          </Link>
          <div className="d-flex align-items-center gap-2">
            <Link to={backLink} onClick={goBack} className="btn btn-outline-secondary btn-sm">
              &larr; {backText}
            </Link>
          </div>
        </div>
      </nav>

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
        </div>
      </div>
    </div>
  );
}

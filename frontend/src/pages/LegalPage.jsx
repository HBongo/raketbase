import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LegalDocViewer from '../components/LegalDocViewer';

export default function LegalPage({ defaultDoc = 'terms' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem('token');
  const backLink = isLoggedIn ? '/dashboard' : '/register';
  const backText = isLoggedIn ? 'Back to Dashboard' : 'Back to Register';

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
    <div className="min-vh-100 bg-light">
      {/* Basic Navbar */}
      <nav className="navbar navbar-light bg-white border-bottom py-2">
        <div className="container-lg d-flex align-items-center justify-content-between">
          <Link to="/" className="navbar-brand text-dark fw-bold mb-0">
            RaketBase
          </Link>
          <div className="d-flex align-items-center gap-2">
            <Link to="/register" className="btn btn-outline-secondary btn-sm">
              &larr; Back to Register
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
                className={`btn btn-sm ${docType === 'terms' ? 'btn-dark' : 'btn-light border'}`}
                onClick={() => handleTabChange('terms')}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className={`btn btn-sm ${docType === 'privacy' ? 'btn-dark' : 'btn-light border'}`}
                onClick={() => handleTabChange('privacy')}
              >
                Privacy Notice
              </button>
            </div>

            {/* Document Content */}
            <div className="card border bg-white p-4 p-md-5">
              <LegalDocViewer docType={docType} />
            </div>

            <div className="text-center mt-3">
              <Link to="/register" className="text-muted small">
                Back to Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

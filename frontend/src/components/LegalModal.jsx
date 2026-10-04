import React, { useState, useEffect } from 'react';
import LegalDocViewer from './LegalDocViewer';
import '../styles/legal.css';

<<<<<<< HEAD
export default function LegalModal({ isOpen, onClose, initialDoc = 'terms', defaultTab }) {
  const startingDoc = defaultTab || initialDoc || 'terms';
  const [activeDoc, setActiveDoc] = useState(startingDoc);
=======
export default function LegalModal({ isOpen, onClose, initialDoc = 'terms', isDarkMode = false }) {
  const [activeDoc, setActiveDoc] = useState(initialDoc);
>>>>>>> paulaver2+missingfeatures

  useEffect(() => {
    const nextDoc = defaultTab || initialDoc || 'terms';
    setActiveDoc(nextDoc);
  }, [initialDoc, defaultTab]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`legal-modal-overlay ${isDarkMode ? 'legal-dark' : ''}`} 
      role="dialog" 
      aria-modal="true" 
<<<<<<< HEAD
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1055 }}
=======
>>>>>>> paulaver2+missingfeatures
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
<<<<<<< HEAD
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div className="modal-content legal-modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          
          {/* Header with Styled Tabs */}
          <div className="modal-header d-flex justify-content-between align-items-center py-2.5 px-3.5 border-bottom">
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 fw-medium ${activeDoc === 'terms' ? 'btn-dark legal-tab-btn-active' : 'btn-light border legal-tab-btn-inactive'}`}
                onClick={() => setActiveDoc('terms')}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-pill px-3 fw-medium ${activeDoc === 'privacy' ? 'btn-dark legal-tab-btn-active' : 'btn-light border legal-tab-btn-inactive'}`}
                onClick={() => setActiveDoc('privacy')}
              >
                Privacy Notice
              </button>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              aria-label="Close" 
              onClick={onClose}
            ></button>
          </div>

          {/* Clean Scrollable Body */}
          <div className="modal-body p-4 p-md-4.5">
            <LegalDocViewer docType={activeDoc} />
          </div>

          {/* Simple Standard Footer */}
          <div className="modal-footer py-2.5 px-3.5 border-top">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm rounded-pill px-4" 
              onClick={onClose}
=======
      <div className="legal-modal-dialog">
        <div className="legal-modal-header" style={{ position: 'relative', justifyContent: 'center' }}>
          <div className="legal-tabs">
            <button
              type="button"
              className={`legal-tab ${activeDoc === 'terms' ? 'legal-tab--active' : ''}`}
              onClick={() => setActiveDoc('terms')}
>>>>>>> paulaver2+missingfeatures
            >
              Terms of Service
            </button>
            <button
              type="button"
              className={`legal-tab ${activeDoc === 'privacy' ? 'legal-tab--active' : ''}`}
              onClick={() => setActiveDoc('privacy')}
            >
              Privacy Notice
            </button>
          </div>
          <button 
            type="button" 
            className="legal-close-btn" 
            aria-label="Close" 
            onClick={onClose}
            style={{ position: 'absolute', right: '2rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="legal-modal-body">
          <LegalDocViewer docType={activeDoc} />
        </div>

      </div>
    </div>
  );
}

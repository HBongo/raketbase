import React, { useState, useEffect } from 'react';
import LegalDocViewer from './LegalDocViewer';
import '../styles/legal.css';

export default function LegalModal({ isOpen, onClose, initialDoc = 'terms', isDarkMode = false }) {
  const [activeDoc, setActiveDoc] = useState(initialDoc);

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc]);

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="legal-modal-dialog">
        <div className="legal-modal-header" style={{ position: 'relative', justifyContent: 'center' }}>
          <div className="legal-tabs">
            <button
              type="button"
              className={`legal-tab ${activeDoc === 'terms' ? 'legal-tab--active' : ''}`}
              onClick={() => setActiveDoc('terms')}
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

import React, { useState, useEffect } from 'react';
import LegalDocViewer from './LegalDocViewer';

export default function LegalModal({ isOpen, onClose, initialDoc = 'terms' }) {
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
      className="modal fade show d-block" 
      tabIndex="-1" 
      role="dialog" 
      aria-modal="true" 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1055 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div className="modal-content">
          
          {/* Simple Standard Header with Clean Tabs */}
          <div className="modal-header d-flex justify-content-between align-items-center py-2 px-3">
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm ${activeDoc === 'terms' ? 'btn-dark' : 'btn-light border'}`}
                onClick={() => setActiveDoc('terms')}
              >
                Terms of Service
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeDoc === 'privacy' ? 'btn-dark' : 'btn-light border'}`}
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
          <div className="modal-body p-4">
            <LegalDocViewer docType={activeDoc} />
          </div>

          {/* Simple Standard Footer */}
          <div className="modal-footer py-2 px-3">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

import { useToast, dismissToast } from '../utils/toast';

export default function Toaster() {
  const toast = useToast();
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '400px',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="card shadow-lg border-0 rounded-pill px-3 py-2 bg-dark text-white d-flex flex-row align-items-center gap-2"
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          border: toast.type === 'error' ? '1px solid rgba(229, 72, 77, 0.85)' : '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {toast.loading ? (
          <span
            className="spinner-border spinner-border-sm flex-shrink-0"
            role="status"
            aria-hidden="true"
            style={{ width: '1rem', height: '1rem', color: '#FF5A1E', borderWidth: '2px' }}
          />
        ) : toast.type === 'error' ? (
          <i className="bi bi-exclamation-octagon-fill text-danger flex-shrink-0" style={{ fontSize: '1rem' }} />
        ) : toast.type === 'info' ? (
          <i className="bi bi-info-circle-fill text-info flex-shrink-0" style={{ fontSize: '1rem' }} />
        ) : (
          <i className="bi bi-check-circle-fill text-success flex-shrink-0" style={{ fontSize: '1rem' }} />
        )}
        <span className="small fw-semibold text-truncate" style={{ maxWidth: '280px' }}>
          {toast.message}
        </span>
        {!toast.loading && (
          <button
            type="button"
            onClick={dismissToast}
            className="btn-close btn-close-white ms-1"
            style={{ fontSize: '0.65rem' }}
            aria-label="Dismiss toast"
          />
        )}
      </div>
    </div>
  );
}

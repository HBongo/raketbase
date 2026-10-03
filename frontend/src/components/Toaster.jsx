import { useToast, dismissToast } from '../utils/toast';

export default function Toaster() {
  const toast = useToast();
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
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
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {toast.loading ? (
          <span
            className="spinner-border spinner-border-sm flex-shrink-0"
            role="status"
            aria-hidden="true"
            style={{ width: '1rem', height: '1rem', color: '#FF5A1E', borderWidth: '2px' }}
          />
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

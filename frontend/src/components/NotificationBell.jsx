import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

// Checks for new notifications this often, plus whenever the page changes.
const POLL_INTERVAL_MS = 30000;

const ROLE_TAGS = {
  customer: { label: 'Client', className: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle' },
  freelancer: { label: 'Freelancer', className: 'bg-success-subtle text-success-emphasis border border-success-subtle' },
};

export default function NotificationBell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!localStorage.getItem('token') || document.hidden) return;
    try {
      const res = await getNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unread_count || 0);
    } catch {
      // Quietly keep the last known list; the next check will try again.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close when clicking anywhere outside the bell and its menu
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleOpenNotification(n) {
    setOpen(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => (x.notification_id === n.notification_id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n.notification_id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  }

  return (
    <div className="position-relative" ref={wrapperRef}>
      <button
        type="button"
        className="navbar-action-btn d-flex align-items-center justify-content-center"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
      >
        <i className={unreadCount > 0 ? 'bi bi-bell-fill' : 'bi bi-bell'}></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute badge rounded-pill bg-danger"
            style={{ top: '-6px', right: '-6px', fontSize: '0.65rem', minWidth: '18px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="dropdown-menu dropdown-menu-profile show"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            width: 'min(360px, calc(100vw - 32px))',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <span className="fw-bold small">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none small" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="text-center text-muted small py-4 px-3">
                <i className="bi bi-bell-slash d-block fs-4 mb-2"></i>
                You're all caught up.
              </div>
            ) : (
              notifications.map((n) => {
                const tag = ROLE_TAGS[n.role];
                return (
                  <button
                    key={n.notification_id}
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className="dropdown-item d-block text-start px-3 py-2 border-bottom"
                    style={{ whiteSpace: 'normal', backgroundColor: n.is_read ? undefined : 'rgba(255,90,30,0.06)' }}
                  >
                    <div className="d-flex align-items-start gap-2">
                      <span
                        className="rounded-circle flex-shrink-0 mt-2"
                        style={{ width: '8px', height: '8px', backgroundColor: n.is_read ? 'transparent' : '#FF5A1E' }}
                      ></span>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className={`small ${n.is_read ? '' : 'fw-semibold'}`} style={{ lineHeight: 1.35 }}>{n.title}</div>
                        {n.body && (
                          <div className="text-muted mt-1" style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>{n.body}</div>
                        )}
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {tag && (
                            <span className={`badge rounded-pill fw-medium ${tag.className}`} style={{ fontSize: '0.65rem' }}>
                              {tag.label}
                            </span>
                          )}
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>{timeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

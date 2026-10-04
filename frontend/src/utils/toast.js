// Tiny global toast store. Call showToast('message', { loading: true }) from anywhere;
// <Toaster /> (mounted once in App) renders it at bottom-right.
import { useSyncExternalStore } from 'react';

let toast = null;
let timer = null;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export function dismissToast() {
  clearTimeout(timer);
  toast = null;
  emit();
}

/**
 * Show a floating toast notification.
 * @param {string} message
 * @param {number|{ duration?: number, loading?: boolean, type?: 'success'|'error'|'info'|'notice', link?: string }} [options=4000]
 *   type defaults to 'success'. Errors stay 6 seconds unless a duration is given.
 *   'notice' is a live notification (bell icon); with a link, clicking the toast opens it.
 */
export function showToast(message, options = 4000) {
  clearTimeout(timer);
  const opts = typeof options === 'object' && options !== null ? options : {};
  const type = ['success', 'error', 'info', 'notice'].includes(opts.type) ? opts.type : 'success';
  const defaultDuration = type === 'error' || type === 'notice' ? 6000 : 4000;
  const duration = typeof options === 'number' ? options : (opts.duration !== undefined ? opts.duration : defaultDuration);
  const loading = !!opts.loading;
  toast = { id: Date.now(), message, duration, loading, type, link: opts.link || null };
  emit();
  if (duration > 0 && !loading) {
    timer = setTimeout(dismissToast, duration);
  }
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToast() {
  return useSyncExternalStore(subscribe, () => toast, () => null);
}

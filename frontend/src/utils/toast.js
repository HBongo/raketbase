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
 * @param {number|{ duration?: number, loading?: boolean }} [options=4000]
 */
export function showToast(message, options = 4000) {
  clearTimeout(timer);
  const duration = typeof options === 'number' ? options : (options?.duration !== undefined ? options.duration : 4000);
  const loading = typeof options === 'object' && options !== null ? !!options.loading : false;
  toast = { id: Date.now(), message, duration, loading };
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

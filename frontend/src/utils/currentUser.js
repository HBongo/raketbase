// Reactive access to the logged-in user (stored in localStorage as 'user').
// Any component using useCurrentUser() re-renders the moment setCurrentUser()
// is called (or the user changes in another tab), so mode switches apply live.
import { useSyncExternalStore } from 'react';

const USER_EVENT = 'raketbase:user-changed';

let cachedRaw = null;
let cachedUser = {};

// Returns a referentially stable object until the stored JSON actually changes.
function getSnapshot() {
  const raw = localStorage.getItem('user') || '{}';
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = JSON.parse(raw);
      if (cachedUser && cachedUser.user_id && !cachedUser.id) {
        cachedUser.id = cachedUser.user_id;
      }
    } catch {
      cachedUser = {};
    }
  }
  return cachedUser;
}

function subscribe(callback) {
  window.addEventListener(USER_EVENT, callback);
  window.addEventListener('storage', callback); // other tabs
  return () => {
    window.removeEventListener(USER_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

const EMPTY_USER = {};

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_USER);
}

export function setCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
  window.dispatchEvent(new Event(USER_EVENT));
}

// Lets route guards know a redirect was caused by the user deliberately
// switching modes (so the guard doesn't also show its own "not allowed" toast).
let lastModeSwitchAt = 0;
export function markModeSwitch() {
  lastModeSwitchAt = Date.now();
}
export function wasJustSwitched() {
  return Date.now() - lastModeSwitchAt < 2000;
}

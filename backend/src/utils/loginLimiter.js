// Limits on login and password-reset attempts, kept in server memory.
// They reset when the server restarts, which is fine for slowing down password guessing.

const WINDOW_MS = 15 * 60 * 1000;

// 5 wrong passwords for one email -> that email is locked for 15 minutes
const MAX_FAILS_PER_EMAIL = 5;
// 20 wrong passwords from one IP (any emails) -> that IP is locked for 15 minutes
const MAX_FAILS_PER_IP = 20;
// Forgot-password: 3 reset emails per address per hour
const MAX_RESETS_PER_EMAIL = 3;
const RESET_WINDOW_MS = 60 * 60 * 1000;

const failsByEmail = new Map(); // email -> { count, firstAt, lockedUntil }
const failsByIp = new Map();
const resetsByEmail = new Map(); // email -> [timestamps]

function normalize(email) {
  return String(email || '').trim().toLowerCase();
}

function minutesLeft(until) {
  return Math.max(1, Math.ceil((until - Date.now()) / 60000));
}

function check(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) return entry.lockedUntil;
  if (Date.now() - entry.firstAt > WINDOW_MS) map.delete(key);
  return null;
}

function bump(map, key, max) {
  const now = Date.now();
  let entry = map.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) entry = { count: 0, firstAt: now, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= max) entry.lockedUntil = now + WINDOW_MS;
  map.set(key, entry);
  return entry;
}

// Before checking the password: returns a message if this email or IP is locked out.
function loginBlocked(email, ip) {
  const until = check(failsByEmail, normalize(email)) || check(failsByIp, ip);
  if (!until) return null;
  const mins = minutesLeft(until);
  return `Too many failed log-in attempts. Please try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.`;
}

// After a wrong password: returns { locked, remaining } for the email.
function recordLoginFailure(email, ip) {
  const entry = bump(failsByEmail, normalize(email), MAX_FAILS_PER_EMAIL);
  bump(failsByIp, ip, MAX_FAILS_PER_IP);
  return { locked: Boolean(entry.lockedUntil), remaining: Math.max(0, MAX_FAILS_PER_EMAIL - entry.count) };
}

// After a successful login the email's count starts over.
function clearLoginFailures(email) {
  failsByEmail.delete(normalize(email));
}

// Forgot-password: true if another reset email may be sent to this address right now.
function allowPasswordReset(email) {
  const key = normalize(email);
  const now = Date.now();
  const recent = (resetsByEmail.get(key) || []).filter((t) => now - t < RESET_WINDOW_MS);
  if (recent.length >= MAX_RESETS_PER_EMAIL) {
    resetsByEmail.set(key, recent);
    return false;
  }
  recent.push(now);
  resetsByEmail.set(key, recent);
  return true;
}

module.exports = { loginBlocked, recordLoginFailure, clearLoginFailures, allowPasswordReset, MAX_FAILS_PER_EMAIL };

// rateLimiter.js — Sliding window in-memory rate limiter for auth routes
const attempts = new Map();

function createRateLimiter({
  windowMs = 5 * 60 * 1000, // 5 minutes
  max = 10,                 // 10 attempts
  message = 'Too many attempts from this IP. Please try again after a few minutes.',
} = {}) {
  // Periodically purge expired timestamps to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of attempts.entries()) {
      const valid = timestamps.filter((t) => now - t < windowMs);
      if (valid.length === 0) {
        attempts.delete(key);
      } else {
        attempts.set(key, valid);
      }
    }
  }, windowMs);
  cleanupTimer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = (attempts.get(ip) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        status: 429,
        success: false,
        message,
        retryAfter: retryAfterSec,
      });
    }

    timestamps.push(now);
    attempts.set(ip, timestamps);
    next();
  };
}

module.exports = { createRateLimiter };

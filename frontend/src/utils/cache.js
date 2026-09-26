// In-memory client-side cache for instant navigation without repetitive loading states
const memoryCache = new Map();

/**
 * Retrieve cached data by key if still fresh
 * @param {string} key - Cache identifier
 * @param {number} maxAgeMs - Time to live in ms (default: 5 minutes)
 * @returns {any|null}
 */
export function getCached(key, maxAgeMs = 5 * 60 * 1000) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > maxAgeMs) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

/**
 * Store data in the memory cache
 * @param {string} key - Cache identifier
 * @param {any} data - Data to store
 */
export function setCached(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidate a specific key or all keys
 * @param {string} [key] - If omitted, clears all cached entries
 */
export function clearCached(key) {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}

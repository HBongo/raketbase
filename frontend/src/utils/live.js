// Live updates from the server (Server-Sent Events over one long-lived request).
// The server only sends small signals like { topics: ['contracts'] }; pages that care
// refetch their own data through the normal API.
//
// fetch() is used instead of EventSource so the login token goes in the Authorization
// header (EventSource can't send headers, and tokens don't belong in URLs).
import { API_BASE, getProfile } from '../services/api';

const listeners = new Set(); // { topics: Set|null, handler }
let controller = null;
let running = false;
// Each start gets its own number, so an older loop that's still winding down can't affect a newer one
let generation = 0;
let retryDelay = 2000;
const MAX_RETRY_DELAY = 30000;

function dispatch(event) {
  const topics = event.topics || [];
  for (const l of listeners) {
    if (!l.topics || topics.some((t) => l.topics.has(t))) {
      try { l.handler(event); } catch (err) { console.error('Live update handler failed:', err); }
    }
  }
}

// Parse "event: update\ndata: {...}\n\n" blocks out of the stream
function parseBlocks(buffer, onEvent) {
  let index;
  while ((index = buffer.indexOf('\n\n')) !== -1) {
    const block = buffer.slice(0, index);
    buffer = buffer.slice(index + 2);
    const data = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (data) {
      try { onEvent(JSON.parse(data)); } catch { /* ignore malformed */ }
    }
  }
  return buffer;
}

async function connectOnce() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  controller = new AbortController();
  const res = await fetch(`${API_BASE}/events`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    signal: controller.signal,
  });

  if (res.status === 401 || res.status === 403) {
    // Expired token: any normal API call refreshes it (or logs out if the account is
    // suspended / deleted), then the next attempt uses the new one
    await getProfile().catch(() => {});
    return true;
  }
  if (!res.ok || !res.body) return true;

  retryDelay = 2000;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer = parseBlocks(buffer + decoder.decode(value, { stream: true }), dispatch);
  }
  return true;
}

async function loop(gen) {
  const active = () => running && gen === generation;
  while (active()) {
    try {
      const keepGoing = await connectOnce();
      if (!keepGoing) break;
    } catch (err) {
      if (err?.name === 'AbortError') break;
    }
    if (!active()) break;
    // The stream ended or failed: wait a bit, then reconnect (slower each time, up to 30s)
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
  }
}

// Called once by the logged-in layout
export function startLive() {
  if (running) return;
  running = true;
  generation += 1;
  retryDelay = 2000;
  loop(generation);
}

export function stopLive() {
  running = false;
  generation += 1;
  controller?.abort();
  controller = null;
}

// topics: array of topic names, or null for every event. Returns an unsubscribe function.
export function subscribeLive(topics, handler) {
  const entry = { topics: topics ? new Set(topics) : null, handler };
  listeners.add(entry);
  return () => listeners.delete(entry);
}

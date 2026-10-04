// Live updates with Server-Sent Events. Each logged-in browser tab keeps one open
// GET /api/v1/events connection; when something changes, the server sends a small signal
// ("topics X and Y changed") and the page refetches through the normal API, so every
// permission check stays where it is. Signals never carry private data beyond what the
// recipient's own notification already says.
//
// Connections live in this server's memory, which is fine for a single backend process.

const HEARTBEAT_MS = 25000;

const clientsByUser = new Map(); // user_id -> Set<res>
const adminUsers = new Set(); // user_ids of connected admins/staff

function send(res, event) {
  try {
    res.write(`event: update\ndata: ${JSON.stringify(event)}\n\n`);
  } catch {
    // connection already closed; it's removed by its 'close' handler
  }
}

// Express handler for GET /api/v1/events (after requireAuth)
function openStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  send(res, { topics: ['connected'] });

  const userId = req.user.id;
  if (!clientsByUser.has(userId)) clientsByUser.set(userId, new Set());
  clientsByUser.get(userId).add(res);
  if (req.user.role === 'admin' || req.user.role === 'staff') adminUsers.add(userId);

  // Comments keep proxies and the browser from closing an idle connection
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* closed */ }
  }, HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    const set = clientsByUser.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        clientsByUser.delete(userId);
        adminUsers.delete(userId);
      }
    }
  });
}

// event: { topics: ['contracts', ...], notification?: { title, body, link, type } }
function publishToUsers(userIds, event) {
  for (const id of new Set((userIds || []).filter(Boolean))) {
    for (const res of clientsByUser.get(id) || []) send(res, event);
  }
}

function publishToAll(event) {
  for (const set of clientsByUser.values()) for (const res of set) send(res, event);
}

function publishToAdmins(event) {
  publishToUsers([...adminUsers], event);
}

// A job changed in a way other people can see (Explore, job pages)
function jobChanged(jobId, change) {
  publishToAll({ topics: ['jobs'], job_id: jobId, change });
}

// Which parts of the site a notification affects, so the recipient's open pages refresh
const TOPICS_BY_NOTIFICATION = {
  proposal_received: ['proposals'],
  proposal_accepted: ['proposals', 'contracts', 'conversations'],
  proposal_rejected: ['proposals'],
  offer_received: ['offers'],
  offer_accepted: ['offers', 'contracts', 'conversations'],
  offer_declined: ['offers'],
  offer_withdrawn: ['offers'],
  work_submitted: ['contracts'],
  milestone_submitted: ['contracts'],
  payment_released: ['contracts'],
  dispute_filed: ['contracts'],
  dispute_resolved: ['contracts'],
  review_received: ['contracts', 'reviews'],
  job_cancelled: ['proposals'],
  job_removed: ['proposals', 'jobs'],
  message: ['conversations'],
};

function topicsForNotification(type) {
  return ['notifications', ...(TOPICS_BY_NOTIFICATION[type] || ['contracts', 'proposals', 'offers'])];
}

module.exports = { openStream, publishToUsers, publishToAll, publishToAdmins, jobChanged, topicsForNotification };

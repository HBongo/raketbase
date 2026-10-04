const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

const LOGS_FILE = path.join(__dirname, '../../data/activity_logs.json');

function ensureDataDir() {
  const dir = path.dirname(LOGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([]), 'utf8');
  }
}

async function logActivity({ userId, action, details = {}, ip = null }) {
  if (!userId) return;
  const logEntry = {
    log_id: crypto.randomUUID(),
    user_id: userId,
    action,
    details,
    ip_address: ip,
    created_at: new Date().toISOString(),
  };

  // 1. Try Supabase table
  try {
    const { error } = await supabaseAdmin.from('activity_logs').insert([logEntry]);
    if (!error) return logEntry;
  } catch {
    // If table doesn't exist yet, fallback gracefully
  }

  // 2. Fallback to local data file
  try {
    ensureDataDir();
    const raw = fs.readFileSync(LOGS_FILE, 'utf8');
    const logs = JSON.parse(raw || '[]');
    logs.unshift(logEntry);
    if (logs.length > 2000) logs.length = 2000;
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (fileErr) {
    console.warn('Could not write to local activity_logs.json:', fileErr.message);
  }

  return logEntry;
}

async function getUserActivityLogs(userId, limit = 50) {
  let dbLogs = [];
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && Array.isArray(data)) {
      dbLogs = data;
    }
  } catch {}

  let fileLogs = [];
  try {
    ensureDataDir();
    const raw = fs.readFileSync(LOGS_FILE, 'utf8');
    const all = JSON.parse(raw || '[]');
    fileLogs = all.filter((l) => l.user_id === userId);
  } catch {}

  // Synthesize events from real DB tables so activity log is immediately rich and historical
  const synthesized = [];
  try {
    // Proposals
    const { data: proposals } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id, bid_amount, status, submitted_at, jobs(title)')
      .eq('freelancer_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(20);
    (proposals || []).forEach((p) => {
      synthesized.push({
        log_id: `prop-${p.proposal_id}`,
        user_id: userId,
        action: 'SUBMIT_PROPOSAL',
        details: {
          job_title: p.jobs?.title || 'Job Posting',
          bid_amount: p.bid_amount,
          status: p.status,
        },
        created_at: p.submitted_at,
      });
    });

    // Jobs posted
    const { data: jobs } = await supabaseAdmin
      .from('jobs')
      .select('job_id, title, budget, status, created_at')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    (jobs || []).forEach((j) => {
      synthesized.push({
        log_id: `job-${j.job_id}`,
        user_id: userId,
        action: 'CREATE_JOB',
        details: {
          title: j.title,
          budget: j.budget,
          status: j.status,
        },
        created_at: j.created_at,
      });
    });

    // Contracts
    const { data: contracts } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, agreed_amount, status, created_at, jobs(title)')
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);
    (contracts || []).forEach((c) => {
      synthesized.push({
        log_id: `contract-${c.contract_id}`,
        user_id: userId,
        action: 'CONTRACT_ACTIVE',
        details: {
          job_title: c.jobs?.title || 'Contract',
          agreed_amount: c.agreed_amount,
          status: c.status,
        },
        created_at: c.created_at,
      });
    });
  } catch {}

  const combined = [...dbLogs, ...fileLogs, ...synthesized];
  const seen = new Set();
  const unique = [];
  for (const item of combined) {
    if (!seen.has(item.log_id)) {
      seen.add(item.log_id);
      unique.push(item);
    }
  }

  unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return unique.slice(0, limit);
}

module.exports = {
  logActivity,
  getUserActivityLogs,
};

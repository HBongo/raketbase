const { supabaseAdmin } = require('../config/supabase');

const CATEGORIES = ['account', 'jobs', 'contracts', 'admin'];

// Best-effort: records one or more entries in the activity log. Like notify(), a failure
// here must never fail the action that triggered it, so errors are logged and swallowed
// (this also keeps everything working before migration 010 has been run).
// Each entry: { user_id, category, action, description, target_type?, target_id?, link?, metadata? }
async function logActivity(entries) {
  const rows = (Array.isArray(entries) ? entries : [entries])
    .filter((e) => e && e.action && e.description && CATEGORIES.includes(e.category))
    .map((e) => ({
      user_id: e.user_id || null,
      category: e.category,
      action: e.action,
      description: e.description,
      target_type: e.target_type || null,
      target_id: e.target_id != null ? String(e.target_id) : null,
      link: e.link || null,
      metadata: e.metadata || null,
    }));

  if (rows.length === 0) return;

  try {
    const { error } = await supabaseAdmin.from('activity_log').insert(rows);
    if (error) throw error;
  } catch (err) {
    console.error('Failed to write activity log:', err.message);
  }
}

module.exports = { logActivity, ACTIVITY_CATEGORIES: CATEGORIES };

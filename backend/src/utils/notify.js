const { supabaseAdmin } = require('../config/supabase');

// Best-effort: creates one or more notifications for the bell in the top bar.
// A failure here must never fail the action that triggered it, so errors are
// logged and swallowed.
// Each item: { user_id, type, role ('customer' | 'freelancer'), title, body?, link? }
async function notify(items) {
  const rows = (Array.isArray(items) ? items : [items])
    .filter((n) => n && n.user_id && n.title)
    .map((n) => ({
      user_id: n.user_id,
      type: n.type,
      role: n.role || null,
      title: n.title,
      body: n.body || null,
      link: n.link || null,
    }));

  if (rows.length === 0) return;

  try {
    const { error } = await supabaseAdmin.from('notifications').insert(rows);
    if (error) throw error;
  } catch (err) {
    console.error('Failed to create notifications:', err.message);
  }
}

// "Juan Dela Cruz", falling back to a generic label.
function displayName(user, fallback = 'Someone') {
  const name = [user?.first_name || user?.firstName, user?.last_name || user?.lastName].filter(Boolean).join(' ');
  return name || fallback;
}

module.exports = { notify, displayName };

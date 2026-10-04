const { supabaseAdmin } = require('../config/supabase');
const { ACTIVITY_CATEGORIES } = require('../utils/activity');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function pageParams(query) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const offset = Math.max(0, parseInt(query.offset, 10) || 0);
  return { limit, offset };
}

function migrationHint(res) {
  return res.status(500).json({
    success: false,
    error: 'Could not load the activity log. Make sure migration 010 has been run.',
  });
}

// GET /api/v1/activity/me?category=&limit=&offset= - Your own activity, newest first
exports.listMyActivity = async (req, res) => {
  try {
    const { limit, offset } = pageParams(req.query);
    let query = supabaseAdmin
      .from('activity_log')
      .select('activity_id, category, action, description, link, created_at', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ACTIVITY_CATEGORIES.includes(req.query.category)) query = query.eq('category', req.query.category);

    const { data, count, error } = await query;
    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: { items: data || [], total: count || 0, has_more: offset + (data || []).length < (count || 0) },
    });
  } catch (err) {
    console.error('listMyActivity error:', err.message);
    return migrationHint(res);
  }
};

// GET /api/v1/admin/activity?user_id=&category=&q=&from=&to=&limit=&offset= - Everyone's activity
// q searches the description (and the person's name/email); from/to are dates (YYYY-MM-DD).
exports.listAllActivity = async (req, res) => {
  try {
    const { limit, offset } = pageParams(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

    let query = supabaseAdmin
      .from('activity_log')
      .select('activity_id, user_id, category, action, description, link, metadata, created_at, users(first_name, last_name, email, role)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ACTIVITY_CATEGORIES.includes(req.query.category)) query = query.eq('category', req.query.category);
    if (req.query.user_id) query = query.eq('user_id', req.query.user_id);
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '')) query = query.gte('created_at', `${req.query.from}T00:00:00`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '')) query = query.lte('created_at', `${req.query.to}T23:59:59.999`);

    if (q) {
      // Match the description, or anyone whose name/email matches
      const pattern = `%${q.replace(/[%_,()]/g, ' ')}%`;
      const { data: people } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(50);
      const ids = (people || []).map((p) => p.user_id);
      query = ids.length
        ? query.or(`description.ilike.${pattern},user_id.in.(${ids.join(',')})`)
        : query.ilike('description', pattern);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const items = (data || []).map(({ users, ...row }) => ({
      ...row,
      user: users
        ? {
            name: [users.first_name, users.last_name].filter(Boolean).join(' ') || users.email,
            email: users.email,
            role: users.role,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: { items, total: count || 0, has_more: offset + items.length < (count || 0) },
    });
  } catch (err) {
    console.error('listAllActivity error:', err.message);
    return migrationHint(res);
  }
};

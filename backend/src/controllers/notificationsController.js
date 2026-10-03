const { supabaseAdmin } = require('../config/supabase');

// GET /api/v1/notifications - The logged-in user's latest notifications plus unread count
exports.listNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [listRes, unreadRes] = await Promise.all([
      supabaseAdmin
        .from('notifications')
        .select('notification_id, type, role, title, body, link, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('notifications')
        .select('notification_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false),
    ]);

    if (listRes.error) throw listRes.error;
    if (unreadRes.error) throw unreadRes.error;

    return res.status(200).json({
      success: true,
      data: { notifications: listRes.data || [], unread_count: unreadRes.count || 0 },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/notifications/:id/read - Mark one of your own notifications as read
exports.markRead = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', req.params.id)
      .eq('user_id', req.user.id)
      .select('notification_id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/notifications/read-all - Mark all of your notifications as read
exports.markAllRead = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

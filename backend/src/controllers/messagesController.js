const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { notify, displayName } = require('../utils/notify');
const { logActivity } = require('../utils/activity');
const { publishToUsers } = require('../utils/live');

// The other person in a chat
function otherParticipant(user, conversation) {
  return user.id === conversation.client_id ? conversation.freelancer_id : conversation.client_id;
}

const PROFILE_CHAT_TITLE = 'Direct message';
const MESSAGE_MAX = 2000;

// Files live at <bucket>/<conversation_id>/<uuid>-<original filename>
// (bucket created by database/schema.sql).
const CHAT_BUCKET = 'chat-attachments';

// '*' so newer columns (is_admin_chat, last-read times) come along once their migrations run
const CONVERSATION_SELECT = `
  *,
  contracts(status, submitted_at, created_at)
`;

function isStaffOrAdmin(user) {
  return user.role === 'staff' || user.role === 'admin';
}

function isParticipant(user, conversation) {
  return user.id === conversation.client_id || user.id === conversation.freelancer_id;
}

// Who may read a chat: the two people in it, or staff/admins for support. Admin team chats
// (migration 016) stay private to the two admins in them.
function canView(user, conversation) {
  if (isParticipant(user, conversation)) return true;
  return isStaffOrAdmin(user) && !conversation.is_admin_chat;
}

// ---- Unread tracking (migration 015) ----
// Each side's last_read_at on the conversation. Messages from the other person (including
// system messages their actions posted) newer than that are unread. Before the migration
// the columns don't exist, so nothing counts as unread.
function myLastReadColumn(user, conversation) {
  if (user.id === conversation.client_id) return 'client_last_read_at';
  if (user.id === conversation.freelancer_id) return 'freelancer_last_read_at';
  return null;
}

// { [conversation_id]: number of unread messages } for the chats this user is in
async function unreadCounts(user, conversationIds) {
  if (!conversationIds.length) return {};
  const { data: rows, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .in('conversation_id', conversationIds);
  if (error || !rows) return {};

  const readSince = {};
  for (const c of rows) {
    const column = myLastReadColumn(user, c);
    if (column && column in c) readSince[c.conversation_id] = c[column];
  }
  const tracked = Object.keys(readSince);
  if (!tracked.length) return {};

  const { data: messages } = await supabaseAdmin
    .from('messages')
    .select('conversation_id, created_at')
    .in('conversation_id', tracked)
    .neq('sender_id', user.id);

  const counts = {};
  for (const m of messages || []) {
    const since = readSince[m.conversation_id];
    if (!since || new Date(m.created_at) > new Date(since)) {
      counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
    }
  }
  return counts;
}

// Marks the chat as read for this user; their other tabs (and the sidebar) update live
async function markRead(user, conversation) {
  const column = myLastReadColumn(user, conversation);
  if (!column) return;
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ [column]: new Date().toISOString() })
    .eq('conversation_id', conversation.conversation_id);
  if (!error) publishToUsers([user.id], { topics: ['conversations'], conversation_id: conversation.conversation_id });
}

async function loadConversation(conversation_id) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('conversation_id', conversation_id)
    .single();
  if (error || !data) return null;
  return data;
}

// GET /api/v1/conversations - list conversations for the logged-in user
// (both sides of a contract get one; staff/admin see every conversation, read-only,
// for dispute support).
exports.listConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    let query = supabaseAdmin
      .from('conversations')
      .select(`
        ${CONVERSATION_SELECT},
        client:users!conversations_client_id_fkey(user_id, first_name, last_name, email, client_avatar_url, avatar_url),
        freelancer:users!conversations_freelancer_id_fkey(user_id, first_name, last_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (!isStaffOrAdmin(req.user)) {
      query = query.or(`client_id.eq.${userId},freelancer_id.eq.${userId}`);
    }

    const { data: allConversations, error } = await query;
    if (error) throw error;
    // Other admins' private team chats are never listed
    const conversations = (allConversations || []).filter((c) => canView(req.user, c));

    // One extra query to grab each conversation's latest message for the sidebar preview.
    const ids = (conversations || []).map((c) => c.conversation_id);
    const lastByConversation = {};
    if (ids.length > 0) {
      const { data: recentMessages } = await supabaseAdmin
        .from('messages')
        .select('conversation_id, content, file_name, sender_id, created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: false });
      (recentMessages || []).forEach((m) => {
        if (!lastByConversation[m.conversation_id]) lastByConversation[m.conversation_id] = m;
      });
    }

    const unread = await unreadCounts(req.user, ids);

    // In a chat the client appears with their client photo (or their only photo if they haven't set one)
    const enriched = (conversations || []).map((c) => ({
      ...c,
      client: c.client && { ...c.client, avatar_url: c.client.client_avatar_url || c.client.avatar_url || null },
      last_message: lastByConversation[c.conversation_id] || null,
      unread_count: unread[c.conversation_id] || 0,
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/conversations/unread-count - How many chats have something new (sidebar bubble)
exports.unreadChatCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: mine, error } = await supabaseAdmin
      .from('conversations')
      .select('conversation_id')
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`);
    if (error) throw error;
    const counts = await unreadCounts(req.user, (mine || []).map((c) => c.conversation_id));
    return res.status(200).json({ success: true, data: { chats: Object.keys(counts).length } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/:id/read - Mark a chat read (e.g. a message arrived while it was open)
exports.markConversationRead = async (req, res) => {
  try {
    const conversation = await loadConversation(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!isParticipant(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }
    await markRead(req.user, conversation);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/conversations/:id
exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!canView(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }
    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/conversations/:id/messages
exports.listMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!canView(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        message_id, conversation_id, sender_id, content, message_type, file_name, file_size, file_mime_type, file_path, created_at
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Opening a chat reads it (only for the two people in it, not staff reading along)
    if (isParticipant(req.user, conversation)) await markRead(req.user, conversation);

    // Attach signed preview URLs for all messages with attachments
    const filesToSign = (messages || []).filter((m) => m.file_path);
    if (filesToSign.length > 0) {
      try {
        const paths = filesToSign.map((m) => m.file_path);
        const { data: signedList } = await supabaseAdmin.storage
          .from(CHAT_BUCKET)
          .createSignedUrls(paths, 86400);

        const urlMap = {};
        (signedList || []).forEach((item) => {
          if (item && item.path && item.signedUrl) {
            urlMap[item.path] = item.signedUrl;
          }
        });

        const enriched = (messages || []).map((m) => ({
          ...m,
          file_url: m.file_path ? (urlMap[m.file_path] || null) : null,
        }));

        return res.status(200).json({ success: true, data: enriched });
      } catch (signErr) {
        console.error('Failed to batch sign URLs:', signErr);
      }
    }

    return res.status(200).json({ success: true, data: messages || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/:id/messages
// multipart/form-data: optional "content" text field, optional single "file"
// (parsed by middleware/chatUpload.js). At least one of the two is required.
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const content = (req.body.content || '').trim();
    const file = req.file;

    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!isParticipant(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }
    if (['completed', 'refunded'].includes(conversation.contracts?.status)) {
      const baseDate = conversation.contracts?.submitted_at || conversation.contracts?.created_at || conversation.created_at;
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - new Date(baseDate).getTime();

      if (elapsed > gracePeriodMs) {
        const { data: latestMsg } = await supabaseAdmin
          .from('messages')
          .select('created_at')
          .eq('conversation_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastActivity = latestMsg?.created_at ? new Date(latestMsg.created_at).getTime() : new Date(baseDate).getTime();
        if (Date.now() - lastActivity > gracePeriodMs) {
          return res.status(409).json({
            success: false,
            error: 'This job is complete and the 1-week grace period has ended — the conversation is now read-only.',
          });
        }
      }
    }
    if (!content && !file) {
      return res.status(400).json({ success: false, error: 'Message must include text or a file' });
    }

    let fileMeta = null;
    if (file) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(CHAT_BUCKET)
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadError) throw uploadError;
      fileMeta = {
        file_name: file.originalname,
        file_size: file.size,
        file_mime_type: file.mimetype,
        file_path: filePath,
      };
    }

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert([
        {
          conversation_id: id,
          sender_id: userId,
          content: content || null,
          ...(fileMeta || {}),
        },
      ])
      .select('message_id, conversation_id, sender_id, content, message_type, file_name, file_size, file_mime_type, file_path, created_at')
      .single();

    if (error) {
      // Don't leave an orphaned file behind if the DB write failed.
      if (fileMeta) await supabaseAdmin.storage.from(CHAT_BUCKET).remove([fileMeta.file_path]);
      throw error;
    }

    if (message.file_path) {
      try {
        const { data: signed } = await supabaseAdmin.storage
          .from(CHAT_BUCKET)
          .createSignedUrl(message.file_path, 86400);
        message.file_url = signed?.signedUrl || null;
      } catch {}
    }

    publishToUsers([otherParticipant(req.user, conversation)], { topics: ['conversations'], conversation_id: id });

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/conversations/:id/messages/:messageId/download
// Returns a short-lived signed URL rather than a public one — chat-attachments
// is a private bucket, so this is the only way to actually reach a file.
exports.getAttachmentUrl = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!canView(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .select('file_path')
      .eq('message_id', messageId)
      .eq('conversation_id', id)
      .single();

    if (error || !message || !message.file_path) {
      return res.status(404).json({ success: false, error: 'Attachment not found' });
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(CHAT_BUCKET)
      .createSignedUrl(message.file_path, 3600);

    if (signError) throw signError;

    return res.status(200).json({
      success: true,
      data: { url: signed.signedUrl, downloadUrl: signed.signedUrl },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/:id/delete-confirm
// Deletion requires both the client and freelancer to confirm. The second
// confirmation triggers the actual wipe: every attachment file is removed from
// Storage, then the conversation row is deleted (which cascades to its messages).
exports.confirmDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!isParticipant(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }
    // Profile chats (no contract) can be deleted any time; contract chats once the contract is finished
    if (conversation.contract_id && !['completed', 'refunded'].includes(conversation.contracts?.status)) {
      return res.status(409).json({
        success: false,
        error: 'This conversation can only be deleted once the contract is completed.',
      });
    }

    const isClient = userId === conversation.client_id;
    const updates = isClient ? { client_delete_confirmed: true } : { freelancer_delete_confirmed: true };
    publishToUsers([otherParticipant(req.user, conversation)], { topics: ['conversations'], conversation_id: id });

    const { data: updated, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .eq('conversation_id', id)
      .select('client_delete_confirmed, freelancer_delete_confirmed')
      .single();

    if (error) throw error;

    const bothConfirmed = updated.client_delete_confirmed && updated.freelancer_delete_confirmed;

    if (!bothConfirmed) {
      return res.status(200).json({
        success: true,
        data: {
          deleted: false,
          client_delete_confirmed: updated.client_delete_confirmed,
          freelancer_delete_confirmed: updated.freelancer_delete_confirmed,
        },
      });
    }

    const { data: files } = await supabaseAdmin
      .from('messages')
      .select('file_path')
      .eq('conversation_id', id)
      .not('file_path', 'is', null);

    const paths = (files || []).map((f) => f.file_path).filter(Boolean);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(CHAT_BUCKET).remove(paths);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('conversation_id', id);

    if (deleteError) throw deleteError;

    return res.status(200).json({ success: true, data: { deleted: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/:id/delete-cancel - undo your own deletion confirmation
exports.cancelDeleteConfirm = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const conversation = await loadConversation(id);
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (!isParticipant(req.user, conversation)) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this conversation' });
    }

    const isClient = userId === conversation.client_id;
    const updates = isClient ? { client_delete_confirmed: false } : { freelancer_delete_confirmed: false };
    publishToUsers([otherParticipant(req.user, conversation)], { topics: ['conversations'], conversation_id: id });

    const { data: updated, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .eq('conversation_id', id)
      .select('client_delete_confirmed, freelancer_delete_confirmed')
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Profile chats ("Message" on someone's profile). Your current mode decides the roles:
// in Client mode you message them as a freelancer; in Freelancer mode, as a client.
// One profile chat per client/freelancer pair; contract chats are separate.
function profileChatRoles(user, otherUserId) {
  return user.active_role === 'freelancer'
    ? { client_id: otherUserId, freelancer_id: user.id }
    : { client_id: user.id, freelancer_id: otherUserId };
}

async function findProfileChat(roles) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('client_id', roles.client_id)
    .eq('freelancer_id', roles.freelancer_id)
    .is('contract_id', null);
  if (error) throw error;
  const chat = (data || []).find((c) => !c.is_admin_chat);
  return chat ? { conversation_id: chat.conversation_id } : null;
}

// GET /api/v1/conversations/direct/:userId - the existing profile chat with this person
// (for your current mode), or null
exports.getProfileChat = async (req, res) => {
  try {
    const otherId = req.params.userId;
    if (otherId === req.user.id) return res.status(200).json({ success: true, data: null });
    const existing = await findProfileChat(profileChatRoles(req.user, otherId));
    return res.status(200).json({ success: true, data: existing ? { conversation_id: existing.conversation_id } : null });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/direct { user_id, content } - start (or reuse) a profile chat
// with this person and send the first message
exports.startProfileChat = async (req, res) => {
  try {
    const otherId = req.body?.user_id;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!otherId) return res.status(400).json({ success: false, error: 'Who do you want to message?' });
    if (otherId === req.user.id) return res.status(400).json({ success: false, error: 'You can\'t message yourself.' });
    if (!content) return res.status(400).json({ success: false, error: 'Write a message first.' });
    if (content.length > MESSAGE_MAX) {
      return res.status(400).json({ success: false, error: `Messages must be ${MESSAGE_MAX} characters or less.` });
    }

    const { data: other } = await supabaseAdmin
      .from('users')
      .select('user_id, first_name, last_name, status')
      .eq('user_id', otherId)
      .maybeSingle();
    if (!other || other.status === 'suspended' || other.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'This person can\'t receive messages.' });
    }

    const roles = profileChatRoles(req.user, otherId);
    let conversation = await findProfileChat(roles);
    let created = false;
    if (!conversation) {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert([{ ...roles, contract_id: null, title: PROFILE_CHAT_TITLE }])
        .select('conversation_id')
        .single();
      if (error) {
        console.error('startProfileChat insert failed:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Could not start the chat. Make sure migration 013 has been run, then try again.',
        });
      }
      conversation = data;
      created = true;
    }

    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert([{ conversation_id: conversation.conversation_id, sender_id: req.user.id, content }]);
    if (messageError) throw messageError;

    const iAmClient = roles.client_id === req.user.id;
    await notify({
      user_id: otherId,
      type: 'message',
      role: iAmClient ? 'freelancer' : 'customer',
      title: `${displayName(req.user, 'Someone')} sent you a message`,
      body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
      link: `/messages/${conversation.conversation_id}`,
    });
    if (created) {
      await logActivity({
        user_id: req.user.id,
        category: 'jobs',
        action: 'message.profile_chat_started',
        description: `Started a chat with ${displayName(other, 'a user')} from their ${iAmClient ? 'freelancer' : 'client'} profile`,
        target_type: 'conversation',
        target_id: conversation.conversation_id,
        link: `/messages/${conversation.conversation_id}`,
      });
    }

    return res.status(created ? 201 : 200).json({ success: true, data: { conversation_id: conversation.conversation_id, created } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ---- Admin team chats (migration 016) ----
const ADMIN_CHAT_TITLE = 'Admin chat';

async function findAdminChat(userA, userB) {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .or(`and(client_id.eq.${userA},freelancer_id.eq.${userB}),and(client_id.eq.${userB},freelancer_id.eq.${userA})`)
    .is('contract_id', null);
  if (error) throw error;
  return (data || []).find((c) => c.is_admin_chat) || null;
}

async function loadOtherAdmin(req, res, otherId) {
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Only admins can use admin chats.' });
    return null;
  }
  if (!otherId) {
    res.status(400).json({ success: false, error: 'Who do you want to message?' });
    return null;
  }
  if (otherId === req.user.id) {
    res.status(400).json({ success: false, error: 'You can\'t message yourself.' });
    return null;
  }
  const { data: other } = await supabaseAdmin
    .from('users')
    .select('user_id, first_name, last_name, email, role, status')
    .eq('user_id', otherId)
    .maybeSingle();
  if (!other || other.role !== 'admin' || other.status !== 'active') {
    res.status(404).json({ success: false, error: 'That admin account was not found.' });
    return null;
  }
  return other;
}

// GET /api/v1/conversations/admin/:userId - the existing admin chat with this admin, or null
exports.getAdminChat = async (req, res) => {
  try {
    const other = await loadOtherAdmin(req, res, req.params.userId);
    if (!other) return;
    const chat = await findAdminChat(req.user.id, other.user_id);
    return res.status(200).json({ success: true, data: chat ? { conversation_id: chat.conversation_id } : null });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/conversations/admin  { user_id, content } - message another admin. The first
// message creates the chat (like profile chats), so an accidental click never leaves an empty one.
exports.startAdminChat = async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    const other = await loadOtherAdmin(req, res, req.body.user_id);
    if (!other) return;
    if (!content) return res.status(400).json({ success: false, error: 'Write a message first.' });
    if (content.length > MESSAGE_MAX) {
      return res.status(400).json({ success: false, error: `Messages must be ${MESSAGE_MAX} characters or less.` });
    }

    let conversation = await findAdminChat(req.user.id, other.user_id);
    let created = false;
    if (!conversation) {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .insert([{
          client_id: req.user.id,
          freelancer_id: other.user_id,
          contract_id: null,
          title: ADMIN_CHAT_TITLE,
          is_admin_chat: true,
        }])
        .select()
        .single();
      if (error) {
        console.error('startAdminChat insert failed:', error.message);
        return res.status(500).json({
          success: false,
          error: 'Could not start the chat. Make sure migration 016 has been run, then try again.',
        });
      }
      conversation = data;
      created = true;
    }

    const { error: messageError } = await supabaseAdmin
      .from('messages')
      .insert([{ conversation_id: conversation.conversation_id, sender_id: req.user.id, content }]);
    if (messageError) throw messageError;

    await notify({
      user_id: other.user_id,
      type: 'message',
      role: null,
      title: `${displayName(req.user, 'An admin')} sent you an admin message`,
      body: content.length > 120 ? `${content.slice(0, 117)}...` : content,
      link: `/messages/${conversation.conversation_id}`,
    });
    publishToUsers([other.user_id], { topics: ['conversations'], conversation_id: conversation.conversation_id });
    if (created) {
      await logActivity({
        user_id: req.user.id,
        category: 'admin',
        action: 'message.admin_chat_started',
        description: `Started an admin chat with ${displayName(other, 'an admin')}`,
        target_type: 'conversation',
        target_id: conversation.conversation_id,
        link: `/messages/${conversation.conversation_id}`,
      });
    }

    return res.status(created ? 201 : 200).json({ success: true, data: { conversation_id: conversation.conversation_id, created } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

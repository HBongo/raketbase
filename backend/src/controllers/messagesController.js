const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');

// Files live at <bucket>/<conversation_id>/<uuid>-<original filename>
// (bucket created by database/schema.sql).
const CHAT_BUCKET = 'chat-attachments';

const CONVERSATION_SELECT = `
  conversation_id, contract_id, client_id, freelancer_id, title, created_at,
  client_delete_confirmed, freelancer_delete_confirmed,
  contracts(status)
`;

function isStaffOrAdmin(user) {
  return user.role === 'staff' || user.role === 'admin';
}

function isParticipant(user, conversation) {
  return user.id === conversation.client_id || user.id === conversation.freelancer_id;
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
        client:users!conversations_client_id_fkey(user_id, first_name, last_name, email, client_avatar_url),
        freelancer:users!conversations_freelancer_id_fkey(user_id, first_name, last_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (!isStaffOrAdmin(req.user)) {
      query = query.or(`client_id.eq.${userId},freelancer_id.eq.${userId}`);
    }

    const { data: conversations, error } = await query;
    if (error) throw error;

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

    const enriched = (conversations || []).map((c) => ({
      ...c,
      last_message: lastByConversation[c.conversation_id] || null,
    }));

    return res.status(200).json({ success: true, data: enriched });
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
    if (!isParticipant(req.user, conversation) && !isStaffOrAdmin(req.user)) {
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
    if (!isParticipant(req.user, conversation) && !isStaffOrAdmin(req.user)) {
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
      return res.status(409).json({ success: false, error: 'This job is complete — the conversation is read-only.' });
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
    if (!isParticipant(req.user, conversation) && !isStaffOrAdmin(req.user)) {
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
    if (!['completed', 'refunded'].includes(conversation.contracts?.status)) {
      return res.status(409).json({
        success: false,
        error: 'This conversation can only be deleted once the contract is completed.',
      });
    }

    const isClient = userId === conversation.client_id;
    const updates = isClient ? { client_delete_confirmed: true } : { freelancer_delete_confirmed: true };

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

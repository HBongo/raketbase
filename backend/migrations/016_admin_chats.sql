-- ============================================================================
-- RaketBase — Admin team chats
-- Admins can message each other. These chats are marked is_admin_chat, are only
-- visible to the two admins in them (not to other admins reading platform chats),
-- and there is one chat per pair of admins. client_id = who started it,
-- freelancer_id = the other admin (the column names don't mean roles here).
-- ============================================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_admin_chat boolean NOT NULL DEFAULT false;

-- Profile chats (013): one per client/freelancer pair, not counting admin chats
DROP INDEX IF EXISTS public.conversations_profile_chat_pair_key;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_profile_chat_pair_key
    ON public.conversations (client_id, freelancer_id)
    WHERE contract_id IS NULL AND NOT is_admin_chat;

-- Admin chats: one per pair of admins, whoever started it
CREATE UNIQUE INDEX IF NOT EXISTS conversations_admin_chat_pair_key
    ON public.conversations (LEAST(client_id, freelancer_id), GREATEST(client_id, freelancer_id))
    WHERE is_admin_chat;

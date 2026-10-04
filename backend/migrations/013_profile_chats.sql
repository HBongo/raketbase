-- ============================================================================
-- RaketBase — Chats started from a profile ("Message" button)
-- These chats aren't tied to a contract, so contract_id becomes optional.
-- Contract chats are unchanged (still one per contract). Profile chats are one
-- per client/freelancer pair.
-- ============================================================================

ALTER TABLE public.conversations ALTER COLUMN contract_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_profile_chat_pair_key
    ON public.conversations (client_id, freelancer_id)
    WHERE contract_id IS NULL;

-- ============================================================================
-- RaketBase — Unread messages
-- Each side of a chat remembers when they last opened it; messages from the
-- other person (including system messages their actions posted) that are newer
-- count as unread. Written and read only by the Express backend.
-- ============================================================================

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS client_last_read_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS freelancer_last_read_at timestamp with time zone;

-- Chats that already exist start out as read, so nobody gets a flood of old "unread" chats
UPDATE public.conversations
SET client_last_read_at = COALESCE(client_last_read_at, now()),
    freelancer_last_read_at = COALESCE(freelancer_last_read_at, now());

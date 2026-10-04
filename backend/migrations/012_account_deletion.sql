-- ============================================================================
-- RaketBase — Account deletion (anonymized)
-- A deleted account keeps its row so contracts, chats and reviews shared with
-- other people stay intact; the backend wipes the personal data, shows it as
-- "Deleted user", and blocks the login for good.
-- ============================================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check
    CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleted'::text]));

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

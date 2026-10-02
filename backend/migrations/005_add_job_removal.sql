-- ============================================================================
-- RaketBase — Admin Job Moderation
-- Adds a 'removed' job status (taken down by an admin, distinct from a client
-- cancelling their own posting) and the reason shown to the client.
-- ============================================================================

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'paused'::text, 'assigned'::text, 'completed'::text, 'cancelled'::text, 'removed'::text]));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS removal_reason text;

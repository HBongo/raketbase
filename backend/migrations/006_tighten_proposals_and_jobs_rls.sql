-- ============================================================================
-- RaketBase — Close direct database access to proposals and jobs
-- The app reads and writes these tables only through the backend, which uses
-- the service-role key and is not affected by RLS. These policies let anyone
-- with the public anon key bypass the backend's checks, so they are removed.
-- The frontend's only direct Supabase use is Realtime on messages/conversations,
-- which this file does not touch.
-- ============================================================================

-- Proposals: anyone could read, edit, or delete every proposal.
DROP POLICY IF EXISTS "Allow public CRUD on proposals" ON public.proposals;

-- Proposals: logged-in users could insert proposals directly, skipping the
-- backend's validation (anti-slop filter, job status, own-job checks).
DROP POLICY IF EXISTS "Freelancers can submit proposals" ON public.proposals;

-- Jobs: logged-in users could insert jobs directly, skipping the anti-slop filter.
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;

-- Jobs: everything was readable, including paused/cancelled/removed jobs and
-- removal reasons. Limit it to what Explore shows publicly.
DROP POLICY IF EXISTS "Public can view open jobs" ON public.jobs;
CREATE POLICY "Public can view listed jobs" ON public.jobs
  FOR SELECT
  USING (status = ANY (ARRAY['open'::text, 'assigned'::text, 'completed'::text]));

-- Kept as-is: "Freelancers can view own proposals" and
-- "Clients can view proposals on their jobs" (read-only, scoped to the owner).

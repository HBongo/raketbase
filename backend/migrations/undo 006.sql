-- ============================================================================
-- UNDO for migration 006 (006_tighten_proposals_and_jobs_rls.sql)
-- Restores the jobs/proposals RLS policies exactly as they were before 006.
-- Only run this if something stops working after 006. It changes access
-- rules only; no data is touched.
-- ============================================================================

DROP POLICY IF EXISTS "Public can view listed jobs" ON public.jobs;

CREATE POLICY "Public can view open jobs" ON public.jobs
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Freelancers can submit proposals" ON public.proposals
  FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Allow public CRUD on proposals" ON public.proposals
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- RaketBase — Phase 4: Multi-Currency Migration
-- Adds currency column to jobs only
-- Contracts, milestones, and proposals derive currency via join with jobs(currency)
-- ============================================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PHP';

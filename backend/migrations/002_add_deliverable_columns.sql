-- ============================================================================
-- RaketBase — Phase 1: Contract Deliverables Schema Migration
-- Adds deliverable link and notes columns to contracts & milestones
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================================

-- 1. Deliverable columns on contracts (for fixed-price contracts)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS deliverable_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deliverable_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT NULL;

-- 2. Deliverable columns on milestones (for milestone-based contracts)
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS deliverable_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deliverable_notes text DEFAULT NULL;

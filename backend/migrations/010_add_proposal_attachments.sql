-- ============================================================================
-- RaketBase — Migration 010: Add Proposal Attachments & Portfolio Link
-- Adds attachment_url, attachment_name, and portfolio_link columns to proposals
-- ============================================================================

ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portfolio_link text DEFAULT NULL;

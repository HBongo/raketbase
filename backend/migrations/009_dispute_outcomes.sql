-- ============================================================================
-- RaketBase — Dispute outcomes that match what actually happened to the money
--   release to freelancer -> contract 'completed', full amount counts
--   refund to client      -> contract 'refunded' (new), nothing counts, job cancelled
--   split                 -> contract 'completed', released_amount = half
-- released_amount is what the freelancer actually received; NULL means the full
-- agreed_amount (every normally completed contract). Stats such as earnings,
-- average price and platform revenue use COALESCE(released_amount, agreed_amount).
-- ============================================================================

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'submitted'::text, 'completed'::text, 'disputed'::text, 'refunded'::text]));

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS released_amount numeric;

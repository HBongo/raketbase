-- ============================================================================
-- RaketBase — Client payment methods (how a client funds escrow)
-- Kept apart from freelancer payout_details (migration 010). Written and read
-- only by the Express backend (service-role key): RLS enabled with no policies.
-- Cards: only the brand, last 4 digits and expiry are stored, never the full
-- card number. Wallets and bank accounts: the number is stored and only ever
-- shown masked.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.client_payment_methods (
    user_id         uuid NOT NULL,
    method          text NOT NULL,
    provider_name   text,
    account_name    text NOT NULL,
    account_number  text NOT NULL,
    card_expiry     text,
    updated_at      timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT client_payment_methods_pkey PRIMARY KEY (user_id),
    CONSTRAINT client_payment_methods_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT client_payment_methods_method_check CHECK (method = ANY (ARRAY['gcash'::text, 'maya'::text, 'bank'::text, 'card'::text]))
);

ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;

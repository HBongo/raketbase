-- ============================================================================
-- RaketBase — Activity log, freelancer payout details, client business type
-- activity_log and payout_details are written and read only by the Express
-- backend (service-role key), so RLS is enabled with no policies: direct
-- anon-key access is always denied. Payout details never leave the backend
-- unmasked.
-- ============================================================================

-- 1. Activity log: one row per important action (account, jobs, contracts, admin)
CREATE TABLE IF NOT EXISTS public.activity_log (
    activity_id  uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid,
    category     text NOT NULL,
    action       text NOT NULL,
    description  text NOT NULL,
    target_type  text,
    target_id    text,
    link         text,
    metadata     jsonb,
    created_at   timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT activity_log_pkey PRIMARY KEY (activity_id),
    CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE SET NULL,
    CONSTRAINT activity_log_category_check CHECK (category = ANY (ARRAY['account'::text, 'jobs'::text, 'contracts'::text, 'admin'::text]))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id_created_at
    ON public.activity_log USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
    ON public.activity_log USING btree (created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 2. Freelancer payout details (where escrow is paid out to)
CREATE TABLE IF NOT EXISTS public.payout_details (
    user_id         uuid NOT NULL,
    method          text NOT NULL,
    provider_name   text,
    account_name    text NOT NULL,
    account_number  text NOT NULL,
    updated_at      timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT payout_details_pkey PRIMARY KEY (user_id),
    CONSTRAINT payout_details_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT payout_details_method_check CHECK (method = ANY (ARRAY['bank'::text, 'gcash'::text, 'maya'::text]))
);

ALTER TABLE public.payout_details ENABLE ROW LEVEL SECURITY;

-- 3. Client business type (shown as a badge on the Client side of a profile)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS client_type text;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_client_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_client_type_check
    CHECK (client_type IS NULL OR client_type = ANY (ARRAY['individual'::text, 'small_business'::text, 'major_contractor'::text]));

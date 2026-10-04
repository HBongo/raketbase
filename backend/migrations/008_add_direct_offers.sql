-- ============================================================================
-- RaketBase — Direct offers ("Hire Me" on a freelancer's profile)
-- A client sends a freelancer an offer (details, price, optional files). If the
-- freelancer accepts, the backend creates a private job (is_direct = true, never
-- listed on Explore), an active contract and the contract chat.
-- All access goes through the Express backend (service-role key): RLS is on with
-- no policies on the new tables, and the file bucket is private.
-- ============================================================================

-- Jobs created from an accepted offer are private to the two people involved.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_direct boolean NOT NULL DEFAULT false;

-- Keep direct-offer jobs out of the public (anon key) job listing too.
DROP POLICY IF EXISTS "Public can view listed jobs" ON public.jobs;
CREATE POLICY "Public can view listed jobs" ON public.jobs
  FOR SELECT
  USING (status = ANY (ARRAY['open'::text, 'assigned'::text, 'completed'::text]) AND is_direct = false);

CREATE TABLE IF NOT EXISTS public.direct_offers (
    offer_id      uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id     uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    title         text NOT NULL,
    description   text NOT NULL,
    amount        numeric NOT NULL,
    currency      text NOT NULL DEFAULT 'PHP',
    deadline      timestamp with time zone,
    status        text NOT NULL DEFAULT 'pending',
    job_id        uuid,
    contract_id   uuid,
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    responded_at  timestamp with time zone,
    CONSTRAINT direct_offers_pkey PRIMARY KEY (offer_id),
    CONSTRAINT direct_offers_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT direct_offers_freelancer_id_fkey FOREIGN KEY (freelancer_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT direct_offers_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (job_id) ON DELETE SET NULL,
    CONSTRAINT direct_offers_contract_id_fkey FOREIGN KEY (contract_id)
        REFERENCES public.contracts (contract_id) ON DELETE SET NULL,
    CONSTRAINT direct_offers_amount_check CHECK (amount > 0),
    CONSTRAINT direct_offers_currency_check CHECK (currency = ANY (ARRAY['PHP'::text, 'USD'::text])),
    CONSTRAINT direct_offers_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text])),
    CONSTRAINT direct_offers_not_self_check CHECK (client_id <> freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_offers_freelancer_id ON public.direct_offers USING btree (freelancer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_offers_client_id ON public.direct_offers USING btree (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.direct_offer_files (
    file_id        uuid NOT NULL DEFAULT gen_random_uuid(),
    offer_id       uuid NOT NULL,
    file_name      text NOT NULL,
    file_path      text NOT NULL,
    file_size      integer NOT NULL,
    file_mime_type text NOT NULL,
    created_at     timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT direct_offer_files_pkey PRIMARY KEY (file_id),
    CONSTRAINT direct_offer_files_offer_id_fkey FOREIGN KEY (offer_id)
        REFERENCES public.direct_offers (offer_id) ON DELETE CASCADE
);

ALTER TABLE public.direct_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_offer_files ENABLE ROW LEVEL SECURITY;

-- Private bucket for offer attachments (downloaded through short-lived signed URLs).
INSERT INTO storage.buckets (id, name, public)
VALUES ('offer-attachments', 'offer-attachments', false)
ON CONFLICT (id) DO NOTHING;

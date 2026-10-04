-- Schema reconstructed from Supabase information_schema/pg_catalog introspection
-- (dumped via SQL Editor, not pg_dump — see PART3_IMPLEMENTATION_AND_AI_LOG.md for context)

CREATE TABLE public.categories (
    category_id   uuid NOT NULL DEFAULT gen_random_uuid(),
    category_name text NOT NULL,
    description   text,
    CONSTRAINT categories_pkey PRIMARY KEY (category_id),
    CONSTRAINT categories_category_name_key UNIQUE (category_name)
);

CREATE TABLE public.users (
    user_id            uuid NOT NULL,
    email              text NOT NULL,
    first_name         text,
    last_name          text,
    role               text NOT NULL DEFAULT 'customer'::text,
    created_at         timestamp with time zone NOT NULL DEFAULT now(),
    active_role        text DEFAULT 'customer'::text,
    bio                text,
    skills             text[],
    portfolio_url      text,
    password_hash      text,
    status             text DEFAULT 'active'::text,
    avatar_url         text,
    client_avatar_url  text,
    client_bio         text,
    company_name       text,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['customer'::text, 'staff'::text, 'admin'::text])),
    CONSTRAINT users_active_role_check CHECK (active_role = ANY (ARRAY['customer'::text, 'freelancer'::text])),
    CONSTRAINT users_status_check CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'deleted'::text]))
);

CREATE TABLE public.jobs (
    job_id      uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id   uuid NOT NULL,
    category_id uuid,
    title       text NOT NULL,
    description text NOT NULL,
    budget      numeric NOT NULL,
    status      text NOT NULL DEFAULT 'open'::text,
    created_at  timestamp with time zone NOT NULL DEFAULT now(),
    budget_type text DEFAULT 'fixed'::text,
    deadline    timestamp with time zone,
    removal_reason text,
    is_direct   boolean NOT NULL DEFAULT false,
    CONSTRAINT jobs_pkey PRIMARY KEY (job_id),
    CONSTRAINT jobs_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT jobs_category_id_fkey FOREIGN KEY (category_id)
        REFERENCES public.categories (category_id) ON DELETE SET NULL,
    CONSTRAINT jobs_status_check CHECK (status = ANY (ARRAY['open'::text, 'paused'::text, 'assigned'::text, 'completed'::text, 'cancelled'::text, 'removed'::text])),
    CONSTRAINT jobs_budget_type_check CHECK (budget_type = ANY (ARRAY['fixed'::text, 'milestone'::text])),
    CONSTRAINT jobs_budget_check CHECK (budget >= (0)::numeric)
);

CREATE INDEX idx_jobs_client_id ON public.jobs USING btree (client_id);
CREATE INDEX idx_jobs_category_id ON public.jobs USING btree (category_id);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);

CREATE TABLE public.proposals (
    proposal_id   uuid NOT NULL DEFAULT gen_random_uuid(),
    job_id        uuid NOT NULL,
    freelancer_id uuid NOT NULL,
    bid_amount    numeric NOT NULL,
    cover_letter  text NOT NULL,
    status        text NOT NULL DEFAULT 'pending'::text,
    submitted_at  timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT proposals_pkey PRIMARY KEY (proposal_id),
    CONSTRAINT proposals_job_id_freelancer_id_key UNIQUE (job_id, freelancer_id),
    CONSTRAINT proposals_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (job_id) ON DELETE CASCADE,
    CONSTRAINT proposals_freelancer_id_fkey FOREIGN KEY (freelancer_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT proposals_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text])),
    CONSTRAINT proposals_bid_amount_check CHECK (bid_amount > (0)::numeric)
);

CREATE INDEX idx_proposals_job_id ON public.proposals USING btree (job_id);
CREATE INDEX idx_proposals_freelancer_id ON public.proposals USING btree (freelancer_id);

CREATE TABLE public.contracts (
    contract_id    uuid NOT NULL DEFAULT gen_random_uuid(),
    job_id         uuid,
    client_id      uuid,
    freelancer_id  uuid,
    agreed_amount  numeric NOT NULL,
    status         text DEFAULT 'active'::text,
    created_at     timestamp with time zone DEFAULT now(),
    deliverable_url text,
    deliverable_notes text,
    submitted_at   timestamp with time zone,
    CONSTRAINT contracts_pkey PRIMARY KEY (contract_id),
    CONSTRAINT contracts_job_id_fkey FOREIGN KEY (job_id)
        REFERENCES public.jobs (job_id) ON DELETE CASCADE,
    CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT contracts_freelancer_id_fkey FOREIGN KEY (freelancer_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT contracts_status_check CHECK (status = ANY (ARRAY['active'::text, 'submitted'::text, 'completed'::text, 'disputed'::text, 'refunded'::text]))
);

CREATE TABLE public.disputes (
    dispute_id           uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id          uuid,
    raised_by_id         uuid,
    handled_by_staff_id  uuid,
    reason               text NOT NULL,
    resolution_notes     text,
    status               text DEFAULT 'open'::text,
    created_at           timestamp with time zone DEFAULT now(),
    CONSTRAINT disputes_pkey PRIMARY KEY (dispute_id),
    CONSTRAINT disputes_contract_id_fkey FOREIGN KEY (contract_id)
        REFERENCES public.contracts (contract_id) ON DELETE CASCADE,
    CONSTRAINT disputes_raised_by_id_fkey FOREIGN KEY (raised_by_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT disputes_handled_by_staff_id_fkey FOREIGN KEY (handled_by_staff_id)
        REFERENCES public.users (user_id) ON DELETE SET NULL,
    CONSTRAINT disputes_status_check CHECK (status = ANY (ARRAY['open'::text, 'under_review'::text, 'resolved'::text]))
);

CREATE TABLE public.reviews (
    review_id              uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id            uuid,
    reviewer_id            uuid,
    reviewee_id            uuid,
    rating                 integer NOT NULL,
    comment                text,
    created_at             timestamp with time zone DEFAULT now(),
    reviewee_role          text,
    quality_rating         integer,
    communication_rating   integer,
    timeliness_rating      integer,
    clarity_rating         integer,
    responsiveness_rating  integer,
    payment_rating         integer,
    CONSTRAINT reviews_pkey PRIMARY KEY (review_id),
    CONSTRAINT reviews_contract_id_fkey FOREIGN KEY (contract_id)
        REFERENCES public.contracts (contract_id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviews_comment_length_check CHECK (comment IS NULL OR char_length(comment) <= 1000),
    CONSTRAINT reviews_reviewee_role_check CHECK (reviewee_role IS NULL OR reviewee_role = ANY (ARRAY['freelancer'::text, 'customer'::text])),
    CONSTRAINT reviews_no_self_review_check CHECK (reviewer_id IS NULL OR reviewee_id IS NULL OR reviewer_id <> reviewee_id),
    CONSTRAINT reviews_subratings_range_check CHECK (
        (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)) AND
        (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)) AND
        (timeliness_rating IS NULL OR (timeliness_rating >= 1 AND timeliness_rating <= 5)) AND
        (clarity_rating IS NULL OR (clarity_rating >= 1 AND clarity_rating <= 5)) AND
        (responsiveness_rating IS NULL OR (responsiveness_rating >= 1 AND responsiveness_rating <= 5)) AND
        (payment_rating IS NULL OR (payment_rating >= 1 AND payment_rating <= 5))
    ),
    CONSTRAINT reviews_criteria_by_role_check CHECK (
        reviewee_role IS NULL OR
        (reviewee_role = 'freelancer'::text AND quality_rating IS NOT NULL AND communication_rating IS NOT NULL
            AND timeliness_rating IS NOT NULL AND clarity_rating IS NULL AND responsiveness_rating IS NULL AND payment_rating IS NULL) OR
        (reviewee_role = 'customer'::text AND clarity_rating IS NOT NULL AND responsiveness_rating IS NOT NULL
            AND payment_rating IS NOT NULL AND quality_rating IS NULL AND communication_rating IS NULL AND timeliness_rating IS NULL)
    )
);

CREATE UNIQUE INDEX reviews_one_per_reviewer_per_contract ON public.reviews USING btree (contract_id, reviewer_id);
CREATE INDEX reviews_reviewee_role_idx ON public.reviews USING btree (reviewee_id, reviewee_role);

-- Messaging (Part 5): one conversation per contract, auto-created when a proposal
-- is accepted (see backend/src/controllers/proposalsController.js).
CREATE TABLE public.conversations (
    conversation_id              uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id                  uuid,
    client_id                    uuid NOT NULL,
    freelancer_id                uuid NOT NULL,
    title                        text NOT NULL,
    created_at                   timestamp with time zone NOT NULL DEFAULT now(),
    client_delete_confirmed      boolean NOT NULL DEFAULT false,
    freelancer_delete_confirmed  boolean NOT NULL DEFAULT false,
    CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id),
    CONSTRAINT conversations_contract_id_key UNIQUE (contract_id),
    CONSTRAINT conversations_contract_id_fkey FOREIGN KEY (contract_id)
        REFERENCES public.contracts (contract_id) ON DELETE CASCADE,
    CONSTRAINT conversations_client_id_fkey FOREIGN KEY (client_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT conversations_freelancer_id_fkey FOREIGN KEY (freelancer_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_client_id ON public.conversations USING btree (client_id);
CREATE INDEX idx_conversations_freelancer_id ON public.conversations USING btree (freelancer_id);

CREATE TABLE public.messages (
    message_id      uuid NOT NULL DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL,
    sender_id       uuid NOT NULL,
    content         text,
    file_name       text,
    file_size       integer,
    file_mime_type  text,
    file_path       text,
    created_at      timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT messages_pkey PRIMARY KEY (message_id),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id)
        REFERENCES public.conversations (conversation_id) ON DELETE CASCADE,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT messages_content_or_file_check CHECK (content IS NOT NULL OR file_path IS NOT NULL)
);

CREATE INDEX idx_messages_conversation_id_created_at ON public.messages USING btree (conversation_id, created_at);

-- RLS on these two tables scopes what the frontend's anon-key Supabase Realtime
-- subscription may read. All actual writes go through the Express backend using
-- the service-role key, which bypasses RLS — there are deliberately no INSERT/
-- UPDATE/DELETE policies, so a direct client-side write is always denied.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select ON public.conversations
    FOR SELECT
    USING (
        auth.uid() = client_id
        OR auth.uid() = freelancer_id
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.role IN ('staff', 'admin'))
    );

CREATE POLICY messages_select ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.conversation_id = messages.conversation_id
              AND (
                auth.uid() = c.client_id
                OR auth.uid() = c.freelancer_id
                OR EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.role IN ('staff', 'admin'))
              )
        )
    );

-- Storage bucket for chat file sharing: private, 25 MB limit. Every download goes
-- through the backend, which mints a short-lived signed URL after checking the
-- requester is a participant (or staff/admin).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    false,
    26214400,
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
    ]
);

-- Milestone-based contracts (Part 6): a freelancer proposing on a 'milestone'
-- budget_type job breaks their bid into stages up front (proposal_milestones).
-- Accepting the proposal copies that breakdown into milestones on the new
-- contract (see backend/src/controllers/proposalsController.js). Milestones are
-- sequential: only the 'active' one can be submitted; approving it either
-- activates the next or completes the whole contract (milestonesController.js).
CREATE TABLE public.proposal_milestones (
    proposal_milestone_id uuid NOT NULL DEFAULT gen_random_uuid(),
    proposal_id           uuid NOT NULL,
    title                 text NOT NULL,
    amount                numeric NOT NULL,
    sequence              integer NOT NULL,
    CONSTRAINT proposal_milestones_pkey PRIMARY KEY (proposal_milestone_id),
    CONSTRAINT proposal_milestones_proposal_id_fkey FOREIGN KEY (proposal_id)
        REFERENCES public.proposals (proposal_id) ON DELETE CASCADE,
    CONSTRAINT proposal_milestones_amount_check CHECK (amount > 0),
    CONSTRAINT proposal_milestones_sequence_key UNIQUE (proposal_id, sequence)
);

CREATE INDEX idx_proposal_milestones_proposal_id ON public.proposal_milestones USING btree (proposal_id);

-- RLS enabled with zero policies, deliberately: nothing ever needs to read this
-- table with the anon/authenticated key (only the backend's service-role key
-- does, which always bypasses RLS). This just closes off Supabase's default
-- auto-REST exposure of public-schema tables to anyone holding the anon key.
ALTER TABLE public.proposal_milestones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.milestones (
    milestone_id  uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id   uuid NOT NULL,
    title         text NOT NULL,
    amount        numeric NOT NULL,
    sequence      integer NOT NULL,
    status        text NOT NULL DEFAULT 'pending',
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    submitted_at  timestamp with time zone,
    completed_at  timestamp with time zone,
    deliverable_url text,
    deliverable_notes text,
    CONSTRAINT milestones_pkey PRIMARY KEY (milestone_id),
    CONSTRAINT milestones_contract_id_fkey FOREIGN KEY (contract_id)
        REFERENCES public.contracts (contract_id) ON DELETE CASCADE,
    CONSTRAINT milestones_amount_check CHECK (amount > 0),
    CONSTRAINT milestones_sequence_key UNIQUE (contract_id, sequence),
    CONSTRAINT milestones_status_check CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'submitted'::text, 'completed'::text]))
);

CREATE INDEX idx_milestones_contract_id ON public.milestones USING btree (contract_id);

-- Same reasoning as proposal_milestones above: RLS enabled, no policies, deny-all
-- for anon/authenticated.
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- System messages (milestone submitted/approved, contract completed) alongside
-- ordinary user messages in the existing chat, rendered differently on the frontend.
ALTER TABLE public.messages ADD COLUMN message_type text NOT NULL DEFAULT 'user';
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
    CHECK (message_type = ANY (ARRAY['user'::text, 'system'::text]));

-- Jobs and proposals are written only by the Express backend (service-role key,
-- bypasses RLS). Direct anon-key access is read-only and scoped; there are no
-- INSERT/UPDATE/DELETE policies (migration 006).
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view listed jobs" ON public.jobs
    FOR SELECT
    USING (status = ANY (ARRAY['open'::text, 'assigned'::text, 'completed'::text]) AND is_direct = false);

CREATE POLICY "Freelancers can view own proposals" ON public.proposals
    FOR SELECT
    USING (auth.uid() = freelancer_id);

CREATE POLICY "Clients can view proposals on their jobs" ON public.proposals
    FOR SELECT
    USING (auth.uid() IN (SELECT jobs.client_id FROM public.jobs WHERE jobs.job_id = proposals.job_id));

-- ============================================================
-- Notifications (bell in the top bar). `role` tags which mode the
-- notification belongs to. Backend-only: RLS on, no policies (migration 007).
-- ============================================================
CREATE TABLE public.notifications (
    notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL,
    type            text NOT NULL,
    role            text,
    title           text NOT NULL,
    body            text,
    link            text,
    is_read         boolean NOT NULL DEFAULT false,
    created_at      timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (user_id) ON DELETE CASCADE,
    CONSTRAINT notifications_role_check CHECK (role IS NULL OR role = ANY (ARRAY['customer'::text, 'freelancer'::text]))
);

CREATE INDEX idx_notifications_user_id_created_at ON public.notifications USING btree (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Direct offers ("Hire Me"). Backend-only: RLS on, no policies (migration 008).
-- ============================================================
CREATE TABLE public.direct_offers (
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

CREATE INDEX idx_direct_offers_freelancer_id ON public.direct_offers USING btree (freelancer_id, created_at DESC);
CREATE INDEX idx_direct_offers_client_id ON public.direct_offers USING btree (client_id, created_at DESC);

CREATE TABLE public.direct_offer_files (
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

-- What the freelancer actually received after a split dispute; NULL = the full agreed_amount (migration 009).
ALTER TABLE public.contracts ADD COLUMN released_amount numeric;

-- ============================================================================
-- Activity log, freelancer payout details, client business type (migration 010).
-- Both tables are backend-only: RLS enabled with no policies.
-- ============================================================================
CREATE TABLE public.activity_log (
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
CREATE INDEX idx_activity_log_user_id_created_at ON public.activity_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payout_details (
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

ALTER TABLE public.users ADD COLUMN client_type text;
ALTER TABLE public.users ADD CONSTRAINT users_client_type_check
    CHECK (client_type IS NULL OR client_type = ANY (ARRAY['individual'::text, 'small_business'::text, 'major_contractor'::text]));

-- Client payment methods: how a client funds escrow (migration 011). Backend-only.
-- Cards keep only the brand, last 4 digits and expiry, never the full number.
CREATE TABLE public.client_payment_methods (
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

-- Account deletion (migration 012): deleted accounts are anonymized, not removed.
ALTER TABLE public.users ADD COLUMN deleted_at timestamp with time zone;

-- Chats started from a profile have no contract: one per client/freelancer pair (migration 013).
CREATE UNIQUE INDEX conversations_profile_chat_pair_key
    ON public.conversations (client_id, freelancer_id)
    WHERE contract_id IS NULL;

-- Proposal attachments: up to 3 files per proposal (migration 014). Backend-only; private bucket.
CREATE TABLE public.proposal_files (
    file_id        uuid NOT NULL DEFAULT gen_random_uuid(),
    proposal_id    uuid NOT NULL,
    file_name      text NOT NULL,
    file_path      text NOT NULL,
    file_size      integer NOT NULL,
    file_mime_type text NOT NULL,
    created_at     timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT proposal_files_pkey PRIMARY KEY (file_id),
    CONSTRAINT proposal_files_proposal_id_fkey FOREIGN KEY (proposal_id)
        REFERENCES public.proposals (proposal_id) ON DELETE CASCADE
);
CREATE INDEX idx_proposal_files_proposal_id ON public.proposal_files (proposal_id);
ALTER TABLE public.proposal_files ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', false)
ON CONFLICT (id) DO NOTHING;

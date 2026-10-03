-- ============================================================================
-- RaketBase — Notifications (bell in the top bar)
-- Rows are written and read only by the Express backend (service-role key), so
-- RLS is enabled with no policies: direct anon-key access is always denied.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
    ON public.notifications USING btree (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

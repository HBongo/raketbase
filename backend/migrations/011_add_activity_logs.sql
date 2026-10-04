-- ============================================================================
-- RaketBase — Migration 011: Activity Logging System
-- Creates public.activity_logs table for audit trail and user activity history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
    log_id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT activity_logs_pkey PRIMARY KEY (log_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

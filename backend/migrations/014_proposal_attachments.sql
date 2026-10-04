-- ============================================================================
-- RaketBase — Proposal attachments (up to 3 files per proposal, 10 MB each)
-- Written and read only by the Express backend (service-role key): RLS enabled
-- with no policies, and the file bucket is private (files open through
-- short-lived signed links, only for the freelancer and the job's client).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_files (
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

CREATE INDEX IF NOT EXISTS idx_proposal_files_proposal_id ON public.proposal_files (proposal_id);

ALTER TABLE public.proposal_files ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', false)
ON CONFLICT (id) DO NOTHING;

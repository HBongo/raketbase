-- ============================================================================
-- RaketBase — Job Lifecycle: allow accepting proposals on paused jobs
-- Pausing a job only stops new proposals; the client can still accept one of
-- the pending proposals already submitted. Only the job status check changed:
-- 'open' -> 'open' or 'paused'. The rest is the live function as-is.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_proposal_and_create_contract(p_proposal_id uuid, p_client_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_job RECORD;
  v_proposal RECORD;
  v_contract RECORD;
BEGIN
  -- 1. Fetch and row-lock the proposal
  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE proposal_id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  IF v_proposal.status != 'pending' THEN
    RAISE EXCEPTION 'Proposal is already %', v_proposal.status;
  END IF;

  -- 2. Fetch and row-lock the job
  SELECT * INTO v_job
  FROM public.jobs
  WHERE job_id = v_proposal.job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  IF v_job.client_id != p_client_id THEN
    RAISE EXCEPTION 'Unauthorized: Only the job owner can accept proposals';
  END IF;

  -- Paused jobs stay acceptable: pausing only blocks new proposals
  IF v_job.status NOT IN ('open', 'paused') THEN
    RAISE EXCEPTION 'Job is no longer open (current status: %)', v_job.status;
  END IF;

  -- 3. Update proposal status to accepted
  UPDATE public.proposals
  SET status = 'accepted'
  WHERE proposal_id = p_proposal_id;

  -- 4. Reject all other pending proposals for this job
  UPDATE public.proposals
  SET status = 'rejected'
  WHERE job_id = v_proposal.job_id
    AND proposal_id != p_proposal_id
    AND status = 'pending';

  -- 5. Update job status to assigned (matches jobs_status_check)
  UPDATE public.jobs
  SET status = 'assigned'
  WHERE job_id = v_proposal.job_id;

  -- 6. Atomically insert new active contract (matches contracts_status_check)
  INSERT INTO public.contracts (
    job_id,
    client_id,
    freelancer_id,
    agreed_amount,
    status
  )
  VALUES (
    v_proposal.job_id,
    p_client_id,
    v_proposal.freelancer_id,
    v_proposal.bid_amount,
    'active'
  )
  RETURNING * INTO v_contract;

  RETURN row_to_json(v_contract);
END;
$function$;

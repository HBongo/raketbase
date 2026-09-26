const { supabaseAdmin } = require('../config/supabase');
const { getRatingSummaries, emptySummary } = require('../utils/ratings');
const { validateProposalInput } = require('../utils/slopFilter');

// POST /api/v1/proposals - Submit a proposal for a job
// For a 'milestone' budget_type job, `milestones` (an array of { title, amount })
// replaces `bid_amount`: the total bid is derived server-side as the sum of the
// stages, so the two numbers can never drift apart. Fixed-price jobs are unchanged.
exports.createProposal = async (req, res) => {
  try {
    const { job_id, bid_amount, cover_letter, milestones } = req.body;
    // req.user is appended by JWT auth middleware
    const freelancer_id = req.user.id;

    // Bidding is a freelancer-mode action. Clients must switch modes first.
    if (req.user.active_role !== 'freelancer') {
      return res.status(403).json({
        success: false,
        error: 'Switch to Freelancer mode to submit proposals.'
      });
    }

    if (!job_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: job_id',
      });
    }

    // Phase 0 Anti-Slop & Input Sanitization
    const validation = validateProposalInput({
      cover_letter,
      bid_amount: isMilestoneJob ? undefined : bid_amount,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors,
      });
    }

    // Nobody may bid on a job they posted themselves, regardless of mode.
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, client_id, status, budget_type')
      .eq('job_id', job_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.client_id === freelancer_id) {
      return res.status(403).json({
        success: false,
        error: 'You cannot submit a proposal on your own job posting.'
      });
    }
    // Assigned/completed jobs are taken and no longer accept proposals.
    if (job.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: 'This job has been taken and is no longer accepting proposals.'
      });
    }

    const isMilestoneJob = job.budget_type === 'milestone';
    let finalBidAmount = bid_amount;
    let cleanMilestones = [];

    if (isMilestoneJob) {
      if (!Array.isArray(milestones) || milestones.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'This job is milestone-based — break your bid into at least one milestone.',
        });
      }
      for (const m of milestones) {
        const title = (m?.title || '').trim();
        const amount = Number(m?.amount);
        if (!title) {
          return res.status(400).json({ success: false, error: 'Every milestone needs a title.' });
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ success: false, error: `Milestone "${title}" needs an amount greater than ₱0.` });
        }
        cleanMilestones.push({ title, amount });
      }
      // The bid total is always the sum of its stages — never trust a client-sent bid_amount here.
      finalBidAmount = cleanMilestones.reduce((sum, m) => sum + m.amount, 0);
    } else {
      if (!bid_amount || Number(bid_amount) <= 0) {
        return res.status(400).json({ success: false, error: 'Missing required field: bid_amount' });
      }
      if (Array.isArray(milestones) && milestones.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'This job is fixed-price — it does not accept a milestone breakdown.',
        });
      }
    }

    const { data: proposal, error } = await supabaseAdmin
      .from('proposals')
      .insert([
        {
          job_id,
          freelancer_id,
          bid_amount: finalBidAmount,
          cover_letter,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    if (isMilestoneJob) {
      const { error: milestoneError } = await supabaseAdmin.from('proposal_milestones').insert(
        cleanMilestones.map((m, i) => ({
          proposal_id: proposal.proposal_id,
          title: m.title,
          amount: m.amount,
          sequence: i + 1,
        }))
      );
      if (milestoneError) {
        // Don't leave a half-formed proposal behind if the breakdown failed to save.
        await supabaseAdmin.from('proposals').delete().eq('proposal_id', proposal.proposal_id);
        throw milestoneError;
      }
    }

    return res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    // Catch Postgres error code 23505 (unique violation on job_id + freelancer_id)
    if (
      error.code === '23505' ||
      error.message?.includes('proposals_job_id_freelancer_id_key') ||
      error.message?.toLowerCase().includes('duplicate key')
    ) {
      return res.status(409).json({
        success: false,
        error: 'You have already submitted a proposal for this job.'
      });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/proposals/me - Get proposals submitted by the logged-in freelancer
exports.getMyProposals = async (req, res) => {
  try {
    const freelancer_id = req.user.id;

    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select('*, jobs(title, budget, status), proposal_milestones(proposal_milestone_id, title, amount, sequence)')
      .eq('freelancer_id', freelancer_id)
      .order('submitted_at', { ascending: false })
      .order('sequence', { foreignTable: 'proposal_milestones', ascending: true });

    if (error) throw error;

    return res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/jobs/:id/proposals - Get all proposals for a job (client-only, must own the job)
exports.getProposalsForJob = async (req, res) => {
  try {
    const { id: job_id } = req.params;
    const client_id = req.user.id;

    // Reviewing proposals is a client-mode action. Freelancers must switch modes first.
    if (req.user.active_role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Switch to Client mode to view proposals on your job.'
      });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, client_id, title, budget, status')
      .eq('job_id', job_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (job.client_id !== client_id) {
      return res.status(403).json({ success: false, error: 'You do not own this job posting' });
    }

    // Withdrawn proposals are hidden from the client's view entirely — from
    // their perspective a withdrawn proposal simply isn't there anymore.
    const { data: proposals, error } = await supabaseAdmin
      .from('proposals')
      .select(`
        *,
        users!proposals_freelancer_id_fkey(first_name, last_name, email, bio, skills, portfolio_url),
        proposal_milestones(proposal_milestone_id, title, amount, sequence)
      `)
      .eq('job_id', job_id)
      .neq('status', 'withdrawn')
      .order('submitted_at', { ascending: false })
      .order('sequence', { foreignTable: 'proposal_milestones', ascending: true });

    if (error) throw error;

    // Attach each bidder's average freelancer rating so the client can compare them.
    const ratings = await getRatingSummaries((proposals || []).map((p) => p.freelancer_id), 'freelancer');
    const proposalsWithRatings = (proposals || []).map((p) => ({
      ...p,
      freelancer_rating: ratings[p.freelancer_id] || emptySummary('freelancer'),
    }));

    return res.status(200).json({ success: true, data: { job, proposals: proposalsWithRatings } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/proposals/:id/accept - Accept a proposal (client-only, must own the job).
// Atomically accepts proposal, auto-rejects other pending proposals on the job,
// moves the job to 'assigned', and creates an active contract in public.contracts via PostgreSQL RPC.
exports.acceptProposal = async (req, res) => {
  try {
    const { id: proposal_id } = req.params;
    const client_id = req.user.id;

    // Accepting a proposal is a client-mode action. Freelancers must switch modes first.
    if (req.user.active_role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Switch to Client mode to accept proposals.'
      });
    }

    const { data: contract, error: rpcError } = await supabaseAdmin.rpc(
      'accept_proposal_and_create_contract',
      {
        p_proposal_id: proposal_id,
        p_client_id: client_id,
      }
    );

    if (rpcError) {
      const msg = rpcError.message || 'Failed to accept proposal';
      if (msg.includes('Proposal not found') || msg.includes('Job not found')) {
        return res.status(404).json({ success: false, error: msg });
      }
      if (msg.includes('Unauthorized')) {
        return res.status(403).json({ success: false, error: msg });
      }
      if (msg.includes('already') || msg.includes('no longer open')) {
        return res.status(409).json({ success: false, error: msg });
      }
      return res.status(500).json({ success: false, error: msg });
    }

    // Auto-create the chat for this new contract. Best-effort: a failure here must
    // never undo the already-committed contract/proposal acceptance. If a freelancer
    // has multiple accepted jobs from the same client, each contract gets its own
    // conversation (conversations.contract_id is unique per contract).
    try {
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('title')
        .eq('job_id', contract.job_id)
        .single();

      await supabaseAdmin.from('conversations').insert([
        {
          contract_id: contract.contract_id,
          client_id: contract.client_id,
          freelancer_id: contract.freelancer_id,
          title: job?.title || 'Job Chat',
        },
      ]);
    } catch (chatError) {
      console.error('Failed to auto-create conversation for contract', contract.contract_id, chatError);
    }

    // Lock in the milestone breakdown, if the accepted proposal had one. The RPC
    // itself doesn't know about milestones (it only writes contracts), so this
    // copies proposal_milestones -> milestones the same best-effort way the
    // conversation above is created. The first stage starts 'active'; the rest
    // wait their turn (sequential — see milestonesController.js).
    try {
      const { data: proposalMilestones } = await supabaseAdmin
        .from('proposal_milestones')
        .select('title, amount, sequence')
        .eq('proposal_id', proposal_id)
        .order('sequence', { ascending: true });

      if (proposalMilestones && proposalMilestones.length > 0) {
        await supabaseAdmin.from('milestones').insert(
          proposalMilestones.map((m) => ({
            contract_id: contract.contract_id,
            title: m.title,
            amount: m.amount,
            sequence: m.sequence,
            status: m.sequence === 1 ? 'active' : 'pending',
          }))
        );
      }
    } catch (milestoneError) {
      console.error('Failed to copy milestones for contract', contract.contract_id, milestoneError);
    }

    return res.status(200).json({
      success: true,
      message: 'Proposal accepted and contract initiated.',
      data: contract,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/proposals/:id/reject - Reject a single proposal (client-only, must own the job)
exports.rejectProposal = async (req, res) => {
  try {
    const { id: proposal_id } = req.params;
    const client_id = req.user.id;

    // Rejecting a proposal is a client-mode action. Freelancers must switch modes first.
    if (req.user.active_role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Switch to Client mode to reject proposals.'
      });
    }

    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('*, jobs(job_id, client_id)')
      .eq('proposal_id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    if (proposal.jobs.client_id !== client_id) {
      return res.status(403).json({ success: false, error: 'You do not own the job for this proposal' });
    }
    if (proposal.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'This proposal has already been decided' });
    }

    const { data: rejected, error } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('proposal_id', proposal_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: rejected });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/proposals/:id/withdraw - Withdraw a pending proposal (freelancer-only, must own it).
// Withdrawn proposals are hidden from the client's proposal list but kept on record so the
// freelancer can restore (unwithdraw) them later instead of losing the cover letter/bid.
exports.withdrawProposal = async (req, res) => {
  try {
    const { id: proposal_id } = req.params;
    const freelancer_id = req.user.id;

    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id, freelancer_id, status')
      .eq('proposal_id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    if (proposal.freelancer_id !== freelancer_id) {
      return res.status(403).json({ success: false, error: 'You do not own this proposal' });
    }
    if (proposal.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: `Cannot withdraw a proposal that is already ${proposal.status}.`,
      });
    }

    const { data: withdrawn, error } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'withdrawn' })
      .eq('proposal_id', proposal_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: withdrawn });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/proposals/:id/unwithdraw - Restore a withdrawn proposal back to 'pending'
// (freelancer-only, must own it). Optionally accepts a new bid_amount and/or cover_letter,
// letting the freelancer revise their proposal as part of resubmitting it. Blocked if the
// job is no longer open (e.g. it was assigned to someone else while withdrawn).
exports.unwithdrawProposal = async (req, res) => {
  try {
    const { id: proposal_id } = req.params;
    const freelancer_id = req.user.id;
    const { bid_amount, cover_letter } = req.body || {};

    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id, freelancer_id, status, jobs(job_id, status)')
      .eq('proposal_id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }
    if (proposal.freelancer_id !== freelancer_id) {
      return res.status(403).json({ success: false, error: 'You do not own this proposal' });
    }
    if (proposal.status !== 'withdrawn') {
      return res.status(409).json({
        success: false,
        error: `Cannot unwithdraw a proposal that is ${proposal.status}.`,
      });
    }
    if (!proposal.jobs || proposal.jobs.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: 'This job is no longer open, so this proposal can no longer be restored.',
      });
    }

    const updates = { status: 'pending' };

    if (bid_amount !== undefined) {
      const amount = Number(bid_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Bid amount must be greater than 0.' });
      }
      updates.bid_amount = amount;
    }

    if (cover_letter !== undefined) {
      if (!String(cover_letter).trim()) {
        return res.status(400).json({ success: false, error: 'Cover letter cannot be empty.' });
      }
      updates.cover_letter = cover_letter.trim();
    }

    const { data: restored, error } = await supabaseAdmin
      .from('proposals')
      .update(updates)
      .eq('proposal_id', proposal_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: restored });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

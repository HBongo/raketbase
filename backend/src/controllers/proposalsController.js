const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { logActivity } = require('../utils/activity');
const { getRatingSummaries, emptySummary } = require('../utils/ratings');
const { validateProposalInput } = require('../utils/slopFilter');
const { notify, displayName } = require('../utils/notify');
const { logActivity: logAuditActivity } = require('../utils/activityLogger');

function formatProposal(proposal) {
  if (!proposal) return proposal;
  let coverLetter = proposal.cover_letter || '';
  let portfolioLink = proposal.portfolio_link || null;
  let attachmentUrl = proposal.attachment_url || null;
  let attachmentName = proposal.attachment_name || null;

  const portMatch = coverLetter.match(/\[Portfolio:\s*([^\]]+)\]/);
  if (portMatch) {
    if (!portfolioLink) portfolioLink = portMatch[1].trim();
    coverLetter = coverLetter.replace(portMatch[0], '').trim();
  }
  const attachMatch = coverLetter.match(/\[Attachment:\s*([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
  if (attachMatch) {
    if (!attachmentName) attachmentName = attachMatch[1].trim();
    if (!attachmentUrl) attachmentUrl = attachMatch[2].trim();
    coverLetter = coverLetter.replace(attachMatch[0], '').trim();
  }

  return {
    ...proposal,
    cover_letter: coverLetter,
    portfolio_link: portfolioLink,
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
  };
}

const { hasPayout, PAYOUT_REQUIRED_MESSAGE } = require('../utils/payout');
const { hasPaymentMethod, PAYMENT_METHOD_REQUIRED_MESSAGE } = require('../utils/paymentMethod');

// Proposal attachments live in a private bucket; see migration 014
const PROPOSAL_BUCKET = 'proposal-attachments';

function safeFileName(name) {
  return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
}

// Adds each proposal's attachments as proposal.files. Skipped quietly (no files listed)
// if the table can't be read, e.g. before migration 014, so the pages keep working.
async function attachFiles(proposals) {
  const list = proposals || [];
  const ids = list.map((p) => p.proposal_id);
  const byProposal = {};
  if (ids.length) {
    const { data, error } = await supabaseAdmin
      .from('proposal_files')
      .select('file_id, proposal_id, file_name, file_size, file_mime_type')
      .in('proposal_id', ids)
      .order('created_at', { ascending: true });
    if (!error) for (const f of data || []) (byProposal[f.proposal_id] = byProposal[f.proposal_id] || []).push(f);
  }
  return list.map((p) => ({ ...p, files: byProposal[p.proposal_id] || [] }));
}

// POST /api/v1/proposals - Submit a proposal for a job
// Sent as JSON, or as multipart/form-data when files are attached (up to 3, 10 MB each,
// in the "files" field; milestones then arrive as a JSON string).
// For a 'milestone' budget_type job, `milestones` (an array of { title, amount })
// replaces `bid_amount`: the total bid is derived server-side as the sum of the
// stages, so the two numbers can never drift apart. Fixed-price jobs are unchanged.
exports.createProposal = async (req, res) => {
  try {
    const { job_id, bid_amount, cover_letter, portfolio_link } = req.body;
    let { milestones } = req.body;
    if (typeof milestones === 'string') {
      try {
        milestones = JSON.parse(milestones);
      } catch {
        return res.status(400).json({ success: false, error: 'Could not read the milestone breakdown.' });
      }
    }
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

    // An accepted bid becomes a contract, so there must be somewhere to pay the freelancer
    if (!(await hasPayout(freelancer_id))) {
      return res.status(409).json({ success: false, code: 'PAYOUT_REQUIRED', error: PAYOUT_REQUIRED_MESSAGE });
    }

    // Nobody may bid on a job they posted themselves, regardless of mode.
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, client_id, status, budget_type, title')
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
      const closedReasons = {
        paused: 'The client has paused this job, so it is not accepting proposals right now.',
        cancelled: 'The client has cancelled this job.',
        removed: 'This job was removed by an admin.',
      };
      return res.status(409).json({
        success: false,
        error: closedReasons[job.status] || 'This job has been taken and is no longer accepting proposals.'
      });
    }

    const isMilestoneJob = job.budget_type === 'milestone';

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

    let attachmentUrl = null;
    let attachmentName = null;
    if (req.file) {
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${job_id}/${freelancer_id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('proposal-attachments')
        .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
      if (uploadError) {
        console.error('Proposal attachment upload error:', uploadError.message);
      } else {
        const { data: pubData } = supabaseAdmin.storage.from('proposal-attachments').getPublicUrl(filePath);
        attachmentUrl = pubData?.publicUrl;
        attachmentName = req.file.originalname;
      }
    }

    let finalCoverLetter = cover_letter;
    const metaTags = [];
    if (portfolio_link && typeof portfolio_link === 'string' && portfolio_link.trim()) {
      metaTags.push(`[Portfolio: ${portfolio_link.trim()}]`);
    }
    if (attachmentUrl) {
      metaTags.push(`[Attachment: ${attachmentName || 'Sample Work'}](${attachmentUrl})`);
    }
    if (metaTags.length > 0) {
      finalCoverLetter = `${finalCoverLetter.trim()}\n\n${metaTags.join('\n')}`;
    }

    const { data: proposal, error } = await supabaseAdmin
      .from('proposals')
      .insert([
        {
          job_id,
          freelancer_id,
          bid_amount: finalBidAmount,
          cover_letter: finalCoverLetter,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Best-effort populate dedicated columns if they exist
    if (attachmentUrl || portfolio_link) {
      try {
        await supabaseAdmin
          .from('proposals')
          .update({
            ...(attachmentUrl ? { attachment_url: attachmentUrl, attachment_name: attachmentName } : {}),
            ...(portfolio_link ? { portfolio_link: portfolio_link.trim() } : {}),
          })
          .eq('proposal_id', proposal.proposal_id);
      } catch {
        // Safe to ignore if columns not migrated yet
      }
    }

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

    // Attachments. If any upload fails, remove the proposal and what was uploaded so the
    // freelancer can simply try again.
    const files = req.files || [];
    const uploadedPaths = [];
    try {
      for (const file of files) {
        const filePath = `${proposal.proposal_id}/${crypto.randomUUID()}-${safeFileName(file.originalname)}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(PROPOSAL_BUCKET)
          .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(filePath);
        const { error: fileRowError } = await supabaseAdmin.from('proposal_files').insert([{
          proposal_id: proposal.proposal_id,
          file_name: file.originalname,
          file_path: filePath,
          file_size: file.size,
          file_mime_type: file.mimetype,
        }]);
        if (fileRowError) throw fileRowError;
      }
    } catch (uploadErr) {
      if (uploadedPaths.length) await supabaseAdmin.storage.from(PROPOSAL_BUCKET).remove(uploadedPaths);
      await supabaseAdmin.from('proposals').delete().eq('proposal_id', proposal.proposal_id);
      console.error('Proposal attachment upload failed:', uploadErr.message);
      return res.status(500).json({
        success: false,
        error: 'Could not upload your files, so the proposal wasn\'t sent. Please try again (make sure migration 014 has been run).',
      });
    }

    await notify({
      user_id: job.client_id,
      type: 'proposal_received',
      role: 'customer',
      title: `New proposal on "${job.title}"`,
      body: `${displayName(req.user, 'A freelancer')} sent a proposal.`,
      link: `/my-jobs/${job.job_id}`,
    });

    logAuditActivity({
      userId: freelancer_id,
      action: 'SUBMIT_PROPOSAL',
      details: { job_id, title: job.title, bid_amount: finalBidAmount },
      ip: req.ip || req.headers['x-forwarded-for'] || null,
    }).catch(() => {});

    await logActivity({
      user_id: freelancer_id,
      category: 'jobs',
      action: 'proposal.sent',
      description: `Sent a proposal for "${job.title}"`,
      target_type: 'proposal',
      target_id: proposal.proposal_id,
      link: '/my-proposals',
    });

    return res.status(201).json({ success: true, data: formatProposal(proposal) });
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

    const formatted = (proposals || []).map(formatProposal);
    return res.status(200).json({ success: true, data: await attachFiles(formatted) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/proposals/:id/files/:fileId/download - A short-lived link to one attachment.
// Only the freelancer who sent the proposal and the client who posted the job can open it.
exports.getProposalFileUrl = async (req, res) => {
  try {
    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('proposal_id, freelancer_id, jobs(client_id)')
      .eq('proposal_id', req.params.id)
      .maybeSingle();
    if (!proposal) return res.status(404).json({ success: false, error: 'Proposal not found' });
    if (proposal.freelancer_id !== req.user.id && proposal.jobs?.client_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can\'t open files on this proposal' });
    }

    const { data: file } = await supabaseAdmin
      .from('proposal_files')
      .select('file_name, file_path')
      .eq('file_id', req.params.fileId)
      .eq('proposal_id', proposal.proposal_id)
      .maybeSingle();
    if (!file) return res.status(404).json({ success: false, error: 'File not found' });

    const { data, error } = await supabaseAdmin.storage
      .from(PROPOSAL_BUCKET)
      .createSignedUrl(file.file_path, 3600, { download: file.file_name });
    if (error) throw error;

    return res.status(200).json({ success: true, data: { url: data.signedUrl, file_name: file.file_name } });
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
      .select('*')
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
    // The accepted freelancer's contract chat, so the client can message them from here.
    const accepted = (proposals || []).find((p) => p.status === 'accepted');
    let acceptedConversationId = null;
    if (accepted) {
      const { data: contract } = await supabaseAdmin
        .from('contracts')
        .select('contract_id')
        .eq('job_id', job.job_id)
        .eq('freelancer_id', accepted.freelancer_id)
        .maybeSingle();

      if (contract?.contract_id) {
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('conversation_id')
          .eq('contract_id', contract.contract_id)
          .maybeSingle();
        acceptedConversationId = conv?.conversation_id || null;
      }
    }

    const proposalsWithRatings = (proposals || []).map((p) => {
      const formatted = formatProposal(p);
      return {
        ...formatted,
        freelancer_rating: ratings[p.freelancer_id] || emptySummary('freelancer'),
        conversation_id: p.status === 'accepted' ? acceptedConversationId : null,
      };
    });

    return res.status(200).json({ success: true, data: { job, proposals: await attachFiles(proposalsWithRatings) } });
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

    // Accepting puts the agreed amount in escrow, so the client needs a way to pay
    if (!(await hasPaymentMethod(client_id))) {
      return res.status(409).json({ success: false, code: 'PAYMENT_METHOD_REQUIRED', error: PAYMENT_METHOD_REQUIRED_MESSAGE });
    }

    // The RPC rejects every other pending proposal on the job, so note who those
    // freelancers are first to let them know they weren't selected.
    const { data: acceptedProposal } = await supabaseAdmin
      .from('proposals')
      .select('job_id, freelancer_id, jobs(title)')
      .eq('proposal_id', proposal_id)
      .maybeSingle();
    const { data: otherPending } = acceptedProposal
      ? await supabaseAdmin
          .from('proposals')
          .select('freelancer_id')
          .eq('job_id', acceptedProposal.job_id)
          .eq('status', 'pending')
          .neq('proposal_id', proposal_id)
      : { data: [] };

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

    logActivity({
      userId: client_id,
      action: 'ACCEPT_PROPOSAL',
      details: { proposal_id, contract_id: contract?.contract_id, freelancer_id: contract?.freelancer_id },
      ip: req.ip || req.headers['x-forwarded-for'] || null,
    }).catch(() => {});

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

    const jobTitle = acceptedProposal?.jobs?.title || 'a job';
    await notify([
      {
        user_id: contract.freelancer_id,
        type: 'proposal_accepted',
        role: 'freelancer',
        title: `Your proposal for "${jobTitle}" was accepted!`,
        body: 'A contract has been created. You can start working and chat with the client.',
        link: '/dashboard',
      },
      ...(otherPending || []).map((p) => ({
        user_id: p.freelancer_id,
        type: 'proposal_rejected',
        role: 'freelancer',
        title: `"${jobTitle}" went to another freelancer`,
        body: 'The client accepted a different proposal for this job.',
        link: '/my-proposals',
      })),
    ]);

    await logActivity([
      {
        user_id: client_id,
        category: 'contracts',
        action: 'proposal.accepted',
        description: `Accepted a proposal for "${jobTitle}" — contract started and payment held in escrow`,
        target_type: 'contract',
        target_id: contract?.contract_id,
        link: '/dashboard',
      },
      ...(acceptedProposal?.freelancer_id ? [{
        user_id: acceptedProposal.freelancer_id,
        category: 'contracts',
        action: 'contract.started',
        description: `Your proposal for "${jobTitle}" was accepted — contract started`,
        target_type: 'contract',
        target_id: contract?.contract_id,
        link: '/dashboard',
      }] : []),
    ]);

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
      .select('*, jobs(job_id, client_id, title)')
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

    await notify({
      user_id: proposal.freelancer_id,
      type: 'proposal_rejected',
      role: 'freelancer',
      title: `Your proposal for "${proposal.jobs.title}" was declined`,
      body: 'The client decided not to move forward with your proposal.',
      link: '/my-proposals',
    });

    await logActivity({
      user_id: req.user.id,
      category: 'jobs',
      action: 'proposal.declined',
      description: `Declined a proposal for "${proposal.jobs.title}"`,
      target_type: 'proposal',
      target_id: proposal.proposal_id,
      link: `/my-jobs/${proposal.jobs.job_id}`,
    });

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
      .select('proposal_id, freelancer_id, status, jobs(title)')
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

    await logActivity({
      user_id: freelancer_id,
      category: 'jobs',
      action: 'proposal.withdrawn',
      description: `Withdrew a proposal for "${proposal.jobs?.title || 'a job'}"`,
      target_type: 'proposal',
      target_id: proposal.proposal_id,
      link: '/my-proposals',
    });

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
      .select('proposal_id, freelancer_id, status, jobs(job_id, status, title)')
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

    await logActivity({
      user_id: freelancer_id,
      category: 'jobs',
      action: 'proposal.restored',
      description: `Re-submitted a proposal for "${proposal.jobs?.title || 'a job'}"`,
      target_type: 'proposal',
      target_id: proposal.proposal_id,
      link: '/my-proposals',
    });

    return res.status(200).json({ success: true, data: restored });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};



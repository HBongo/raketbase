const { supabaseAdmin } = require('../config/supabase');
const { logActivity } = require('../utils/activity');
const { postSystemMessage } = require('./contractsController');
const { notify, displayName } = require('../utils/notify');

// POST /api/v1/disputes - File a dispute against a contract (must be a participant)
exports.createDispute = async (req, res) => {
  try {
    const { contract_id, reason_category, evidence_summary } = req.body;
    const userId = req.user.id;

    if (!contract_id) {
      return res.status(400).json({ success: false, error: 'contract_id is required' });
    }

    const validCategories = ['Incomplete Work', 'Non-Payment', 'Unresponsive', 'Others'];
    const isOthers = typeof reason_category === 'string' && (reason_category === 'Others' || reason_category.startsWith('Others:'));
    if (!reason_category || (!validCategories.includes(reason_category) && !isOthers)) {
      return res.status(400).json({
        success: false,
        error: `reason_category must be one of: ${validCategories.join(', ')}`,
      });
    }

    if (!evidence_summary || evidence_summary.trim().length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Evidence summary must be at least 30 characters',
      });
    }

    // Confirm the contract exists and the caller is actually a participant
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, client_id, freelancer_id, status, jobs(title)')
      .eq('contract_id', contract_id)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this contract' });
    }

    // Only work that's still in progress can be disputed; finished or already-disputed
    // contracts can't be reopened this way.
    if (!['active', 'submitted'].includes(contract.status)) {
      return res.status(409).json({
        success: false,
        error: contract.status === 'disputed'
          ? 'This contract already has an open dispute.'
          : `Disputes can only be filed on contracts that are in progress (this one is '${contract.status}').`,
      });
    }

    // Fold category + evidence into the single `reason` column until schema adds a
    // dedicated evidence_summary field.
    const reason = `[${reason_category}] ${evidence_summary.trim()}`;

    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .insert([
        {
          contract_id,
          raised_by_id: userId,
          reason,
          status: 'open',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Optionally reflect the dispute on the contract itself
    await supabaseAdmin
      .from('contracts')
      .update({ status: 'disputed' })
      .eq('contract_id', contract_id);

    // Tell the other side of the contract that a dispute was filed.
    const filedByClient = contract.client_id === userId;
    await notify({
      user_id: filedByClient ? contract.freelancer_id : contract.client_id,
      type: 'dispute_filed',
      role: filedByClient ? 'freelancer' : 'customer',
      title: `A dispute was filed on "${contract.jobs?.title || 'your contract'}"`,
      body: `${displayName(req.user, filedByClient ? 'The client' : 'The freelancer')} raised a ${reason_category} dispute. RaketBase staff will review it.`,
      link: '/dashboard',
    });

    await logActivity({
      user_id: req.user.id,
      category: 'contracts',
      action: 'dispute.filed',
      description: `Filed a dispute on "${contract.jobs?.title || 'a contract'}"`,
      target_type: 'dispute',
      target_id: dispute.dispute_id,
      link: `/contracts/${contract.contract_id}/dispute`,
    });

    return res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/disputes/:id - View a single dispute (participant or admin only)
exports.getDisputeById = async (req, res) => {
  try {
    const { id: dispute_id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const { data: dispute, error } = await supabaseAdmin
      .from('disputes')
      .select(`
        dispute_id,
        contract_id,
        raised_by_id,
        handled_by_staff_id,
        reason,
        resolution_notes,
        status,
        created_at,
        contracts (
          contract_id,
          client_id,
          freelancer_id,
          agreed_amount,
          status,
          jobs ( title )
        ),
        raised_by:users!disputes_raised_by_id_fkey ( user_id, first_name, last_name, email )
      `)
      .eq('dispute_id', dispute_id)
      .single();

    if (error || !dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    const isParticipant =
      dispute.contracts?.client_id === userId || dispute.contracts?.freelancer_id === userId;

    if (!isAdmin && !isParticipant) {
      return res.status(403).json({ success: false, error: 'You do not have access to this dispute' });
    }

    return res.status(200).json({ success: true, data: dispute });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/disputes - List disputes (admin: all disputes; non-admin: only their own)
exports.listDisputes = async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query = supabaseAdmin
      .from('disputes')
      .select(`
        dispute_id,
        contract_id,
        raised_by_id,
        status,
        reason,
        resolution_notes,
        created_at,
        contracts ( job_id, client_id, freelancer_id, agreed_amount, jobs ( title ), conversations ( conversation_id ) )
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('raised_by_id', userId);
    }

    const { data: disputes, error } = await query;

    if (error) throw error;

    return res.status(200).json({ success: true, data: disputes || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/disputes/:id/resolve - Admin resolves a dispute (refund / release / split)
exports.resolveDispute = async (req, res) => {
  try {
    const { id: dispute_id } = req.params;
    const { resolution, notes } = req.body; // resolution: 'refund_client' | 'release_freelancer' | 'split'
    const staffId = req.user.id;

    const validResolutions = ['refund_client', 'release_freelancer', 'split'];
    if (!resolution || !validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: `resolution must be one of: ${validResolutions.join(', ')}`,
      });
    }

    const { data: dispute, error: fetchError } = await supabaseAdmin
      .from('disputes')
      .select('dispute_id, contract_id, status, contracts(client_id, freelancer_id, job_id, agreed_amount, jobs(title))')
      .eq('dispute_id', dispute_id)
      .single();

    if (fetchError || !dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    if (dispute.status === 'resolved') {
      return res.status(409).json({ success: false, error: 'This dispute has already been resolved' });
    }

    const resolutionLabels = {
      refund_client: 'Refunded to client',
      release_freelancer: 'Released to freelancer',
      split: 'Funds split between client and freelancer',
    };
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (trimmedNotes.length > 500) {
      return res.status(400).json({ success: false, error: 'Resolution notes must be 500 characters or less.' });
    }
    const resolutionNotes = `${resolutionLabels[resolution]}${trimmedNotes ? ` — ${trimmedNotes}` : ''}`;

    // Apply the outcome to the contract and job first, so a failure (e.g. migration 009
    // not run yet) leaves the dispute open instead of half-resolved.
    //   release -> completed, full amount        job completed
    //   split   -> completed, half released      job completed
    //   refund  -> refunded, nothing released    job cancelled
    if (dispute.contract_id && dispute.contracts) {
      const agreed = Number(dispute.contracts.agreed_amount) || 0;
      const outcome = {
        release_freelancer: { contract: { status: 'completed', released_amount: null }, job: 'completed' },
        split: { contract: { status: 'completed', released_amount: Math.round((agreed / 2) * 100) / 100 }, job: 'completed' },
        refund_client: { contract: { status: 'refunded', released_amount: 0 }, job: 'cancelled' },
      }[resolution];

      const { error: contractError } = await supabaseAdmin
        .from('contracts')
        .update(outcome.contract)
        .eq('contract_id', dispute.contract_id);
      if (contractError) {
        console.error('Dispute outcome could not be applied to the contract:', contractError.message);
        return res.status(500).json({
          success: false,
          error: 'Could not update the contract for this outcome. Make sure migration 009 has been run, then try again.',
        });
      }

      if (dispute.contracts.job_id) {
        await supabaseAdmin.from('jobs').update({ status: outcome.job }).eq('job_id', dispute.contracts.job_id);
      }
    }

    const { data: updatedDispute, error: updateError } = await supabaseAdmin
      .from('disputes')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        handled_by_staff_id: staffId,
      })
      .eq('dispute_id', dispute_id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (dispute.contract_id) {
      // Let both parties know the outcome in their contract chat.
      await postSystemMessage(dispute.contract_id, staffId, `Dispute resolved by admin: ${resolutionNotes}`);

      const parties = dispute.contracts;
      if (parties) {
        const title = `Dispute resolved on "${parties.jobs?.title || 'your contract'}" — you can now rate each other`;
        await notify([
          { user_id: parties.client_id, type: 'dispute_resolved', role: 'customer', title, body: resolutionNotes, link: '/dashboard' },
          { user_id: parties.freelancer_id, type: 'dispute_resolved', role: 'freelancer', title, body: resolutionNotes, link: '/dashboard' },
        ]);
      }
    }

    await logActivity({
      user_id: staffId,
      category: 'admin',
      action: 'dispute.resolved',
      description: `Resolved a dispute on "${dispute.contracts?.jobs?.title || 'a contract'}": ${resolutionNotes}`,
      target_type: 'dispute',
      target_id: dispute_id,
      link: '/admin',
      metadata: { resolution },
    });

    return res.status(200).json({ success: true, data: updatedDispute });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const { supabaseAdmin } = require('../config/supabase');
const { notify } = require('../utils/notify');

async function loadContract(contract_id) {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('contract_id, job_id, client_id, freelancer_id, status, jobs(title)')
    .eq('contract_id', contract_id)
    .single();
  if (error || !data) return null;
  return data;
}

// Best-effort: posts a system message into the contract's conversation. A failure
// here must never fail the milestone action itself (mirrors the conversation/
// milestone-copy hooks in proposalsController.acceptProposal).
async function postSystemMessage(contract_id, sender_id, content) {
  try {
    let { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('conversation_id')
      .eq('contract_id', contract_id)
      .maybeSingle();

    if (!conversation) {
      const { data: contract } = await supabaseAdmin
        .from('contracts')
        .select('contract_id, client_id, freelancer_id, jobs(title)')
        .eq('contract_id', contract_id)
        .single();
      if (contract) {
        const { data: newConv } = await supabaseAdmin
          .from('conversations')
          .insert([
            {
              contract_id,
              client_id: contract.client_id,
              freelancer_id: contract.freelancer_id,
              title: contract.jobs?.title || 'Contract Chat',
            },
          ])
          .select('conversation_id')
          .single();
        conversation = newConv;
      }
    }

    if (!conversation) return;
    await supabaseAdmin.from('messages').insert([
      {
        conversation_id: conversation.conversation_id,
        sender_id,
        content,
        message_type: 'system',
      },
    ]);
  } catch (err) {
    console.error('Failed to post system message for contract', contract_id, err);
  }
}

// GET /api/v1/contracts/:id/milestones
exports.listMilestones = async (req, res) => {
  try {
    const { id: contract_id } = req.params;
    const userId = req.user.id;

    const contract = await loadContract(contract_id);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });

    const isParticipant = contract.client_id === userId || contract.freelancer_id === userId;
    const isStaffOrAdmin = req.user.role === 'staff' || req.user.role === 'admin';
    if (!isParticipant && !isStaffOrAdmin) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this contract' });
    }

    let { data: milestones, error } = await supabaseAdmin
      .from('milestones')
      .select('milestone_id, contract_id, title, amount, sequence, status, created_at, submitted_at, completed_at, deliverable_url, deliverable_notes')
      .eq('contract_id', contract_id)
      .order('sequence', { ascending: true });

    // Defensive fallback if migration 002 has not been run yet
    if (error && error.message && error.message.includes('deliverable_url does not exist')) {
      const fallback = await supabaseAdmin
        .from('milestones')
        .select('milestone_id, contract_id, title, amount, sequence, status, created_at, submitted_at, completed_at')
        .eq('contract_id', contract_id)
        .order('sequence', { ascending: true });
      milestones = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return res.status(200).json({ success: true, data: milestones || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/contracts/:id/milestones/:milestoneId/submit
// Freelancer submits the current 'active' milestone for review. Milestones are
// sequential, so only the one milestone whose turn it is can ever be 'active'.
exports.submitMilestone = async (req, res) => {
  try {
    const { id: contract_id, milestoneId } = req.params;
    const userId = req.user.id;
    const deliverable_url = (req.body.deliverable_url || '').trim();
    const deliverable_notes = (req.body.deliverable_notes || '').trim();

    const contract = await loadContract(contract_id);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });
    if (contract.freelancer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the assigned freelancer can submit milestone work' });
    }

    // Auto-align active role if user is in customer mode
    if (req.user.active_role !== 'freelancer') {
      await supabaseAdmin.from('users').update({ active_role: 'freelancer' }).eq('user_id', userId);
      req.user.active_role = 'freelancer';
    }

    if (!deliverable_url) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a deliverable link (Google Drive, GitHub, Figma, etc.).',
      });
    }

    if (!/^https?:\/\//i.test(deliverable_url)) {
      return res.status(400).json({
        success: false,
        error: 'Deliverable link must start with http:// or https://',
      });
    }
    if (contract.status !== 'active') {
      return res.status(409).json({ success: false, error: `Cannot submit work on a contract that is currently '${contract.status}'` });
    }

    const { data: milestone, error: fetchError } = await supabaseAdmin
      .from('milestones')
      .select('milestone_id, contract_id, title, status')
      .eq('milestone_id', milestoneId)
      .eq('contract_id', contract_id)
      .single();

    if (fetchError || !milestone) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (milestone.status !== 'active') {
      return res.status(409).json({
        success: false,
        error: `This milestone is '${milestone.status}' — only the current milestone can be submitted.`,
      });
    }

    const updatePayload = {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      deliverable_url,
      deliverable_notes: deliverable_notes || null,
    };

    let { data: updated, error: updateError } = await supabaseAdmin
      .from('milestones')
      .update(updatePayload)
      .eq('milestone_id', milestoneId)
      .select()
      .single();

    // Fallback if migration 002 has not been run yet
    if (updateError && updateError.message && updateError.message.includes('deliverable_url does not exist')) {
      const fallback = await supabaseAdmin
        .from('milestones')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('milestone_id', milestoneId)
        .select()
        .single();
      updated = fallback.data;
      updateError = fallback.error;
    }

    if (updateError) throw updateError;

    await postSystemMessage(
      contract_id,
      userId,
      `Milestone "${milestone.title}" was submitted for review: ${deliverable_url}${deliverable_notes ? ` — "${deliverable_notes}"` : ''}`
    );

    await notify({
      user_id: contract.client_id,
      type: 'milestone_submitted',
      role: 'customer',
      title: `Stage "${milestone.title}" submitted on "${contract.jobs?.title || 'your contract'}"`,
      body: 'Review this stage and release its payment when you are satisfied.',
      link: '/dashboard',
    });

    return res.status(200).json({
      success: true,
      message: 'Milestone submitted for client review.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/contracts/:id/milestones/:milestoneId/approve
// Client approves a 'submitted' milestone, releasing that stage's escrow amount.
// If it was the last milestone, the whole contract (and job) completes; otherwise
// the next milestone in sequence becomes 'active'.
exports.approveMilestone = async (req, res) => {
  try {
    const { id: contract_id, milestoneId } = req.params;
    const userId = req.user.id;

    const contract = await loadContract(contract_id);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });
    if (contract.client_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the client can approve deliverables and release funds' });
    }

    // Auto-align active role if user is in freelancer mode
    if (req.user.active_role !== 'customer') {
      await supabaseAdmin.from('users').update({ active_role: 'customer' }).eq('user_id', userId);
      req.user.active_role = 'customer';
    }
    if (contract.status !== 'active') {
      return res.status(409).json({ success: false, error: `Cannot approve work on a contract that is currently '${contract.status}'` });
    }

    const { data: milestone, error: fetchError } = await supabaseAdmin
      .from('milestones')
      .select('milestone_id, contract_id, title, amount, sequence, status')
      .eq('milestone_id', milestoneId)
      .eq('contract_id', contract_id)
      .single();

    if (fetchError || !milestone) return res.status(404).json({ success: false, error: 'Milestone not found' });
    if (milestone.status !== 'submitted') {
      return res.status(409).json({
        success: false,
        error: `This milestone is '${milestone.status}' — only submitted work can be approved.`,
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('milestones')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('milestone_id', milestoneId)
      .select()
      .single();

    if (updateError) throw updateError;

    await postSystemMessage(
      contract_id,
      userId,
      `Milestone "${milestone.title}" was approved — ₱${Number(milestone.amount).toLocaleString()} released.`
    );

    // Is there a next milestone to activate, or was this the last one?
    const { data: next } = await supabaseAdmin
      .from('milestones')
      .select('milestone_id')
      .eq('contract_id', contract_id)
      .eq('sequence', milestone.sequence + 1)
      .maybeSingle();

    let contractCompleted = false;
    if (next) {
      await supabaseAdmin.from('milestones').update({ status: 'active' }).eq('milestone_id', next.milestone_id);
    } else {
      await supabaseAdmin.from('contracts').update({ status: 'completed' }).eq('contract_id', contract_id);
      if (contract.job_id) {
        await supabaseAdmin.from('jobs').update({ status: 'completed' }).eq('job_id', contract.job_id);
      }
      await postSystemMessage(contract_id, userId, 'All milestones are complete — this contract is now closed.');
      contractCompleted = true;
    }

    await notify({
      user_id: contract.freelancer_id,
      type: 'payment_released',
      role: 'freelancer',
      title: `Stage "${milestone.title}" approved on "${contract.jobs?.title || 'your contract'}"`,
      body: `₱${Number(milestone.amount).toLocaleString()} was released to you.${contractCompleted ? ' All stages are done, so the contract is now complete.' : ' The next stage is now active.'}`,
      link: '/dashboard',
    });

    return res.status(200).json({
      success: true,
      message: `₱${Number(milestone.amount).toLocaleString()} released to freelancer.${contractCompleted ? ' Contract completed!' : ''}`,
      data: { milestone: updated, contract_completed: contractCompleted },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};



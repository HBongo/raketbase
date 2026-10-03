const { supabaseAdmin } = require('../config/supabase');

// Best-effort: posts a system message into the contract's conversation. A failure
// here must never fail the contract action itself.
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

// GET /api/v1/contracts - Get all contracts for the authenticated user (as client or freelancer)
exports.getContracts = async (req, res) => {
  try {
    const userId = req.user.id;

    let { data: contracts, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        contract_id,
        job_id,
        client_id,
        freelancer_id,
        agreed_amount,
        status,
        created_at,
        deliverable_url,
        deliverable_notes,
        submitted_at,
        jobs (
          job_id,
          title,
          description,
          budget,
          status,
          budget_type
        ),
        reviews (
          review_id,
          reviewer_id,
          reviewee_id,
          rating
        ),
        client:users!contracts_client_id_fkey (
          user_id,
          first_name,
          last_name,
          email,
          active_role
        ),
        freelancer:users!contracts_freelancer_id_fkey (
          user_id,
          first_name,
          last_name,
          email,
          active_role,
          bio,
          skills,
          portfolio_url
        ),
        milestones (
          milestone_id,
          title,
          amount,
          sequence,
          status,
          submitted_at,
          completed_at,
          deliverable_url,
          deliverable_notes
        )
      `)
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .order('sequence', { foreignTable: 'milestones', ascending: true });

    // Defensive fallback if migration 002 has not been run yet
    if (error && error.message && error.message.includes('deliverable_url does not exist')) {
      const fallback = await supabaseAdmin
        .from('contracts')
        .select(`
          contract_id,
          job_id,
          client_id,
          freelancer_id,
          agreed_amount,
          status,
          created_at,
          jobs (
            job_id,
            title,
            description,
            budget,
            status,
            budget_type
          ),
          reviews (
            review_id,
            reviewer_id,
            reviewee_id,
            rating
          ),
          client:users!contracts_client_id_fkey (
            user_id,
            first_name,
            last_name,
            email,
            active_role
          ),
          freelancer:users!contracts_freelancer_id_fkey (
            user_id,
            first_name,
            last_name,
            email,
            active_role,
            bio,
            skills,
            portfolio_url
          ),
          milestones (
            milestone_id,
            title,
            amount,
            sequence,
            status,
            submitted_at,
            completed_at
          )
        `)
        .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .order('sequence', { foreignTable: 'milestones', ascending: true });
      contracts = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return res.status(200).json({ success: true, data: contracts || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/contracts/:id - Get a specific contract by ID
exports.getContractById = async (req, res) => {
  try {
    const { id: contract_id } = req.params;
    const userId = req.user.id;

    let { data: contract, error } = await supabaseAdmin
      .from('contracts')
      .select(`
        contract_id,
        job_id,
        client_id,
        freelancer_id,
        agreed_amount,
        status,
        created_at,
        deliverable_url,
        deliverable_notes,
        submitted_at,
        jobs (
          job_id,
          title,
          description,
          budget,
          status,
          budget_type
        ),
        reviews (
          review_id,
          reviewer_id,
          reviewee_id,
          rating
        ),
        client:users!contracts_client_id_fkey (
          user_id,
          first_name,
          last_name,
          email,
          active_role
        ),
        freelancer:users!contracts_freelancer_id_fkey (
          user_id,
          first_name,
          last_name,
          email,
          active_role,
          bio,
          skills,
          portfolio_url
        ),
        milestones (
          milestone_id,
          title,
          amount,
          sequence,
          status,
          submitted_at,
          completed_at,
          deliverable_url,
          deliverable_notes
        )
      `)
      .eq('contract_id', contract_id)
      .order('sequence', { foreignTable: 'milestones', ascending: true })
      .single();

    // Defensive fallback if migration 002 has not been run yet
    if (error && error.message && error.message.includes('deliverable_url does not exist')) {
      const fallback = await supabaseAdmin
        .from('contracts')
        .select(`
          contract_id,
          job_id,
          client_id,
          freelancer_id,
          agreed_amount,
          status,
          created_at,
          jobs (
            job_id,
            title,
            description,
            budget,
            status,
            budget_type
          ),
          reviews (
            review_id,
            reviewer_id,
            reviewee_id,
            rating
          ),
          client:users!contracts_client_id_fkey (
            user_id,
            first_name,
            last_name,
            email,
            active_role
          ),
          freelancer:users!contracts_freelancer_id_fkey (
            user_id,
            first_name,
            last_name,
            email,
            active_role,
            bio,
            skills,
            portfolio_url
          ),
          milestones (
            milestone_id,
            title,
            amount,
            sequence,
            status,
            submitted_at,
            completed_at
          )
        `)
        .eq('contract_id', contract_id)
        .order('sequence', { foreignTable: 'milestones', ascending: true })
        .single();
      contract = fallback.data;
      error = fallback.error;
    }

    if (error || !contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this contract' });
    }

    return res.status(200).json({ success: true, data: contract });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/contracts/:id/submit - Freelancer submits work for client review
exports.submitWork = async (req, res) => {
  try {
    const { id: contract_id } = req.params;
    const userId = req.user.id;
    const deliverable_url = (req.body.deliverable_url || '').trim();
    const deliverable_notes = (req.body.deliverable_notes || '').trim();

    const { data: contract, error: fetchError } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, client_id, freelancer_id, status')
      .eq('contract_id', contract_id)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.freelancer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the assigned freelancer can submit work' });
    }

    // Auto-align active role if caller is in client mode
    if (req.user.active_role !== 'freelancer') {
      await supabaseAdmin.from('users').update({ active_role: 'freelancer' }).eq('user_id', userId);
      req.user.active_role = 'freelancer';
    }

    if (contract.status !== 'active') {
      return res.status(409).json({
        success: false,
        error: `Cannot submit work on a contract that is currently '${contract.status}'`,
      });
    }

    const { data: milestoneCheck } = await supabaseAdmin
      .from('milestones')
      .select('milestone_id')
      .eq('contract_id', contract_id)
      .limit(1);
    if (milestoneCheck && milestoneCheck.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This contract uses milestones — submit each stage individually instead.',
      });
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

    const updatePayload = {
      status: 'submitted',
      deliverable_url,
      deliverable_notes: deliverable_notes || null,
      submitted_at: new Date().toISOString(),
    };

    let { data: updated, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update(updatePayload)
      .eq('contract_id', contract_id)
      .select()
      .single();

    // Fallback if migration 002 has not been run yet
    if (updateError && updateError.message && updateError.message.includes('deliverable_url does not exist')) {
      const fallback = await supabaseAdmin
        .from('contracts')
        .update({ status: 'submitted' })
        .eq('contract_id', contract_id)
        .select()
        .single();
      updated = fallback.data;
      updateError = fallback.error;
    }

    if (updateError) throw updateError;

    // Post notification into the contract's chat thread
    await postSystemMessage(
      contract_id,
      userId,
      `Work was submitted for review: ${deliverable_url}${deliverable_notes ? ` — "${deliverable_notes}"` : ''}`
    );

    return res.status(200).json({
      success: true,
      message: 'Work successfully submitted for client review and escrow release.',
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/contracts/:id/complete - Client approves work and releases escrow funds
exports.completeContract = async (req, res) => {
  try {
    const { id: contract_id } = req.params;
    const userId = req.user.id;

    const { data: contract, error: fetchError } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, job_id, client_id, freelancer_id, agreed_amount, status')
      .eq('contract_id', contract_id)
      .single();

    if (fetchError || !contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (contract.client_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the client can approve deliverables and release funds' });
    }

    // Ensure user's active role is customer
    if (req.user.active_role !== 'customer') {
      await supabaseAdmin.from('users').update({ active_role: 'customer' }).eq('user_id', userId);
    }

    if (contract.status !== 'submitted') {
      return res.status(409).json({
        success: false,
        error: `Cannot complete a contract in '${contract.status}' status. The freelancer must submit work for review first.`,
      });
    }

    // Update contract status to completed
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({ status: 'completed' })
      .eq('contract_id', contract_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Also update associated job status to 'completed'
    if (contract.job_id) {
      await supabaseAdmin
        .from('jobs')
        .update({ status: 'completed' })
        .eq('job_id', contract.job_id);
    }

    // Post notification into chat thread
    await postSystemMessage(
      contract_id,
      userId,
      `Deliverables approved! Escrow payment of ₱${Number(contract.agreed_amount).toLocaleString()} released to the freelancer.`
    );

    return res.status(200).json({
      success: true,
      message: `Contract approved! ₱${Number(contract.agreed_amount).toLocaleString()} released to freelancer.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

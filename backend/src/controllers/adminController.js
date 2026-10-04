const { supabaseAdmin } = require('../config/supabase');
const { logActivity } = require('../utils/activity');
const { publishToUsers } = require('../utils/live');
const { maskPayout } = require('../utils/payout');
const { maskPaymentMethod } = require('../utils/paymentMethod');
const { notify } = require('../utils/notify');
const { getPhpRates, toPhp } = require('../utils/rates');

// GET /api/v1/admin/analytics - Platform-wide metrics for the admin dashboard
exports.getAnalytics = async (req, res) => {
  try {
    const [
      { count: totalUsers, error: usersError },
      { count: activeContracts, error: contractsError },
      { data: completedContracts, error: revenueError },
      { count: openDisputes, error: disputesError },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('user_id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('contracts')
        .select('contract_id', { count: 'exact', head: true })
        .in('status', ['active', 'submitted']),
      supabaseAdmin.from('contracts').select('*, jobs(currency)').eq('status', 'completed'),
      supabaseAdmin
        .from('disputes')
        .select('dispute_id', { count: 'exact', head: true })
        .in('status', ['open', 'under_review']),
    ]);

    if (usersError) throw usersError;
    if (contractsError) throw contractsError;
    if (revenueError) throw revenueError;
    if (disputesError) throw disputesError;

    // In PHP: USD contracts are converted with the current exchange rate
    const { rates } = await getPhpRates();
    const platformRevenue = (completedContracts || []).reduce(
      (sum, c) => sum + toPhp(c.released_amount ?? c.agreed_amount ?? 0, c.jobs?.currency, rates),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        total_users: totalUsers || 0,
        active_contracts: activeContracts || 0,
        platform_revenue: platformRevenue,
        open_disputes: openDisputes || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/admin/users - List users for the management table
exports.getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*') // includes client_type once migration 010 has run
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Payout details, masked (•••• 1234). Skipped quietly if migration 010 hasn't been run.
    const payoutByUser = {};
    const { data: payouts, error: payoutError } = await supabaseAdmin.from('payout_details').select('*');
    if (!payoutError) for (const p of payouts || []) payoutByUser[p.user_id] = maskPayout(p);
    const paymentByUser = {};
    const { data: payments, error: paymentError } = await supabaseAdmin.from('client_payment_methods').select('*');
    if (!paymentError) for (const p of payments || []) paymentByUser[p.user_id] = maskPaymentMethod(p);

    const rows = (users || []).map((u) => ({
      user_id: u.user_id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      active_role: u.active_role,
      status: u.status,
      created_at: u.created_at,
      client_type: u.client_type || null,
      company_name: u.company_name || null,
      payout: payoutByUser[u.user_id] || null,
      payment_method: paymentByUser[u.user_id] || null,
    }));

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/admin/users/:id - Toggle a user's active/suspended status
// REQUIRES MIGRATION: public.users needs a `status` column before this will work.
// ALTER TABLE public.users ADD COLUMN status text DEFAULT 'active'
//   CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text]));
exports.updateUserStatus = async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: "status must be 'active' or 'suspended'" });
    }

    if (user_id === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot change your own account status' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update({ status })
      .eq('user_id', user_id)
      .select('user_id, email, status')
      .single();

    if (error) throw error;
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await logActivity({
      user_id: req.user.id,
      category: 'admin',
      action: status === 'suspended' ? 'admin.user_suspended' : 'admin.user_reactivated',
      description: `${status === 'suspended' ? 'Suspended' : 'Reactivated'} the account ${updated.email}`,
      target_type: 'user',
      target_id: updated.user_id,
    });

    if (status === 'suspended') publishToUsers([user_id], { topics: ['account'] });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/admin/jobs - Every job posting regardless of status, for moderation
exports.getAllJobs = async (req, res) => {
  try {
    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('*, categories(category_name), users!jobs_client_id_fkey(user_id, first_name, last_name, email), proposals(status)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withCounts = (jobs || []).map(({ proposals, ...job }) => ({
      ...job,
      pending_count: (proposals || []).filter((p) => p.status === 'pending').length,
    }));

    return res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/admin/jobs/:id/takedown - Remove a job posting that breaks the rules.
// Only open/paused jobs: once a contract exists, money is in escrow and problems
// go through disputes instead. Pending proposals are rejected, same as a cancel.
exports.takedownJob = async (req, res) => {
  try {
    const { id: job_id } = req.params;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    if (reason.length < 10) {
      return res.status(400).json({ success: false, error: 'Please give a reason of at least 10 characters.' });
    }
    if (reason.length > 500) {
      return res.status(400).json({ success: false, error: 'Reason must be 500 characters or less.' });
    }

    const { data: job, error: fetchError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, status, client_id, title')
      .eq('job_id', job_id)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    if (!['open', 'paused'].includes(job.status)) {
      return res.status(409).json({
        success: false,
        error: `Only open or paused jobs can be taken down (this one is '${job.status}').`,
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'removed', removal_reason: reason })
      .eq('job_id', job_id)
      .select()
      .single();

    if (error) throw error;

    const { data: rejectedProposals, error: rejectError } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('job_id', job_id)
      .eq('status', 'pending')
      .select('freelancer_id');

    if (rejectError) throw rejectError;

    await notify([
      {
        user_id: job.client_id,
        type: 'job_removed',
        role: 'customer',
        title: `Your job "${job.title}" was removed by an admin`,
        body: `Reason: ${reason}`,
        link: `/my-jobs/${job_id}`,
      },
      ...(rejectedProposals || []).map((p) => ({
        user_id: p.freelancer_id,
        type: 'job_removed',
        role: 'freelancer',
        title: `"${job.title}" is no longer available`,
        body: 'This job was removed by an admin, so your proposal was closed.',
        link: '/my-proposals',
      })),
    ]);

    await logActivity({
      user_id: req.user.id,
      category: 'admin',
      action: 'admin.job_removed',
      description: `Took down the job "${job.title}" — ${reason}`,
      target_type: 'job',
      target_id: job_id,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

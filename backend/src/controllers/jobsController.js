const { supabaseAdmin } = require('../config/supabase');
const { getRatingSummaries, emptySummary } = require('../utils/ratings');
const { validateJobInput } = require('../utils/slopFilter');

// GET /api/v1/jobs - Fetch all jobs (with optional category filtering).
// Open jobs come first (newest first); assigned/completed jobs follow so the
// Explore page can show them as "Job taken".
exports.getAllJobs = async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = supabaseAdmin
      .from('jobs')
      .select('*, categories(category_name), users!jobs_client_id_fkey(user_id, first_name, last_name, client_avatar_url, avatar_url)')
      // Paused/cancelled postings are hidden from browsing; getMyJobs still shows them to their owner.
      .in('status', ['open', 'assigned', 'completed'])
      .order('created_at', { ascending: false });

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    // Stable sort: open jobs first, otherwise keep newest-first order
    const sorted = [...jobs].sort(
      (a, b) => Number(b.status === 'open') - Number(a.status === 'open')
    );

    return res.status(200).json({ success: true, data: sorted });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/jobs/categories - Fetch all categories (Member 2)
exports.getCategories = async (req, res) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*');

    if (error) throw error;

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/jobs/:id - Fetch single job details by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .select('*, categories(category_name), users!jobs_client_id_fkey(user_id, first_name, last_name, email, client_avatar_url, avatar_url)')
      .eq('job_id', id)
      .single();

    if (error || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // How freelancers have rated this client, so applicants can see it before bidding.
    const ratings = await getRatingSummaries([job.client_id], 'customer');
    job.client_rating = ratings[job.client_id] || emptySummary('customer');

    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/jobs/mine - Fetch jobs posted by the logged-in client, with proposal counts
exports.getMyJobs = async (req, res) => {
  try {
    const client_id = req.user.id;

    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('*, categories(category_name), proposals(proposal_id, status)')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withCounts = (jobs || []).map((job) => {
      // Withdrawn proposals are invisible to clients, so they don't count here either.
      const proposals = (job.proposals || []).filter((p) => p.status !== 'withdrawn');
      return {
        ...job,
        proposal_count: proposals.length,
        pending_count: proposals.filter((p) => p.status === 'pending').length,
      };
    });

    return res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/v1/jobs - Create a new job posting (Member 2)
exports.createJob = async (req, res) => {
  try {
    if (req.user?.active_role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Only customers can create job postings.',
      });
    }

    const { title, description, category_id, custom_category, budget_type, budget, deadline, currency } = req.body;
    const client_id = req.user.id;

    // Phase 0 Anti-Slop & Input Sanitization
    const validation = validateJobInput({
      title,
      description,
      budget,
      currency: currency || 'PHP',
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors,
      });
    }

    if (!category_id) {
      return res.status(400).json({ success: false, error: 'Category selection is required.' });
    }

    let finalCategoryId = category_id;
    if (custom_category && typeof custom_category === 'string' && custom_category.trim()) {
      const trimmedCat = custom_category.trim();
      if (/<[^>]*>/.test(trimmedCat)) {
        return res.status(400).json({ success: false, error: 'Category name cannot contain HTML tags.' });
      }

      // Check if this category name already exists (case-insensitive)
      const { data: existingCat } = await supabaseAdmin
        .from('categories')
        .select('category_id, category_name')
        .ilike('category_name', trimmedCat)
        .maybeSingle();

      if (existingCat) {
        finalCategoryId = existingCat.category_id;
      } else {
        const { data: newCat, error: newCatErr } = await supabaseAdmin
          .from('categories')
          .insert([{
            category_name: trimmedCat,
            description: `Others: ${trimmedCat}`,
          }])
          .select()
          .single();

        if (newCatErr) throw newCatErr;
        finalCategoryId = newCat.category_id;
      }
    }

    if (deadline && new Date(deadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Deadline must be a future date.' });
    }

    const insertPayload = {
      client_id,
      title: title.trim(),
      description: description.trim(),
      category_id: finalCategoryId,
      budget_type: budget_type || 'fixed',
      budget: Number(budget),
      deadline: deadline || null,
      status: 'open',
    };

    if (currency) {
      insertPayload.currency = currency;
    }

    let job;
    let insertRes = await supabaseAdmin
      .from('jobs')
      .insert([insertPayload])
      .select()
      .single();

    if (insertRes.error && insertRes.error.message && insertRes.error.message.includes('currency')) {
      // Fallback if jobs.currency migration has not run yet in live DB
      delete insertPayload.currency;
      insertRes = await supabaseAdmin
        .from('jobs')
        .insert([insertPayload])
        .select()
        .single();
    }

    if (insertRes.error) throw insertRes.error;
    job = insertRes.data;

    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Shared ownership + status guard for the lifecycle actions below. Returns the
// job row on success, or null after already sending an error response.
async function loadOwnedJobOrRespond(req, res, allowedStatuses) {
  // Managing a job posting is a client-mode action, same as posting one.
  if (req.user?.active_role !== 'customer') {
    res.status(403).json({ success: false, error: 'Switch to Client mode to manage your job postings.' });
    return null;
  }

  const { data: job, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('job_id', req.params.id)
    .single();

  if (error || !job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return null;
  }
  if (job.client_id !== req.user.id) {
    res.status(403).json({ success: false, error: 'You do not own this job posting' });
    return null;
  }
  if (!allowedStatuses.includes(job.status)) {
    res.status(409).json({
      success: false,
      error: `This action isn't available for a job that is currently '${job.status}'.`,
    });
    return null;
  }
  return job;
}

async function countPendingProposals(jobId) {
  const { count, error } = await supabaseAdmin
    .from('proposals')
    .select('proposal_id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('status', 'pending');
  if (error) throw error;
  return count || 0;
}

// PATCH /api/v1/jobs/:id - Edit an open job posting.
// Expects the full form (same fields as createJob). Once a pending proposal
// exists, budget, budget type and currency are locked so nobody's bid ends up
// answering terms that changed after they submitted it.
exports.updateJob = async (req, res) => {
  try {
    const job = await loadOwnedJobOrRespond(req, res, ['open']);
    if (!job) return;

    const { title, description, category_id, custom_category, budget_type, budget, deadline, currency } = req.body;
    const currentCurrency = job.currency || 'PHP';
    const nextCurrency = currency || currentCurrency;
    const currentBudgetType = job.budget_type || 'fixed';
    const nextBudgetType = budget_type || currentBudgetType;

    const validation = validateJobInput({ title, description, budget, currency: nextCurrency });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        errors: validation.errors,
      });
    }

    if (!category_id) {
      return res.status(400).json({ success: false, error: 'Category selection is required.' });
    }

    const termsChanged =
      Number(budget) !== Number(job.budget) ||
      nextBudgetType !== currentBudgetType ||
      nextCurrency !== currentCurrency;

    if (termsChanged && (await countPendingProposals(job.job_id)) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Budget, budget type and currency are locked because freelancers have already sent proposals.',
      });
    }

    let finalCategoryId = category_id;
    if (custom_category && typeof custom_category === 'string' && custom_category.trim()) {
      const trimmedCat = custom_category.trim();
      if (/<[^>]*>/.test(trimmedCat)) {
        return res.status(400).json({ success: false, error: 'Category name cannot contain HTML tags.' });
      }

      const { data: existingCat } = await supabaseAdmin
        .from('categories')
        .select('category_id')
        .ilike('category_name', trimmedCat)
        .maybeSingle();

      if (existingCat) {
        finalCategoryId = existingCat.category_id;
      } else {
        const { data: newCat, error: newCatErr } = await supabaseAdmin
          .from('categories')
          .insert([{ category_name: trimmedCat, description: `Others: ${trimmedCat}` }])
          .select()
          .single();

        if (newCatErr) throw newCatErr;
        finalCategoryId = newCat.category_id;
      }
    }

    // Only a newly chosen deadline has to be in the future; keeping the
    // existing one untouched is always allowed.
    const currentDeadline = job.deadline ? String(job.deadline).slice(0, 10) : null;
    const nextDeadline = deadline ? String(deadline).slice(0, 10) : null;
    if (nextDeadline && nextDeadline !== currentDeadline && new Date(nextDeadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Deadline must be a future date.' });
    }

    const updates = {
      title: title.trim(),
      description: description.trim(),
      category_id: finalCategoryId,
      budget_type: nextBudgetType,
      budget: Number(budget),
    };
    if (nextDeadline !== currentDeadline) {
      updates.deadline = nextDeadline;
    }
    if (nextCurrency !== currentCurrency) {
      updates.currency = nextCurrency;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('jobs')
      .update(updates)
      .eq('job_id', job.job_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/jobs/:id/pause - Hide an open job from Explore without closing it.
// Pending proposals stay manageable (accept/reject); pausing only stops new ones.
exports.pauseJob = async (req, res) => {
  try {
    const job = await loadOwnedJobOrRespond(req, res, ['open']);
    if (!job) return;

    const { data: updated, error } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'paused' })
      .eq('job_id', job.job_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/jobs/:id/resume - Put a paused job back on Explore.
exports.resumeJob = async (req, res) => {
  try {
    const job = await loadOwnedJobOrRespond(req, res, ['paused']);
    if (!job) return;

    const { data: updated, error } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'open' })
      .eq('job_id', job.job_id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/jobs/:id/cancel - Permanently close an open or paused job.
// Every pending proposal on it is rejected, which is what freelancers already
// see when a client turns one down, so no separate notice is needed.
exports.cancelJob = async (req, res) => {
  try {
    const job = await loadOwnedJobOrRespond(req, res, ['open', 'paused']);
    if (!job) return;

    const { data: updated, error } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('job_id', job.job_id)
      .select()
      .single();

    if (error) throw error;

    const { error: rejectError } = await supabaseAdmin
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('job_id', job.job_id)
      .eq('status', 'pending');

    if (rejectError) throw rejectError;

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


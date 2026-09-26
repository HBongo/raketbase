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

    const { title, description, category_id, budget_type, budget, deadline, currency } = req.body;
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

    if (deadline && new Date(deadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Deadline must be a future date.' });
    }

    const insertPayload = {
      client_id,
      title: title.trim(),
      description: description.trim(),
      category_id,
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
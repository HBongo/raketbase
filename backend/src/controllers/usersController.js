// usersController.js — Public user profile endpoint
const { supabaseAdmin } = require('../config/supabase');
const { getRatingSummaries, emptySummary } = require('../utils/ratings');

const PROFILE_COLUMNS = `
  user_id, email, first_name, last_name, role, active_role,
  bio, skills, portfolio_url, avatar_url, created_at
`.replace(/\s+/g, ' ').trim();

// GET /api/v1/users/:id — Fetch any user's public profile
async function getPublicProfile(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  try {
    // 1. Fetch user profile from public.users
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select(PROFILE_COLUMNS)
      .eq('user_id', id)
      .single();

    if (error || !profile) {
      console.error('Supabase get profile error:', error);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Fetch extended fields from auth metadata (workaround for no SQL access)
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id);
    const meta = authData?.user?.user_metadata || {};

    // 3. Compute stats from contracts table
    const { count: completedJobs } = await supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('freelancer_id', id)
      .eq('status', 'completed');

    const { data: earnings } = await supabaseAdmin
      .from('contracts')
      .select('agreed_amount')
      .eq('freelancer_id', id)
      .eq('status', 'completed');

    const totalEarnings = (earnings || []).reduce(
      (sum, c) => sum + Number(c.agreed_amount || 0),
      0
    );

    // Freelancer rating: what clients rated this person, to match the freelancer stats above
    const ratings = await getRatingSummaries([id], 'freelancer');
    const freelancerRating = ratings[id] || emptySummary('freelancer');

    // Strip sensitive fields
    const { role, status, ...publicProfile } = profile;

    return res.status(200).json({
      success: true,
      data: {
        ...publicProfile,
        title: meta.title || '',
        phone: meta.phone || '',
        location: meta.location || '',
        hourly_rate: meta.hourly_rate || null,
        linkedin_url: meta.linkedin_url || '',
        github_url: meta.github_url || '',
        website_url: meta.website_url || '',
        experience: meta.experience || [],
        education: meta.education || [],
        completed_jobs: completedJobs || 0,
        total_earnings: totalEarnings,
        rating: freelancerRating.average,
        rating_count: freelancerRating.count,
      },
    });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

module.exports = { getPublicProfile };


// usersController.js — Public user profile endpoint
const { supabaseAdmin } = require('../config/supabase');
const { getRatingSummaries, emptySummary, ROLES } = require('../utils/ratings');
const { fetchAllRows, getAverageAmountsByUser } = require('../utils/userStats');

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
      .select('*') // includes released_amount once migration 009 has run
      .eq('freelancer_id', id)
      .eq('status', 'completed');

    const totalEarnings = (earnings || []).reduce(
      (sum, c) => sum + Number(c.released_amount ?? c.agreed_amount ?? 0),
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

const BROWSE_PAGE_SIZE = 12;
const BROWSE_MAX_LIMIT = 50;
const LATEST_REVIEWS = 3;

// GET /api/v1/users/browse?role=freelancer|customer&q=&sort=top|reviews|newest&limit=12&offset=0
// Everyone active in that role (one account can appear under both): freelancers have sent a
// proposal, worked a contract, been reviewed as a freelancer, or are in Freelancer mode; clients
// likewise for posting jobs. Each card gets the person's average rating, review count, average
// contract amount (same numbers as Top Users), and their latest 3 reviews. No contact details.
async function browseUsers(req, res) {
  try {
    const { role } = req.query;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: "role must be 'freelancer' or 'customer'" });
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase().slice(0, 100) : '';
    const sort = ['top', 'reviews', 'newest'].includes(req.query.sort) ? req.query.sort : 'top';
    const limit = Math.min(BROWSE_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || BROWSE_PAGE_SIZE));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const isFreelancer = role === 'freelancer';

    const [users, contracts, roleActivity, reviews, amounts] = await Promise.all([
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from('users')
          .select('user_id, first_name, last_name, avatar_url, company_name, skills, active_role, status, created_at')
          .order('user_id')
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabaseAdmin.from('contracts').select('contract_id, client_id, freelancer_id').order('contract_id').range(from, to)
      ),
      // Freelancers: anyone who has bid. Clients: anyone who has posted a job.
      isFreelancer
        ? fetchAllRows((from, to) =>
            supabaseAdmin.from('proposals').select('proposal_id, freelancer_id').order('proposal_id').range(from, to)
          )
        : fetchAllRows((from, to) =>
            supabaseAdmin.from('jobs').select('job_id, client_id').order('job_id').range(from, to)
          ),
      fetchAllRows((from, to) =>
        supabaseAdmin
          .from('reviews')
          .select('review_id, reviewer_id, reviewee_id, rating, comment, created_at, contracts(jobs(title))')
          .eq('reviewee_role', role)
          .order('created_at', { ascending: false })
          .order('review_id')
          .range(from, to)
      ),
      getAverageAmountsByUser(role),
    ]);

    const active = new Set();
    for (const c of contracts) active.add(isFreelancer ? c.freelancer_id : c.client_id);
    for (const row of roleActivity) active.add(isFreelancer ? row.freelancer_id : row.client_id);

    // Reviews are newest-first, so each person's list is already in display order.
    const reviewsByUser = {};
    for (const r of reviews) (reviewsByUser[r.reviewee_id] = reviewsByUser[r.reviewee_id] || []).push(r);

    const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'RaketBase user';
    const peopleById = Object.fromEntries(users.map((u) => [u.user_id, u]));

    const listed = users
      .filter((u) => u.status !== 'suspended')
      .filter((u) => active.has(u.user_id) || reviewsByUser[u.user_id] || u.active_role === role)
      .filter((u) => {
        if (!q) return true;
        const haystack = [fullName(u), u.company_name, ...(u.skills || [])].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .map((u) => {
        const own = reviewsByUser[u.user_id] || [];
        const sum = own.reduce((s, r) => s + r.rating, 0);
        return {
          user: u,
          reviews: own,
          exactAverage: own.length ? sum / own.length : null,
          count: own.length,
        };
      });

    listed.sort((a, b) => {
      if (sort === 'newest') return new Date(b.user.created_at) - new Date(a.user.created_at);
      if (sort === 'reviews') return b.count - a.count || (b.exactAverage || 0) - (a.exactAverage || 0);
      // Top rated: people without reviews go last
      return (b.exactAverage ?? -1) - (a.exactAverage ?? -1) || b.count - a.count;
    });

    const page = listed.slice(offset, offset + limit).map((entry) => {
      const u = entry.user;
      return {
        user_id: u.user_id,
        name: fullName(u),
        avatar_url: u.avatar_url || null,
        ...(isFreelancer ? { skills: (u.skills || []).slice(0, 3) } : { company_name: u.company_name || '' }),
        average: entry.exactAverage === null ? null : Math.round(entry.exactAverage * 10) / 10,
        count: entry.count,
        avg_price: amounts[u.user_id]?.average ?? null,
        completed_contracts: amounts[u.user_id]?.contracts ?? 0,
        latest_reviews: entry.reviews.slice(0, LATEST_REVIEWS).map((r) => ({
          review_id: r.review_id,
          rating: r.rating,
          comment: r.comment ? r.comment.trim() : null,
          created_at: r.created_at,
          job_title: r.contracts?.jobs?.title || null,
          reviewer_name: fullName(peopleById[r.reviewer_id]),
        })),
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        role,
        users: page,
        total: listed.length,
        has_more: offset + page.length < listed.length,
      },
    });
  } catch (err) {
    console.error('browseUsers error:', err);
    return res.status(500).json({ success: false, error: 'Could not load profiles' });
  }
}

module.exports = { getPublicProfile, browseUsers };


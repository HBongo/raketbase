const { supabaseAdmin } = require('../config/supabase');
const { CRITERIA, ROLES, summarize } = require('../utils/ratings');
const { getAverageAmountForUser } = require('../utils/userStats');

const COMMENT_MAX = 1000;
const REVIEW_LIST_LIMIT = 50;

function isStar(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

// POST /api/v1/reviews - Rate the other participant of a COMPLETED contract.
// Client rates the freelancer (quality, communication, timeliness);
// freelancer rates the client (clarity, responsiveness, payment).
// Body: { contract_id, rating, comment?, ...the three sub-ratings for the reviewee's role }
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contract_id, rating, comment } = req.body || {};

    if (!contract_id) {
      return res.status(400).json({ success: false, error: 'contract_id is required' });
    }

    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, client_id, freelancer_id, status')
      .eq('contract_id', contract_id)
      .single();

    if (contractError || !contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    const isClient = contract.client_id === userId;
    const isFreelancer = contract.freelancer_id === userId;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this contract' });
    }

    // Auto-align active_role if caller is in opposite mode
    if (isClient && req.user.active_role !== 'customer') {
      await supabaseAdmin.from('users').update({ active_role: 'customer' }).eq('user_id', userId);
      req.user.active_role = 'customer';
    } else if (isFreelancer && req.user.active_role !== 'freelancer') {
      await supabaseAdmin.from('users').update({ active_role: 'freelancer' }).eq('user_id', userId);
      req.user.active_role = 'freelancer';
    }

    if (contract.status !== 'completed') {
      return res.status(409).json({
        success: false,
        error: 'You can only rate once the contract is completed.',
      });
    }

    const revieweeRole = isClient ? 'freelancer' : 'customer';
    const revieweeId = isClient ? contract.freelancer_id : contract.client_id;

    if (!isStar(rating)) {
      return res.status(400).json({ success: false, error: 'Overall rating must be a whole number from 1 to 5.' });
    }

    const subRatings = {};
    for (const col of CRITERIA[revieweeRole]) {
      if (!isStar(req.body[col])) {
        return res.status(400).json({
          success: false,
          error: `${col.replace('_rating', '')} rating must be a whole number from 1 to 5.`,
        });
      }
      subRatings[col] = req.body[col];
    }

    let cleanComment = null;
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        return res.status(400).json({ success: false, error: 'Comment must be text.' });
      }
      cleanComment = comment.trim();
      if (cleanComment.length > COMMENT_MAX) {
        return res.status(400).json({ success: false, error: `Comment must be ${COMMENT_MAX} characters or less.` });
      }
      if (cleanComment === '') cleanComment = null;
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert([
        {
          contract_id,
          reviewer_id: userId,
          reviewee_id: revieweeId,
          reviewee_role: revieweeRole,
          rating,
          comment: cleanComment,
          ...subRatings,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    // Unique violation on (contract_id, reviewer_id): already rated this contract.
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'You have already rated this contract.' });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/reviews/users/:id?role=freelancer|customer - Public profile + ratings for one
// person in one role. Public (no login needed), like job pages, and only returns
// fields that are meant to be shown on a profile.
exports.getUserReviews = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const { role } = req.query;

    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: "role must be 'freelancer' or 'customer'" });
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(
        'user_id, first_name, last_name, bio, skills, portfolio_url, avatar_url, client_bio, client_avatar_url, company_name, created_at'
      )
      .eq('user_id', targetId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { data: rows, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select(
        `
        review_id,
        reviewer_id,
        rating,
        comment,
        created_at,
        ${CRITERIA[role].join(',\n        ')},
        reviewer:users!reviews_reviewer_id_fkey ( user_id, first_name, last_name, avatar_url, client_avatar_url ),
        contracts ( jobs ( title ) )
      `
      )
      .eq('reviewee_id', targetId)
      .eq('reviewee_role', role)
      .order('created_at', { ascending: false });

    if (reviewsError) throw reviewsError;

    const all = rows || [];
    const summary = summarize(all, role);

    // Average agreed amount over this person's completed contracts: their average price as a
    // freelancer, or their average budget as a client.
    const price = await getAverageAmountForUser(targetId, role);

    // The reviewer sits on the opposite side of the contract: if we're looking at someone as a
    // freelancer, their reviewers were clients (and used their client photo), and vice versa.
    const reviews = all.slice(0, REVIEW_LIST_LIMIT).map((r) => {
      const reviewerIsClient = role === 'freelancer';
      const reviewer = r.reviewer || {};
      const sub = {};
      for (const col of CRITERIA[role]) sub[col] = r[col];
      return {
        review_id: r.review_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        ...sub,
        job_title: r.contracts?.jobs?.title || null,
        reviewer: {
          user_id: reviewer.user_id || r.reviewer_id,
          name: [reviewer.first_name, reviewer.last_name].filter(Boolean).join(' ') || 'RaketBase user',
          avatar_url: (reviewerIsClient ? reviewer.client_avatar_url : reviewer.avatar_url) || null,
          role: reviewerIsClient ? 'customer' : 'freelancer',
        },
      };
    });

    const isFreelancer = role === 'freelancer';
    const publicUser = {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      bio: (isFreelancer ? user.bio : user.client_bio) || '',
      avatar_url: (isFreelancer ? user.avatar_url : user.client_avatar_url) || null,
      member_since: user.created_at,
      ...(isFreelancer
        ? { skills: user.skills || [], portfolio_url: user.portfolio_url || '' }
        : { company_name: user.company_name || '' }),
    };

    return res.status(200).json({
      success: true,
      data: { role, user: publicUser, summary, price, reviews, has_more: all.length > reviews.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

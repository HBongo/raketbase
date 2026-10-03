const { supabaseAdmin } = require('../config/supabase');
const { ROLES } = require('../utils/ratings');
const { fetchAllRows, getAverageAmountsByUser } = require('../utils/userStats');

// Only people with at least this many reviews can appear on the Top Users list.
const MIN_REVIEWS = 3;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value, fallback, min, max) {
  const n = toNumber(value);
  if (n === null) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

// GET /api/v1/top-users?role=freelancer|customer
//   &min_rating=4        only people whose average is at least this (0-5)
//   &min_price=1000      only people whose average price/budget is at least this
//   &max_price=20000     ...and at most this
//   &limit=12&offset=0   paging
//
// Always ranked best-rated first (ties: more reviews, then most recently reviewed).
// "Average price" (freelancer) / "average budget" (client) = average agreed amount over the
// person's COMPLETED contracts. Someone with no completed contracts has no price, so they drop
// out whenever a price filter is set. Suspended accounts are never listed.
//
// Public (no login), same as the profile endpoint: it only exposes what profiles already show.
// It reads all reviews and completed contracts and aggregates in Node, which is fine at this size;
// if the tables get large, move the aggregation into a SQL view or RPC.
exports.getTopUsers = async (req, res) => {
  try {
    const { role } = req.query;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: "role must be 'freelancer' or 'customer'" });
    }

    const minRating = toNumber(req.query.min_rating);
    const minPrice = toNumber(req.query.min_price);
    const maxPrice = toNumber(req.query.max_price);
    const limit = toInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const offset = toInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

    // 1) Every review of anyone in this role, newest first, grouped per person.
    const reviews = await fetchAllRows((from, to) =>
      supabaseAdmin
        .from('reviews')
        .select('review_id, reviewer_id, reviewee_id, rating, comment, created_at')
        .eq('reviewee_role', role)
        .order('created_at', { ascending: false })
        .order('review_id')
        .range(from, to)
    );

    const stats = {};
    for (const r of reviews) {
      const s = (stats[r.reviewee_id] = stats[r.reviewee_id] || {
        count: 0,
        sum: 0,
        lastReviewAt: r.created_at, // rows are newest-first, so the first one seen is the latest
        latestComment: null,
      });
      s.count += 1;
      s.sum += r.rating;
      // The latest review that actually has a written comment.
      if (!s.latestComment && r.comment && r.comment.trim()) s.latestComment = r;
    }

    // 2) Suspended accounts are excluded, and average prices come from completed contracts.
    const { data: suspendedRows, error: suspendedError } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('status', 'suspended');
    if (suspendedError) throw suspendedError;
    const suspended = new Set((suspendedRows || []).map((u) => u.user_id));

    const amounts = await getAverageAmountsByUser(role);

    // 3) Everyone who qualifies.
    const qualified = Object.entries(stats)
      .filter(([userId, s]) => s.count >= MIN_REVIEWS && !suspended.has(userId))
      .map(([userId, s]) => ({
        user_id: userId,
        exactAverage: s.sum / s.count,
        average: Math.round((s.sum / s.count) * 10) / 10,
        count: s.count,
        avg_price: amounts[userId]?.average ?? null,
        completed_contracts: amounts[userId]?.contracts ?? 0,
        lastReviewAt: s.lastReviewAt,
        latestComment: s.latestComment,
      }));

    // Slider limits for the price filter. Deliberately NOT affected by the other filters,
    // so the slider doesn't jump around as the person narrows the list.
    const prices = qualified.map((u) => u.avg_price).filter((p) => p !== null);
    const price_bounds = prices.length
      ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
      : null;

    // 4) Apply the filters.
    const filtered = qualified.filter((u) => {
      if (minRating !== null && u.average < minRating) return false;
      if (minPrice !== null && (u.avg_price === null || u.avg_price < minPrice)) return false;
      if (maxPrice !== null && (u.avg_price === null || u.avg_price > maxPrice)) return false;
      return true;
    });

    // 5) Best-rated first.
    filtered.sort(
      (a, b) =>
        b.exactAverage - a.exactAverage ||
        b.count - a.count ||
        new Date(b.lastReviewAt) - new Date(a.lastReviewAt)
    );

    const page = filtered.slice(offset, offset + limit);

    // 6) Names and photos for just this page (plus whoever wrote each latest comment).
    const idsToLoad = new Set(page.map((u) => u.user_id));
    for (const u of page) if (u.latestComment) idsToLoad.add(u.latestComment.reviewer_id);

    let people = {};
    if (idsToLoad.size > 0) {
      const { data: userRows, error: usersError } = await supabaseAdmin
        .from('users')
        .select('user_id, first_name, last_name, avatar_url, client_avatar_url, company_name, skills')
        .in('user_id', [...idsToLoad]);
      if (usersError) throw usersError;
      people = Object.fromEntries((userRows || []).map((u) => [u.user_id, u]));
    }

    const fullName = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || 'RaketBase user';
    const isFreelancer = role === 'freelancer';

    const users = page.map((u) => {
      const p = people[u.user_id] || {};
      return {
        user_id: u.user_id,
        name: fullName(p),
        avatar_url: (isFreelancer ? p.avatar_url : p.client_avatar_url) || null,
        ...(isFreelancer
          ? { skills: (p.skills || []).slice(0, 3) }
          : { company_name: p.company_name || '' }),
        average: u.average,
        count: u.count,
        avg_price: u.avg_price,
        completed_contracts: u.completed_contracts,
        latest_comment: u.latestComment
          ? {
              comment: u.latestComment.comment.trim(),
              created_at: u.latestComment.created_at,
              reviewer_name: fullName(people[u.latestComment.reviewer_id]),
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        role,
        users,
        total: filtered.length,
        limit,
        offset,
        has_more: offset + users.length < filtered.length,
        min_reviews: MIN_REVIEWS,
        price_bounds,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};



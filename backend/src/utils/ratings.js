const { supabaseAdmin } = require('../config/supabase');

// Sub-rating columns per role. 'freelancer' = the person was the freelancer on the
// contract (rated by the client); 'customer' = the person was the client (rated by
// the freelancer). Keep in sync with frontend/src/utils/ratings.js.
const CRITERIA = {
  freelancer: ['quality_rating', 'communication_rating', 'timeliness_rating'],
  customer: ['clarity_rating', 'responsiveness_rating', 'payment_rating'],
};

const ROLES = Object.keys(CRITERIA);

function round1(n) {
  return Math.round(n * 10) / 10;
}

function average(values) {
  const nums = values.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length === 0) return null;
  return round1(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

// The shape returned when someone has no reviews yet.
function emptySummary(role) {
  const breakdown = {};
  for (const col of CRITERIA[role] || []) breakdown[col] = null;
  return { average: null, count: 0, breakdown, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

// rows: review rows that all belong to ONE person in ONE role.
function summarize(rows, role) {
  if (!rows || rows.length === 0) return emptySummary(role);

  const breakdown = {};
  for (const col of CRITERIA[role]) {
    breakdown[col] = average(rows.map((r) => r[col]));
  }

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) {
    if (distribution[r.rating] !== undefined) distribution[r.rating] += 1;
  }

  return {
    average: average(rows.map((r) => r.rating)),
    count: rows.length,
    breakdown,
    distribution,
  };
}

// Returns { [userId]: summary } for many users at once (one query).
// Never throws: if the ratings query fails (e.g. migration not run yet) the caller
// simply gets an empty map and the page keeps working without ratings.
async function getRatingSummaries(userIds, role) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  const result = {};
  if (ids.length === 0 || !CRITERIA[role]) return result;

  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(['reviewee_id', 'rating', ...CRITERIA[role]].join(', '))
      .in('reviewee_id', ids)
      .eq('reviewee_role', role);

    if (error) throw error;

    const byUser = {};
    for (const row of data || []) {
      (byUser[row.reviewee_id] = byUser[row.reviewee_id] || []).push(row);
    }
    for (const id of ids) result[id] = summarize(byUser[id] || [], role);
  } catch (err) {
    console.error('getRatingSummaries failed:', err.message);
  }
  return result;
}

module.exports = { CRITERIA, ROLES, emptySummary, summarize, getRatingSummaries };



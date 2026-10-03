const { supabaseAdmin } = require('../config/supabase');

// Which contracts column holds the person, per role. 'freelancer' = took the work,
// 'customer' = posted it (same role names as the ratings).
const ROLE_COLUMN = { freelancer: 'freelancer_id', customer: 'client_id' };

const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Reads EVERY row of a query by paging through it 1000 at a time.
// buildQuery(from, to) must return a Supabase query with .range(from, to) applied and a
// stable .order(), otherwise rows can repeat or go missing between pages.
async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

// Every COMPLETED contract, grouped into { [userId]: { average, contracts } } for one role.
// "Average price" (freelancer) and "average budget" (client) both mean: the average agreed
// amount across the contracts that person finished.
async function getAverageAmountsByUser(role) {
  const column = ROLE_COLUMN[role];
  const rows = await fetchAllRows((from, to) =>
    supabaseAdmin
      .from('contracts')
      .select('contract_id, client_id, freelancer_id, agreed_amount')
      .eq('status', 'completed')
      .order('contract_id')
      .range(from, to)
  );

  const totals = {};
  for (const row of rows) {
    const userId = row[column];
    const amount = Number(row.agreed_amount);
    if (!userId || !Number.isFinite(amount)) continue;
    const t = (totals[userId] = totals[userId] || { sum: 0, contracts: 0 });
    t.sum += amount;
    t.contracts += 1;
  }

  const result = {};
  for (const [userId, t] of Object.entries(totals)) {
    result[userId] = { average: round2(t.sum / t.contracts), contracts: t.contracts };
  }
  return result;
}

// Same number for a single person (used on profile pages).
// Never throws: on failure the profile just shows "no completed contracts yet".
async function getAverageAmountForUser(userId, role) {
  const empty = { average: null, contracts: 0 };
  const column = ROLE_COLUMN[role];
  if (!column) return empty;

  try {
    const rows = await fetchAllRows((from, to) =>
      supabaseAdmin
        .from('contracts')
        .select('contract_id, agreed_amount')
        .eq(column, userId)
        .eq('status', 'completed')
        .order('contract_id')
        .range(from, to)
    );
    const amounts = rows.map((r) => Number(r.agreed_amount)).filter((n) => Number.isFinite(n));
    if (amounts.length === 0) return empty;
    return {
      average: round2(amounts.reduce((sum, n) => sum + n, 0) / amounts.length),
      contracts: amounts.length,
    };
  } catch (err) {
    console.error('getAverageAmountForUser failed:', err.message);
    return empty;
  }
}

module.exports = { fetchAllRows, getAverageAmountsByUser, getAverageAmountForUser };



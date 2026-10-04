const { supabaseAdmin } = require('../config/supabase');

// Freelancer payout details (where released escrow goes). Stored in public.payout_details,
// which only the backend can read; the full account number is never sent back to anyone.

const METHODS = {
  bank: 'Bank account',
  gcash: 'GCash',
  maya: 'Maya',
};

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const hasHtml = (v) => /<[^>]*>/.test(v);

// Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX (spaces and dashes allowed)
function cleanPhone(value) {
  const digits = clean(value).replace(/[\s-]/g, '');
  if (/^09\d{9}$/.test(digits)) return digits;
  if (/^\+639\d{9}$/.test(digits)) return `0${digits.slice(3)}`;
  return null;
}

// Returns { error } or { row } ready to save (without user_id).
// Field names match the request body: payoutMethod, payoutProvider, accountName, accountNumber.
function validatePayout(body) {
  const method = clean(body.payoutMethod).toLowerCase();
  const provider = clean(body.payoutProvider);
  const accountName = clean(body.accountName);
  const accountNumber = clean(body.accountNumber).replace(/[\s-]/g, '');

  if (!METHODS[method]) return { error: 'Choose a payout method: bank account, GCash, or Maya.' };
  if (method === 'bank' && (provider.length < 2 || provider.length > 60 || hasHtml(provider))) {
    return { error: 'Enter your bank name (2 to 60 characters).' };
  }
  if (accountName.length < 2 || accountName.length > 100 || hasHtml(accountName)) {
    return { error: 'Enter the account holder name (2 to 100 characters).' };
  }
  if (method === 'bank') {
    if (!/^\d{6,20}$/.test(accountNumber)) return { error: 'Bank account number must be 6 to 20 digits.' };
  } else if (!cleanPhone(accountNumber)) {
    return { error: `${METHODS[method]} number must be a mobile number like 09171234567.` };
  }

  return {
    row: {
      method,
      provider_name: method === 'bank' ? provider : METHODS[method],
      account_name: accountName,
      account_number: method === 'bank' ? accountNumber : cleanPhone(accountNumber),
    },
  };
}

// What owners and admins see: "•••• 1234"
function maskPayout(row) {
  if (!row) return null;
  return {
    method: row.method,
    method_label: METHODS[row.method] || row.method,
    provider_name: row.provider_name,
    account_name: row.account_name,
    account_last4: String(row.account_number || '').slice(-4),
    updated_at: row.updated_at,
  };
}

async function getPayout(userId) {
  const { data, error } = await supabaseAdmin
    .from('payout_details')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function savePayout(userId, row) {
  const { data, error } = await supabaseAdmin
    .from('payout_details')
    .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Used to block sending proposals / accepting offers until payout details exist.
// Fails open (returns true) if the table can't be read, e.g. before migration 010 is run,
// so the site keeps working.
async function hasPayout(userId) {
  try {
    return Boolean(await getPayout(userId));
  } catch (err) {
    console.error('Payout check skipped:', err.message);
    return true;
  }
}

const PAYOUT_REQUIRED_MESSAGE =
  'Add your payout details first (your Freelancer profile → Payments) so you can be paid for this work.';

module.exports = {
  PAYOUT_METHODS: METHODS,
  cleanPhone,
  validatePayout,
  maskPayout,
  getPayout,
  savePayout,
  hasPayout,
  PAYOUT_REQUIRED_MESSAGE,
};

const { supabaseAdmin } = require('../config/supabase');
const { cleanPhone } = require('./payout');

// Client payment methods (how a client funds escrow). Stored in public.client_payment_methods,
// separate from freelancer payout details. For cards only the brand, last 4 digits and expiry
// are kept, never the full number.

const METHODS = {
  gcash: 'GCash',
  maya: 'Maya',
  bank: 'Bank account',
  card: 'Card',
};

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const hasHtml = (v) => /<[^>]*>/.test(v);

// Standard card checksum, so typos are caught before saving
function passesLuhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function cardBrand(digits) {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^35/.test(digits)) return 'JCB';
  return 'Card';
}

// "MM/YY" that hasn't passed yet
function cleanExpiry(value) {
  const m = clean(value).match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return null;
  return `${String(month).padStart(2, '0')}/${m[2]}`;
}

// Returns { error } or { row } ready to save (without user_id).
// Body fields: paymentMethod, paymentProvider (bank name), paymentAccountName,
// paymentAccountNumber (wallet/bank number or card number), cardExpiry (MM/YY, cards only)
function validatePaymentMethod(body) {
  const method = clean(body.paymentMethod).toLowerCase();
  const provider = clean(body.paymentProvider);
  const accountName = clean(body.paymentAccountName);
  const number = clean(body.paymentAccountNumber).replace(/[\s-]/g, '');

  if (!METHODS[method]) return { error: 'Choose a payment method: GCash, Maya, bank account, or card.' };
  if (accountName.length < 2 || accountName.length > 100 || hasHtml(accountName)) {
    return { error: `Enter the ${method === 'card' ? 'name on the card' : 'account holder name'} (2 to 100 characters).` };
  }

  if (method === 'card') {
    if (!/^\d{13,19}$/.test(number) || !passesLuhn(number)) {
      return { error: 'That card number doesn\'t look right. Please check it.' };
    }
    const expiry = cleanExpiry(body.cardExpiry);
    if (!expiry) return { error: 'Enter a card expiry date that hasn\'t passed, like 08/28.' };
    return {
      row: {
        method,
        provider_name: cardBrand(number),
        account_name: accountName,
        account_number: number.slice(-4), // only the last 4 digits are ever stored for cards
        card_expiry: expiry,
      },
    };
  }

  if (method === 'bank') {
    if (provider.length < 2 || provider.length > 60 || hasHtml(provider)) {
      return { error: 'Enter your bank name (2 to 60 characters).' };
    }
    if (!/^\d{6,20}$/.test(number)) return { error: 'Bank account number must be 6 to 20 digits.' };
    return { row: { method, provider_name: provider, account_name: accountName, account_number: number, card_expiry: null } };
  }

  const phone = cleanPhone(number);
  if (!phone) return { error: `${METHODS[method]} number must be a mobile number like 09171234567.` };
  return { row: { method, provider_name: METHODS[method], account_name: accountName, account_number: phone, card_expiry: null } };
}

// What owners and admins see: "Visa •••• 4242 · exp 08/28"
function maskPaymentMethod(row) {
  if (!row) return null;
  return {
    method: row.method,
    method_label: METHODS[row.method] || row.method,
    provider_name: row.provider_name,
    account_name: row.account_name,
    account_last4: String(row.account_number || '').slice(-4),
    card_expiry: row.card_expiry || null,
    updated_at: row.updated_at,
  };
}

async function getPaymentMethod(userId) {
  const { data, error } = await supabaseAdmin
    .from('client_payment_methods')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function savePaymentMethod(userId, row) {
  const { data, error } = await supabaseAdmin
    .from('client_payment_methods')
    .upsert({ user_id: userId, ...row, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// Used to block accepting proposals / sending offers until the client can fund escrow.
// Fails open if the table can't be read (e.g. before migration 011), so the site keeps working.
async function hasPaymentMethod(userId) {
  try {
    return Boolean(await getPaymentMethod(userId));
  } catch (err) {
    console.error('Payment method check skipped:', err.message);
    return true;
  }
}

const PAYMENT_METHOD_REQUIRED_MESSAGE =
  'Add a payment method first (your Client profile → Payments) so escrow can be funded for this work.';

module.exports = {
  PAYMENT_METHODS: METHODS,
  validatePaymentMethod,
  maskPaymentMethod,
  getPaymentMethod,
  savePaymentMethod,
  hasPaymentMethod,
  PAYMENT_METHOD_REQUIRED_MESSAGE,
};

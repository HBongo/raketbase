const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

// Server-side clients are shared by every request, so they must not remember anyone's
// login. By default supabase-js keeps the last session and keeps refreshing it in the
// background on a server, which used up that user's refresh token and logged their
// browser out with "session expired" about an hour later.
const SERVER_AUTH_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, SERVER_AUTH_OPTIONS);

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, SERVER_AUTH_OPTIONS)
  : null;

module.exports = { supabase, supabaseAdmin };

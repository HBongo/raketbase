const { supabase, supabaseAdmin } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: 401, message: 'Missing Authorization header' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ status: 401, message: 'Invalid or expired token' });
  }

  if (!supabaseAdmin) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set — cannot bypass RLS to read user profile.');
    return res.status(500).json({ status: 500, message: 'Server misconfiguration: missing service role key' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role, active_role, status, first_name, last_name, bio, skills, portfolio_url')
    .eq('user_id', userData.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ status: 401, message: 'User profile not found' });
  }
  
  if (profile.status === 'deleted') {
    return res.status(403).json({ status: 403, code: 'ACCOUNT_DELETED', message: 'This account has been deleted.' });
  }

  if (profile.status === 'suspended') {
    return res.status(403).json({ status: 403, code: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' });
  }

  req.user = {
    id: userData.user.id,
    email: userData.user.email,
    role: profile.role,
    active_role: profile.active_role || 'customer',
    firstName: profile.first_name,
    lastName: profile.last_name,
  };

  next();
}

module.exports = { requireAuth };


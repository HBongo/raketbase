const { supabase, supabaseAdmin } = require('../config/supabase');
const { logActivity: logAuditActivity, getUserActivityLogs } = require('../utils/activityLogger');
const { logActivity } = require('../utils/activity');
const { loginBlocked, recordLoginFailure, clearLoginFailures, allowPasswordReset } = require('../utils/loginLimiter');
const { cleanPhone, validatePayout, maskPayout, getPayout, savePayout } = require('../utils/payout');
const { validatePaymentMethod, maskPaymentMethod, getPaymentMethod, savePaymentMethod } = require('../utils/paymentMethod');

const CLIENT_TYPES = {
  individual: 'Individual',
  small_business: 'Small Business',
  major_contractor: 'Major Contractor',
};

// Supabase Storage bucket for profile photos (created by database/avatar_setup.sql).
// Files live at <bucket>/<user_id>/avatar-<timestamp>.<ext>.
const AVATAR_BUCKET = 'avatars';

// One account is both a client and a freelancer, and each mode has its own photo:
// the freelancer photo lives in users.avatar_url, the client photo in users.client_avatar_url.
// filePrefix keeps the two photos' files apart inside the user's storage folder.
const AVATAR_TARGETS = {
  freelancer: { column: 'avatar_url', filePrefix: 'avatar' },
  customer: { column: 'client_avatar_url', filePrefix: 'client-avatar' },
};

// The photo being changed always belongs to the mode the user is currently in
// (active_role as stored in the database, set by requireAuth).
function avatarTargetFor(user) {
  return user.active_role === 'freelancer' ? AVATAR_TARGETS.freelancer : AVATAR_TARGETS.customer;
}

// Sniff the real image type from the file's first bytes. The mimetype the browser
// declares is just a header the client controls, so it can't be trusted on its own.
function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// Deletes a user's stored photos for ONE mode (files starting with `filePrefix-`),
// except `keepName` (pass null to delete them all). The other mode's photo is left alone.
// Best-effort: a failed cleanup must never fail the request the user actually made.
async function clearAvatarFiles(userId, filePrefix, keepName) {
  try {
    const bucket = supabaseAdmin.storage.from(AVATAR_BUCKET);
    const { data: files, error } = await bucket.list(userId);
    if (error || !files) return;
    const stale = files
      .filter((f) => f.name.startsWith(`${filePrefix}-`) && f.name !== keepName)
      .map((f) => `${userId}/${f.name}`);
    if (stale.length > 0) await bucket.remove(stale);
  } catch (err) {
    console.error('Avatar cleanup failed for', userId, err);
  }
}

const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.com.ph',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
];

function isLegitEmailDomain(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (!domain || !domain.includes('.')) return false;
  if (domain.endsWith('.edu') || domain.endsWith('.edu.ph') || domain.endsWith('.ac.uk')) {
    return true;
  }
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

// POST /api/v1/auth/register
async function register(req, res) {
  const { firstName, lastName, email, password, role } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ status: 400, message: 'Invalid email address format' });
  }

  if (!isLegitEmailDomain(email)) {
    return res.status(400).json({
      status: 400,
      message: 'Please register using a recognized email provider (e.g., Gmail, Yahoo, Outlook, or a university email).',
    });
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    return res.status(400).json({
      status: 400,
      message: 'Password must be at least 8 characters long, contain 1 uppercase letter and 1 number',
    });
  }

  const allowedRoles = ['customer', 'freelancer'];
  const requestedRole = role || 'customer';
  if (!allowedRoles.includes(requestedRole)) {
    return res.status(400).json({ status: 400, message: 'Role must be customer or freelancer' });
  }

  // NOTE: public.users.role is constrained to ('customer' | 'staff' | 'admin') in the DB schema.
  // 'freelancer' is only a valid value for active_role, not role. Passing the raw
  // registration choice straight into `role` will violate that CHECK constraint and
  // silently break freelancer signups (auth user gets created, profile row does not).
  const requestedActiveRole = requestedRole === 'freelancer' ? 'freelancer' : 'customer';

  // Step-2 onboarding details. Freelancer extras (title, location, phone) live in the auth
  // user's metadata (same place updateProfile/getProfile keep them) and payout details in
  // public.payout_details; the client's business type and name live on public.users.
  const { title, location, phone, companyName, clientType } = req.body;
  const clean = (v) => (typeof v === 'string' ? v.trim() : '');
  const hasHtml = (v) => /<[^>]*>/.test(v);

  const profileMeta = {};
  let cleanCompanyName = '';
  let cleanClientType = '';
  let payoutRow = null;
  let paymentRow = null;

  if (requestedActiveRole === 'freelancer') {
    const cleanTitle = clean(title);
    const cleanLocation = clean(location);
    if (cleanTitle.length > 100 || hasHtml(cleanTitle)) {
      return res.status(400).json({ status: 400, message: 'Professional title must be 100 characters or less, without HTML.' });
    }
    if (cleanLocation.length > 150 || hasHtml(cleanLocation)) {
      return res.status(400).json({ status: 400, message: 'Location must be 150 characters or less, without HTML.' });
    }
    const cleanedPhone = cleanPhone(phone);
    if (!cleanedPhone) {
      return res.status(400).json({ status: 400, message: 'Enter a valid mobile number, like 09171234567.' });
    }
    const payout = validatePayout(req.body);
    if (payout.error) {
      return res.status(400).json({ status: 400, message: payout.error });
    }
    payoutRow = payout.row;
    profileMeta.phone = cleanedPhone;
    if (cleanTitle) profileMeta.title = cleanTitle;
    if (cleanLocation) profileMeta.location = cleanLocation;
  } else {
    cleanClientType = clean(clientType);
    if (!CLIENT_TYPES[cleanClientType]) {
      return res.status(400).json({ status: 400, message: 'Choose whether you are hiring as an individual, a small business, or a major contractor.' });
    }
    cleanCompanyName = clean(companyName);
    if (cleanClientType !== 'individual' && cleanCompanyName.length < 2) {
      return res.status(400).json({ status: 400, message: 'Please enter your business name.' });
    }
    if (cleanCompanyName.length > 100 || hasHtml(cleanCompanyName)) {
      return res.status(400).json({ status: 400, message: 'Business name must be 100 characters or less, without HTML.' });
    }
    // How this client will fund escrow
    const payment = validatePaymentMethod(req.body);
    if (payment.error) {
      return res.status(400).json({ status: 400, message: payment.error });
    }
    paymentRow = payment.row;
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: 'customer',
        active_role: requestedActiveRole,
        ...profileMeta,
      },
    },
  });

  if (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }

  // The handle_new_user trigger has already created the public.users row by now.
  // Best-effort: the account exists either way, and anything missing can be added later from
  // the profile (which shows a reminder until it is).
  const newUserId = signUpData?.user?.id;
  if (newUserId && cleanClientType) {
    const clientUpdates = { client_type: cleanClientType };
    if (cleanCompanyName) clientUpdates.company_name = cleanCompanyName;
    let { error: clientError } = await supabaseAdmin.from('users').update(clientUpdates).eq('user_id', newUserId);
    if (clientError && cleanCompanyName) {
      // Before migration 010 there's no client_type column; still keep the business name
      ({ error: clientError } = await supabaseAdmin.from('users').update({ company_name: cleanCompanyName }).eq('user_id', newUserId));
    }
    if (clientError) console.error('Could not save client details at registration:', clientError.message);
  }
  if (newUserId && paymentRow) {
    try {
      await savePaymentMethod(newUserId, paymentRow);
    } catch (err) {
      console.error('Could not save payment method at registration:', err.message);
    }
  }
  if (newUserId && payoutRow) {
    try {
      await savePayout(newUserId, payoutRow);
    } catch (err) {
      console.error('Could not save payout details at registration:', err.message);
    }
  }
  if (newUserId) {
    await logActivity({
      user_id: newUserId,
      category: 'account',
      action: 'account.registered',
      description: `Created an account as a ${requestedActiveRole === 'freelancer' ? 'freelancer' : 'client'}`,
    });
  }

  if (signUpData?.user?.id) {
    logActivity({
      userId: signUpData.user.id,
      action: 'USER_REGISTER',
      details: { email, role: requestedActiveRole },
      ip: req.ip || req.headers['x-forwarded-for'] || null,
    }).catch(() => {});
  }

  return res.status(201).json({ message: 'Registration successful!' });
}

// POST /api/v1/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'email and password are required' });
  }

  // Too many wrong passwords for this email (or from this device) recently
  const blocked = loginBlocked(email, req.ip);
  if (blocked) {
    return res.status(429).json({ status: 429, message: blocked });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const { locked, remaining } = recordLoginFailure(email, req.ip);
    if (locked) {
      await logLockout(email);
      return res.status(429).json({ status: 429, message: loginBlocked(email, req.ip) });
    }
    const warning = remaining <= 2 ? ` ${remaining} attempt${remaining === 1 ? '' : 's'} left before a 15-minute lock.` : '';
    return res.status(401).json({ status: 401, message: `${error.message.replace(/\.$/, '')}.${warning}` });
  }

  clearLoginFailures(email);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('user_id, email, first_name, last_name, role, active_role, status, bio, skills, portfolio_url, avatar_url, client_avatar_url, client_bio, company_name')
    .eq('user_id', data.user.id)
    .single();

  if (profileError || !profile) {
    console.error('Login succeeded but no matching public.users row was found for', data.user.id, profileError);
    return res.status(500).json({
      status: 500,
      message: 'Your account is missing a profile record. Please contact support or re-register.',
    });
  }

  if (profile.status === 'deleted') {
    return res.status(401).json({ status: 401, message: 'Invalid login credentials' });
  }

  if (profile.status === 'suspended') {
    return res.status(403).json({
      status: 403,
      message: 'This account has been suspended. Please contact support.',
    });
  }

  logAuditActivity({
    userId: profile.user_id,
    action: 'USER_LOGIN',
    details: { role: profile.active_role || profile.role },
    ip: req.ip || req.headers['x-forwarded-for'] || null,
  }).catch(() => {});

  await logActivity({
    user_id: profile.user_id,
    category: 'account',
    action: 'account.login',
    description: 'Logged in',
  });

  return res.status(200).json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: profile,
  });
}

// Records a lockout against the account it targeted (if that email belongs to someone)
async function logLockout(email) {
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('user_id')
    .ilike('email', String(email).trim())
    .maybeSingle();
  await logActivity({
    user_id: target?.user_id || null,
    category: 'account',
    action: 'account.login_locked',
    description: `Log-in locked for 15 minutes after too many wrong passwords (${String(email).trim().toLowerCase()})`,
  });
}

// POST /api/v1/auth/refresh
async function refreshSession(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ status: 400, message: 'refreshToken is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      return res.status(401).json({ status: 401, message: 'Invalid or expired refresh token' });
    }

    return res.status(200).json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (err) {
    return res.status(500).json({ status: 500, message: err.message });
  }
}

// PATCH /api/v1/auth/switch-role (Member 1)
async function switchRole(req, res) {
  const { new_role } = req.body;

  if (!['customer', 'freelancer'].includes(new_role)) {
    return res.status(400).json({ status: 400, message: 'Role must be customer or freelancer' });
  }

  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .update({ active_role: new_role })
    .eq('user_id', req.user.id)
    .select('user_id, email, role, active_role, first_name, last_name')
    .single();

  if (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }

  await logActivity({
    user_id: req.user.id,
    category: 'account',
    action: 'account.mode_switched',
    description: `Switched to ${new_role === 'freelancer' ? 'Freelancer' : 'Client'} mode`,
  });

  return res.status(200).json({ message: 'Active role updated', user: profile });
}

// GET /api/v1/auth/profile (Member 1)
async function getProfile(req, res) {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('*') // includes client_type once migration 010 has run
    .eq('user_id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }

  // Fetch extended metadata from auth user
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
  const meta = authData?.user?.user_metadata || {};

  const fullProfile = {
    ...profile,
    title: meta.title || '',
    phone: meta.phone || '',
    location: meta.location || '',
    hourly_rate: meta.hourly_rate || null,
    linkedin_url: meta.linkedin_url || '',
    github_url: meta.github_url || '',
    website_url: meta.website_url || '',
    experience: meta.experience || [],
    education: meta.education || [],
  };

  return res.status(200).json({ success: true, data: fullProfile });
}

// PUT /api/v1/auth/profile (Member 1)
// Only the fields present in the request body are updated, so the freelancer form
// (bio, skills, portfolio_url) and the client form (client_bio, company_name) can each
// save without touching the other mode's data.
async function updateProfile(req, res) {
  const {
    bio, skills, portfolio_url,
    first_name, last_name, title, avatar_url, avatar_base64, avatar_ext, phone, location,
    hourly_rate, linkedin_url, github_url, website_url,
    experience, education, client_bio, company_name, avatar_for, client_type
  } = req.body;

  if (client_type !== undefined) {
    if (!CLIENT_TYPES[client_type]) {
      return res.status(400).json({ status: 400, message: 'Choose individual, small business, or major contractor.' });
    }
    if (client_type !== 'individual' && company_name !== undefined && String(company_name || '').trim().length < 2) {
      return res.status(400).json({ status: 400, message: 'Businesses need a business name.' });
    }
  }

  // Which side's photo an upload replaces: the client photo or the freelancer photo (default)
  const avatarTarget = avatar_for === 'customer' ? AVATAR_TARGETS.customer : AVATAR_TARGETS.freelancer;

  if (bio && bio.length > 2000) {
    return res.status(400).json({ status: 400, message: 'Bio must be 2000 characters or less' });
  }
  if (client_bio && client_bio.length > 500) {
    return res.status(400).json({ status: 400, message: 'Client bio must be 500 characters or less' });
  }
  if (company_name && company_name.length > 100) {
    return res.status(400).json({ status: 400, message: 'Company name must be 100 characters or less' });
  }

  // Handle Base64 Avatar Upload bypassing RLS using Service Role Key
  let finalAvatarUrl = avatar_url;
  if (avatar_base64 && avatar_ext) {
    try {
      // Strip out the data:image/png;base64, part if present
      const base64Data = avatar_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const filePath = `${req.user.id}/${avatarTarget.filePrefix}-${Date.now()}.${avatar_ext}`;

      // Determine mime type
      const mimeType = avatar_ext === 'png' ? 'image/png' : (avatar_ext === 'webp' ? 'image/webp' : 'image/jpeg');

      const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload image to storage');
      }

      const { data: urlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);
      finalAvatarUrl = urlData.publicUrl;
    } catch (err) {
      return res.status(500).json({ status: 500, message: err.message });
    }
  }

  // Build update payload for public.users
  const userUpdates = {};
  if (first_name !== undefined) userUpdates.first_name = first_name;
  if (last_name !== undefined) userUpdates.last_name = last_name;
  if (bio !== undefined) userUpdates.bio = bio;
  if (skills !== undefined) userUpdates.skills = skills;
  if (portfolio_url !== undefined) userUpdates.portfolio_url = portfolio_url;
  if (client_bio !== undefined) userUpdates.client_bio = client_bio;
  if (company_name !== undefined) userUpdates.company_name = company_name;
  if (client_type !== undefined) userUpdates.client_type = client_type;
  if (finalAvatarUrl !== undefined) userUpdates[avatarTarget.column] = finalAvatarUrl;

  // Build update payload for auth metadata
  const metaUpdates = {};
  if (title !== undefined) metaUpdates.title = title;
  if (phone !== undefined) metaUpdates.phone = phone;
  if (location !== undefined) metaUpdates.location = location;
  if (hourly_rate !== undefined) metaUpdates.hourly_rate = hourly_rate;
  if (linkedin_url !== undefined) metaUpdates.linkedin_url = linkedin_url;
  if (github_url !== undefined) metaUpdates.github_url = github_url;
  if (website_url !== undefined) metaUpdates.website_url = website_url;
  if (experience !== undefined) metaUpdates.experience = experience;
  if (education !== undefined) metaUpdates.education = education;

  try {
    let updatedProfile = {};

    // 1. Update public.users if needed
    if (Object.keys(userUpdates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(userUpdates)
        .eq('user_id', req.user.id)
        .select()
        .single();
      if (error) throw error;
      updatedProfile = data;
    }

    // 2. Update auth metadata if needed
    if (Object.keys(metaUpdates).length > 0) {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
        user_metadata: metaUpdates
      });
      if (error) throw error;
      
      const meta = data.user.user_metadata || {};
      updatedProfile = {
        ...updatedProfile,
        title: meta.title || '',
        phone: meta.phone || '',
        location: meta.location || '',
        hourly_rate: meta.hourly_rate || null,
        linkedin_url: meta.linkedin_url || '',
        github_url: meta.github_url || '',
        website_url: meta.website_url || '',
        experience: meta.experience || [],
        education: meta.education || [],
      };
    }

    logAuditActivity({
      userId: req.user.id,
      action: 'PROFILE_UPDATE',
      details: { role: req.user.active_role },
      ip: req.ip || req.headers['x-forwarded-for'] || null,
    }).catch(() => {});

    await logActivity({
      user_id: req.user.id,
      category: 'account',
      action: finalAvatarUrl !== undefined ? 'account.photo_changed' : 'account.profile_updated',
      description: finalAvatarUrl !== undefined
        ? `Changed ${avatarTarget.column === 'client_avatar_url' ? 'client' : 'freelancer'} profile photo`
        : `Updated ${client_bio !== undefined || company_name !== undefined || client_type !== undefined ? 'client' : 'freelancer'} profile details`,
    });

    return res.status(200).json({ message: 'Profile updated successfully', data: updatedProfile });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ status: 500, message: err.message || 'Failed to update profile' });
  }
}

// POST /api/v1/auth/profile/avatar
// Expects multipart/form-data with one image file in the "avatar" field
// (parsed by middleware/upload.js, which also enforces the 2 MB limit).
// Sets the photo for the mode the user is currently in (freelancer or client).
async function uploadAvatar(req, res) {
  const target = avatarTargetFor(req.user);

  if (!req.file) {
    return res.status(400).json({ status: 400, message: 'No image file was uploaded' });
  }

  const type = detectImageType(req.file.buffer);
  if (!type) {
    return res.status(400).json({ status: 400, message: 'Only JPG, PNG, or WebP images are allowed' });
  }

  // A fresh filename per upload means the new photo is never served from a stale cache.
  const fileName = `${target.filePrefix}-${Date.now()}.${type.ext}`;
  const filePath = `${req.user.id}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, req.file.buffer, {
      contentType: type.mime,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({ status: 500, message: uploadError.message });
  }

  const { data: urlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
  const avatarUrl = urlData.publicUrl;

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ [target.column]: avatarUrl })
    .eq('user_id', req.user.id);

  if (updateError) {
    // Don't leave an orphaned file behind if the DB write failed.
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([filePath]);
    return res.status(500).json({ status: 500, message: updateError.message });
  }

  // Replace, don't accumulate: drop the user's previous photo(s).
  await clearAvatarFiles(req.user.id, target.filePrefix, fileName);

  // `field` tells the frontend which users column changed, so it updates the right cached photo.
  return res.status(200).json({
    message: 'Profile photo updated',
    data: { avatar_url: avatarUrl, field: target.column },
  });
}

// DELETE /api/v1/auth/profile/avatar
// Removes the photo for the mode the user is currently in.
async function removeAvatar(req, res) {
  const target = avatarTargetFor(req.user);

  const { error } = await supabaseAdmin
    .from('users')
    .update({ [target.column]: null })
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }

  await clearAvatarFiles(req.user.id, target.filePrefix, null);

  return res.status(200).json({
    message: 'Profile photo removed',
    data: { avatar_url: null, field: target.column },
  });
}

// GET /api/v1/auth/activity
async function getActivityLogs(req, res) {
  try {
    const logs = await getUserActivityLogs(req.user.id);
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { register, login, refreshSession, switchRole, getProfile, updateProfile, uploadAvatar, removeAvatar, logout, forgotPassword, resetPassword, changePassword, getActivityLogs, getPayoutDetails, updatePayoutDetails, getPaymentMethodDetails, updatePaymentMethodDetails };

// Same rule as registration.
const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters long, contain 1 uppercase letter and 1 number';

// Reads the claims of a JWT that Supabase has already verified (via auth.getUser).
function decodeJwtPayload(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

// POST /api/v1/auth/forgot-password  { email }
// Asks Supabase to email a reset link that opens the frontend's /reset-password page.
// Always answers the same way so the form can't be used to find out which emails have accounts.
async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 400, message: 'Please enter a valid email address.' });
  }

  // At most 3 reset emails per address per hour. The answer stays the same either way.
  if (!allowPasswordReset(email)) {
    return res.status(200).json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  }

  // The link must point at an address listed under Supabase Auth > URL Configuration > Redirect URLs.
  const frontendUrl = (process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173').replace(/\/$/, '');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${frontendUrl}/reset-password`,
  });
  if (error) {
    // Logged for debugging (e.g. email rate limit or SMTP setup), never shown to the requester.
    console.error('resetPasswordForEmail failed:', error.message);
  }

  return res.status(200).json({
    message: 'If an account exists for that email, a password reset link has been sent.',
  });
}

// POST /api/v1/auth/reset-password  { access_token, password }
// access_token comes from the emailed reset link. Only tokens issued for a password
// recovery are accepted, so an ordinary login token can't be used to skip the current password.
async function resetPassword(req, res) {
  const { access_token: accessToken, password } = req.body || {};
  if (!accessToken || typeof accessToken !== 'string') {
    return res.status(400).json({ status: 400, message: 'This reset link is invalid. Please request a new one.' });
  }
  if (!password || !PASSWORD_RULE.test(password)) {
    return res.status(400).json({ status: 400, message: PASSWORD_RULE_MESSAGE });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return res.status(400).json({ status: 400, message: 'This reset link has expired or was already used. Please request a new one.' });
  }

  const methods = (decodeJwtPayload(accessToken).amr || []).map((a) => a.method);
  if (!methods.some((m) => m === 'recovery' || m === 'otp')) {
    return res.status(400).json({ status: 400, message: 'This link is not a password reset link. Please request a new one.' });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, { password });
  if (updateError) {
    return res.status(400).json({ status: 400, message: updateError.message });
  }

  await logActivity({
    user_id: data.user.id,
    category: 'account',
    action: 'account.password_reset',
    description: 'Reset password using an emailed link',
  });

  return res.status(200).json({ message: 'Your password has been reset. You can now log in.' });
}

// PATCH /api/v1/auth/password  { current_password, new_password }  (logged in)
async function changePassword(req, res) {
  const { current_password: currentPassword, new_password: newPassword } = req.body || {};
  if (!currentPassword) {
    return res.status(400).json({ status: 400, message: 'Please enter your current password.' });
  }
  if (!newPassword || !PASSWORD_RULE.test(newPassword)) {
    return res.status(400).json({ status: 400, message: PASSWORD_RULE_MESSAGE });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ status: 400, message: 'Your new password must be different from the current one.' });
  }

  // Same guessing limit as the login form
  const blocked = loginBlocked(req.user.email, req.ip);
  if (blocked) {
    return res.status(429).json({ status: 429, message: blocked });
  }

  // Confirm the current password before changing it.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword,
  });
  if (signInError) {
    const { locked } = recordLoginFailure(req.user.email, req.ip);
    if (locked) await logLockout(req.user.email);
    return res.status(400).json({ status: 400, message: 'Your current password is incorrect.' });
  }
  clearLoginFailures(req.user.email);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password: newPassword });
  if (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }

  logAuditActivity({
    userId: req.user.id,
    action: 'PASSWORD_CHANGE',
    details: {},
    ip: req.ip || req.headers['x-forwarded-for'] || null,
  }).catch(() => {});

  await logActivity({
    user_id: req.user.id,
    category: 'account',
    action: 'account.password_changed',
    description: 'Changed password',
  });

  return res.status(200).json({ message: 'Password updated successfully.' });
}

// GET /api/v1/auth/payout - Your own payout details, masked (•••• 1234). null if none yet.
async function getPayoutDetails(req, res) {
  try {
    const row = await getPayout(req.user.id);
    return res.status(200).json({ success: true, data: maskPayout(row) });
  } catch (err) {
    console.error('getPayoutDetails error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not load payout details. Make sure migration 010 has been run.' });
  }
}

// GET /api/v1/auth/payment-method - Your own client payment method, masked. null if none yet.
async function getPaymentMethodDetails(req, res) {
  try {
    const row = await getPaymentMethod(req.user.id);
    return res.status(200).json({ success: true, data: maskPaymentMethod(row) });
  } catch (err) {
    console.error('getPaymentMethodDetails error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not load your payment method. Make sure migration 011 has been run.' });
  }
}

// PUT /api/v1/auth/payment-method
// { paymentMethod, paymentProvider?, paymentAccountName, paymentAccountNumber, cardExpiry? }
async function updatePaymentMethodDetails(req, res) {
  const payment = validatePaymentMethod(req.body || {});
  if (payment.error) {
    return res.status(400).json({ success: false, error: payment.error });
  }
  try {
    const masked = maskPaymentMethod(await savePaymentMethod(req.user.id, payment.row));
    await logActivity({
      user_id: req.user.id,
      category: 'account',
      action: 'account.payment_method_updated',
      description: `Updated client payment method (${masked.provider_name || masked.method_label} •••• ${masked.account_last4})`,
    });
    return res.status(200).json({ success: true, data: masked });
  } catch (err) {
    console.error('updatePaymentMethodDetails error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not save your payment method. Make sure migration 011 has been run.' });
  }
}

// PUT /api/v1/auth/payout { payoutMethod, payoutProvider?, accountName, accountNumber }
async function updatePayoutDetails(req, res) {
  const payout = validatePayout(req.body || {});
  if (payout.error) {
    return res.status(400).json({ success: false, error: payout.error });
  }
  try {
    const masked = maskPayout(await savePayout(req.user.id, payout.row));
    await logActivity({
      user_id: req.user.id,
      category: 'account',
      action: 'account.payout_updated',
      description: `Updated payout details (${masked.method_label} •••• ${masked.account_last4})`,
    });
    return res.status(200).json({ success: true, data: masked });
  } catch (err) {
    console.error('updatePayoutDetails error:', err.message);
    return res.status(500).json({ success: false, error: 'Could not save payout details. Make sure migration 010 has been run.' });
  }
}

// POST /api/v1/auth/logout
// Securely invalidates the user's session (for stateless JWT, this signals the client to clear tokens)
async function logout(req, res) {
  // In a full enterprise system with stateful tokens, we would blacklist the JWT here.
  // For stateless JWTs, we just return a success to confirm the client should proceed with local cleanup.
  res.status(200).json({ message: 'Successfully logged out.' });
};



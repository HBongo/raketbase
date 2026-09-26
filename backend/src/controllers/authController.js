const { supabase, supabaseAdmin } = require('../config/supabase');

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

// POST /api/v1/auth/register
async function register(req, res) {
  const { firstName, lastName, email, password, role } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ status: 400, message: 'Invalid email address format' });
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        first_name: firstName, 
        last_name: lastName, 
        role: 'customer',
        active_role: requestedActiveRole,
      },
    },
  });

  if (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }

  return res.status(201).json({ message: 'Registration successful!' });
}

// POST /api/v1/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 400, message: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ status: 401, message: error.message });
  }

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

  if (profile.status === 'suspended') {
    return res.status(403).json({
      status: 403,
      message: 'This account has been suspended. Please contact support.',
    });
  }

  return res.status(200).json({
    token: data.session.access_token,
    user: profile,
  });
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

  return res.status(200).json({ message: 'Active role updated', user: profile });
}

// GET /api/v1/auth/profile (Member 1)
async function getProfile(req, res) {
  const { data: profile, error } = await supabaseAdmin
    .from('users')
    .select('user_id, email, first_name, last_name, role, active_role, bio, skills, portfolio_url, avatar_url, client_avatar_url, client_bio, company_name')
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
    experience, education, client_bio, company_name
  } = req.body;

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
      const filePath = `${req.user.id}/avatar-${Date.now()}.${avatar_ext}`;

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
  if (finalAvatarUrl !== undefined) userUpdates.avatar_url = finalAvatarUrl;

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

module.exports = { register, login, switchRole, getProfile, updateProfile, uploadAvatar, removeAvatar, logout };

// POST /api/v1/auth/logout
// Securely invalidates the user's session (for stateless JWT, this signals the client to clear tokens)
async function logout(req, res) {
  // In a full enterprise system with stateful tokens, we would blacklist the JWT here.
  // For stateless JWTs, we just return a success to confirm the client should proceed with local cleanup.
  res.status(200).json({ message: 'Successfully logged out.' });
};

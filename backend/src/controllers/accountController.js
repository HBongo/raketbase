const crypto = require('crypto');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { logActivity } = require('../utils/activity');
const { notify, displayName } = require('../utils/notify');
const { loginBlocked, recordLoginFailure, clearLoginFailures } = require('../utils/loginLimiter');

const IN_PROGRESS = ['active', 'submitted', 'disputed'];
const AVATAR_BUCKET = 'avatars';

// DELETE /api/v1/auth/account  { password, confirm: 'DELETE' }
// Deletes your own account by anonymizing it: personal data is wiped and the login is blocked
// for good, while contracts, chats and reviews shared with other people stay (shown as
// "Deleted user"). Blocked while any contract is still in progress. Admin/staff can't use it.
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const { password, confirm } = req.body || {};

  if (req.user.role === 'admin' || req.user.role === 'staff') {
    return res.status(403).json({ success: false, error: 'Admin and staff accounts can\'t be deleted from the profile page.' });
  }
  if (confirm !== 'DELETE') {
    return res.status(400).json({ success: false, error: 'Type DELETE to confirm.' });
  }
  if (!password) {
    return res.status(400).json({ success: false, error: 'Enter your password to confirm.' });
  }

  // Same guessing limit as the login form
  const blocked = loginBlocked(req.user.email, req.ip);
  if (blocked) return res.status(429).json({ success: false, error: blocked });

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: req.user.email, password });
  if (signInError) {
    recordLoginFailure(req.user.email, req.ip);
    return res.status(400).json({ success: false, error: 'Your password is incorrect.' });
  }
  clearLoginFailures(req.user.email);

  try {
    // 1. Nothing can be in progress: escrow is held and the other person is relying on the work
    const { data: openContracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('contract_id, status, jobs(title)')
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
      .in('status', IN_PROGRESS);
    if (contractsError) throw contractsError;
    if (openContracts && openContracts.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'CONTRACTS_IN_PROGRESS',
        error: 'Finish or resolve your contracts in progress before deleting your account.',
        data: { contracts: openContracts.map((c) => ({ contract_id: c.contract_id, status: c.status, title: c.jobs?.title || 'Untitled contract' })) },
      });
    }

    const name = displayName(req.user, 'A user');
    const now = new Date().toISOString();

    // 2. Anonymize the profile first. Before migration 012 the 'deleted' status is rejected here,
    //    so nothing else has changed if this fails.
    const { error: anonymizeError } = await supabaseAdmin
      .from('users')
      .update({
        status: 'deleted',
        deleted_at: now,
        email: `deleted-${userId}@deleted.raketbase.invalid`,
        first_name: 'Deleted',
        last_name: 'user',
        bio: null,
        skills: null,
        portfolio_url: null,
        avatar_url: null,
        client_avatar_url: null,
        client_bio: null,
        company_name: null,
        client_type: null,
      })
      .eq('user_id', userId);
    if (anonymizeError) {
      console.error('deleteAccount anonymize failed:', anonymizeError.message);
      return res.status(500).json({
        success: false,
        error: 'Could not delete the account. Make sure migrations 010 and 012 have been run, then try again.',
      });
    }

    // 3. Close anything still open, and tell the people affected
    const notices = [];

    // Their open / paused job postings are cancelled; pending bids on them are closed
    const { data: cancelledJobs } = await supabaseAdmin
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('client_id', userId)
      .in('status', ['open', 'paused'])
      .select('job_id, title');
    for (const job of cancelledJobs || []) {
      const { data: closed } = await supabaseAdmin
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('job_id', job.job_id)
        .eq('status', 'pending')
        .select('freelancer_id');
      for (const p of closed || []) {
        notices.push({
          user_id: p.freelancer_id,
          type: 'job_cancelled',
          role: 'freelancer',
          title: `"${job.title}" is no longer available`,
          body: 'The client deleted their account, so this job was closed.',
          link: '/my-proposals',
        });
      }
    }

    // Their own pending bids are withdrawn
    await supabaseAdmin.from('proposals').update({ status: 'withdrawn' }).eq('freelancer_id', userId).eq('status', 'pending');

    // Pending direct offers: ones they sent are withdrawn, ones they received are declined
    const { data: sentOffers } = await supabaseAdmin
      .from('direct_offers')
      .update({ status: 'withdrawn' })
      .eq('client_id', userId)
      .eq('status', 'pending')
      .select('freelancer_id, title');
    for (const o of sentOffers || []) {
      notices.push({
        user_id: o.freelancer_id,
        type: 'offer_withdrawn',
        role: 'freelancer',
        title: 'An offer was withdrawn',
        body: `The client deleted their account, so the offer "${o.title}" was withdrawn.`,
        link: '/my-proposals?tab=offers',
      });
    }
    const { data: receivedOffers } = await supabaseAdmin
      .from('direct_offers')
      .update({ status: 'declined' })
      .eq('freelancer_id', userId)
      .eq('status', 'pending')
      .select('client_id, title');
    for (const o of receivedOffers || []) {
      notices.push({
        user_id: o.client_id,
        type: 'offer_declined',
        role: 'customer',
        title: `${name} is no longer available`,
        body: `They deleted their account, so your offer "${o.title}" was closed.`,
        link: '/my-jobs?tab=offers',
      });
    }

    // 4. Wipe the rest of their personal data
    await supabaseAdmin.from('payout_details').delete().eq('user_id', userId);
    await supabaseAdmin.from('client_payment_methods').delete().eq('user_id', userId);
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId);

    const { data: files } = await supabaseAdmin.storage.from(AVATAR_BUCKET).list(userId);
    if (files && files.length) {
      await supabaseAdmin.storage.from(AVATAR_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
    }

    // 5. Block the login for good: new unusable email and password, metadata cleared, banned.
    //    The auth user itself is kept so nothing linked to it can be removed by accident.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: `deleted-${userId}@deleted.raketbase.invalid`,
      email_confirm: true,
      password: crypto.randomBytes(32).toString('base64url'),
      user_metadata: {
        first_name: 'Deleted', last_name: 'user', title: null, phone: null, location: null,
        hourly_rate: null, linkedin_url: null, github_url: null, website_url: null, experience: [], education: [],
      },
      ban_duration: '876000h',
    });
    if (authError) console.error('deleteAccount auth update failed:', authError.message);

    await notify(notices);
    await logActivity({
      user_id: userId,
      category: 'account',
      action: 'account.deleted',
      description: 'Deleted their account (personal data removed)',
    });

    return res.status(200).json({ success: true, message: 'Your account has been deleted.' });
  } catch (err) {
    console.error('deleteAccount error:', err.message);
    return res.status(500).json({ success: false, error: 'Something went wrong while deleting your account.' });
  }
};

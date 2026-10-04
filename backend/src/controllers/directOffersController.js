const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const { logActivity } = require('../utils/activity');
const { validateJobInput } = require('../utils/slopFilter');
const { notify, displayName } = require('../utils/notify');
const { hasPayout, PAYOUT_REQUIRED_MESSAGE } = require('../utils/payout');
const { hasPaymentMethod, PAYMENT_METHOD_REQUIRED_MESSAGE } = require('../utils/paymentMethod');

const OFFER_BUCKET = 'offer-attachments';

const OFFER_SELECT = `
  offer_id, client_id, freelancer_id, title, description, amount, currency, deadline,
  status, job_id, contract_id, created_at, responded_at,
  direct_offer_files ( file_id, file_name, file_size, file_mime_type ),
  client:users!direct_offers_client_id_fkey ( user_id, first_name, last_name, avatar_url, company_name ),
  freelancer:users!direct_offers_freelancer_id_fkey ( user_id, first_name, last_name, avatar_url )
`;

async function loadOffer(offerId) {
  const { data, error } = await supabaseAdmin
    .from('direct_offers')
    .select(OFFER_SELECT)
    .eq('offer_id', offerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Storage keys can't contain every character a filename can.
function safeFileName(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

// POST /api/v1/offers  (multipart: title, description, amount, currency, deadline?, freelancer_id, files[] up to 3)
// A client sends a freelancer a direct offer from the freelancer's profile ("Hire Me").
exports.createOffer = async (req, res) => {
  try {
    if (req.user.active_role !== 'customer') {
      return res.status(403).json({ success: false, error: 'Switch to Client mode to send offers.' });
    }

    const { freelancer_id: freelancerId, title, description, amount, deadline } = req.body;
    const currency = req.body.currency === 'USD' ? 'USD' : 'PHP';

    if (!freelancerId) {
      return res.status(400).json({ success: false, error: 'Missing the freelancer to send this offer to.' });
    }
    if (freelancerId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot send an offer to yourself.' });
    }
    // An accepted offer puts the amount in escrow, so the client needs a way to pay
    if (!(await hasPaymentMethod(req.user.id))) {
      return res.status(409).json({ success: false, code: 'PAYMENT_METHOD_REQUIRED', error: PAYMENT_METHOD_REQUIRED_MESSAGE });
    }

    // Same anti-slop rules as job postings (no HTML, no shouting, no off-platform contact, budget floor).
    const validation = validateJobInput({ title, description, budget: amount, currency });
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.errors[0], errors: validation.errors });
    }
    if (deadline && new Date(deadline).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Deadline must be a future date.' });
    }

    const { data: freelancer } = await supabaseAdmin
      .from('users')
      .select('user_id, status')
      .eq('user_id', freelancerId)
      .maybeSingle();
    if (!freelancer || freelancer.status === 'suspended' || freelancer.status === 'deleted') {
      return res.status(404).json({ success: false, error: 'That freelancer is not available.' });
    }

    const { data: offer, error } = await supabaseAdmin
      .from('direct_offers')
      .insert([{
        client_id: req.user.id,
        freelancer_id: freelancerId,
        title: title.trim(),
        description: description.trim(),
        amount: Number(amount),
        currency,
        deadline: deadline || null,
      }])
      .select('offer_id')
      .single();
    if (error) throw error;

    // Upload attachments. If any upload fails, remove the offer and what was uploaded
    // so the client can simply try again.
    const files = req.files || [];
    const uploadedPaths = [];
    try {
      for (const file of files) {
        const filePath = `${offer.offer_id}/${crypto.randomUUID()}-${safeFileName(file.originalname)}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(OFFER_BUCKET)
          .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(filePath);
        const { error: fileRowError } = await supabaseAdmin.from('direct_offer_files').insert([{
          offer_id: offer.offer_id,
          file_name: file.originalname,
          file_path: filePath,
          file_size: file.size,
          file_mime_type: file.mimetype,
        }]);
        if (fileRowError) throw fileRowError;
      }
    } catch (uploadErr) {
      if (uploadedPaths.length) await supabaseAdmin.storage.from(OFFER_BUCKET).remove(uploadedPaths);
      await supabaseAdmin.from('direct_offers').delete().eq('offer_id', offer.offer_id);
      console.error('Offer attachment upload failed:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Could not upload your files. Please try again.' });
    }

    await notify({
      user_id: freelancerId,
      type: 'offer_received',
      role: 'freelancer',
      title: `${displayName(req.user, 'A client')} wants to hire you`,
      body: `New offer: "${title.trim()}". Review it in My Proposals → Offers received.`,
      link: '/my-proposals?tab=offers',
    });

    await logActivity({
      user_id: req.user.id,
      category: 'jobs',
      action: 'offer.sent',
      description: `Sent a direct offer "${offer.title}"`,
      target_type: 'offer',
      target_id: offer.offer_id,
      link: '/my-jobs?tab=offers',
    });

    return res.status(201).json({ success: true, data: await loadOffer(offer.offer_id) });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/offers/received  — offers sent to the logged-in user (as a freelancer)
exports.listReceived = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('direct_offers')
      .select(OFFER_SELECT)
      .eq('freelancer_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/offers/sent  — offers the logged-in user sent (as a client)
exports.listSent = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('direct_offers')
      .select(OFFER_SELECT)
      .eq('client_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/v1/offers/:id/files/:fileId/download  — short-lived signed URL (participants only)
exports.getFileUrl = async (req, res) => {
  try {
    const offer = await loadOffer(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    if (offer.client_id !== req.user.id && offer.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You are not part of this offer' });
    }

    const { data: file } = await supabaseAdmin
      .from('direct_offer_files')
      .select('file_name, file_path')
      .eq('file_id', req.params.fileId)
      .eq('offer_id', offer.offer_id)
      .maybeSingle();
    if (!file) return res.status(404).json({ success: false, error: 'File not found' });

    const { data, error } = await supabaseAdmin.storage
      .from(OFFER_BUCKET)
      .createSignedUrl(file.file_path, 3600, { download: file.file_name });
    if (error) throw error;

    return res.status(200).json({ success: true, data: { url: data.signedUrl, file_name: file.file_name } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Moves a pending offer to a new status, only if it is still pending (so two
// clicks, or an accept racing a withdraw, can't both win). Returns the row or null.
async function claimPendingOffer(offerId, status) {
  const { data, error } = await supabaseAdmin
    .from('direct_offers')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('offer_id', offerId)
    .eq('status', 'pending')
    .select('offer_id')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// PATCH /api/v1/offers/:id/accept  — freelancer accepts: creates a private job,
// an active contract at the offered price, and the contract chat.
exports.acceptOffer = async (req, res) => {
  try {
    const offer = await loadOffer(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    if (offer.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the freelancer this offer was sent to can accept it.' });
    }
    if (!(await hasPayout(req.user.id))) {
      return res.status(409).json({ success: false, code: 'PAYOUT_REQUIRED', error: PAYOUT_REQUIRED_MESSAGE });
    }
    if (!(await claimPendingOffer(offer.offer_id, 'accepted'))) {
      return res.status(409).json({ success: false, error: `This offer is no longer pending.` });
    }

    let job = null;
    let contract = null;
    try {
      const jobPayload = {
        client_id: offer.client_id,
        title: offer.title,
        description: offer.description,
        budget: offer.amount,
        budget_type: 'fixed',
        deadline: offer.deadline,
        status: 'assigned',
        is_direct: true,
        currency: offer.currency,
      };
      let jobRes = await supabaseAdmin.from('jobs').insert([jobPayload]).select().single();
      // Same fallback as createJob while the jobs.currency migration hasn't been run.
      if (jobRes.error && jobRes.error.message && jobRes.error.message.includes('currency')) {
        delete jobPayload.currency;
        jobRes = await supabaseAdmin.from('jobs').insert([jobPayload]).select().single();
      }
      if (jobRes.error) throw jobRes.error;
      job = jobRes.data;

      const { data: newContract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .insert([{
          job_id: job.job_id,
          client_id: offer.client_id,
          freelancer_id: offer.freelancer_id,
          agreed_amount: offer.amount,
          status: 'active',
        }])
        .select()
        .single();
      if (contractError) throw contractError;
      contract = newContract;
    } catch (createErr) {
      // Undo so the offer can be accepted again once the problem is fixed.
      if (job) await supabaseAdmin.from('jobs').delete().eq('job_id', job.job_id);
      await supabaseAdmin
        .from('direct_offers')
        .update({ status: 'pending', responded_at: null })
        .eq('offer_id', offer.offer_id);
      throw createErr;
    }

    await supabaseAdmin
      .from('direct_offers')
      .update({ job_id: job.job_id, contract_id: contract.contract_id })
      .eq('offer_id', offer.offer_id);

    // Contract chat, same as accepting a proposal. Best-effort.
    const { error: chatError } = await supabaseAdmin.from('conversations').insert([{
      contract_id: contract.contract_id,
      client_id: offer.client_id,
      freelancer_id: offer.freelancer_id,
      title: offer.title,
    }]);
    if (chatError) console.error('Failed to create conversation for offer contract', contract.contract_id, chatError);

    await notify({
      user_id: offer.client_id,
      type: 'offer_accepted',
      role: 'customer',
      title: `${displayName(offer.freelancer, 'The freelancer')} accepted your offer`,
      body: `"${offer.title}" is now an active contract. You can chat with them from your Dashboard.`,
      link: '/dashboard',
    });

    await logActivity([
      {
        user_id: offer.freelancer_id,
        category: 'contracts',
        action: 'offer.accepted',
        description: `Accepted the direct offer "${offer.title}" — contract started`,
        target_type: 'contract',
        target_id: contract?.contract_id,
        link: '/dashboard',
      },
      {
        user_id: offer.client_id,
        category: 'contracts',
        action: 'contract.started',
        description: `Your direct offer "${offer.title}" was accepted — contract started and payment held in escrow`,
        target_type: 'contract',
        target_id: contract?.contract_id,
        link: '/dashboard',
      },
    ]);

    return res.status(200).json({ success: true, data: { offer_id: offer.offer_id, contract } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/offers/:id/decline  — freelancer turns it down
exports.declineOffer = async (req, res) => {
  try {
    const offer = await loadOffer(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    if (offer.freelancer_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the freelancer this offer was sent to can decline it.' });
    }
    if (!(await claimPendingOffer(offer.offer_id, 'declined'))) {
      return res.status(409).json({ success: false, error: 'This offer is no longer pending.' });
    }

    await notify({
      user_id: offer.client_id,
      type: 'offer_declined',
      role: 'customer',
      title: `${displayName(offer.freelancer, 'The freelancer')} declined your offer`,
      body: `"${offer.title}" was declined. You can browse other freelancers or post it as a job.`,
      link: '/my-jobs?tab=offers',
    });

    await logActivity({
      user_id: req.user.id,
      category: 'jobs',
      action: 'offer.declined',
      description: `Declined the direct offer "${offer.title}"`,
      target_type: 'offer',
      target_id: offer.offer_id,
      link: '/my-proposals?tab=offers',
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/v1/offers/:id/withdraw  — client takes back a pending offer
exports.withdrawOffer = async (req, res) => {
  try {
    const offer = await loadOffer(req.params.id);
    if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
    if (offer.client_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the client who sent this offer can withdraw it.' });
    }
    if (!(await claimPendingOffer(offer.offer_id, 'withdrawn'))) {
      return res.status(409).json({ success: false, error: 'This offer is no longer pending.' });
    }

    await notify({
      user_id: offer.freelancer_id,
      type: 'offer_withdrawn',
      role: 'freelancer',
      title: `An offer was withdrawn`,
      body: `${displayName(offer.client, 'The client')} withdrew their offer "${offer.title}".`,
      link: '/my-proposals?tab=offers',
    });

    await logActivity({
      user_id: req.user.id,
      category: 'jobs',
      action: 'offer.withdrawn',
      description: `Withdrew the direct offer "${offer.title}"`,
      target_type: 'offer',
      target_id: offer.offer_id,
      link: '/my-jobs?tab=offers',
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

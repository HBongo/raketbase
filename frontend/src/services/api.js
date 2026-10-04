const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
// Used by the live-updates connection (utils/live.js)
export const API_BASE = API_URL;

let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !options._isRetry) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          const refreshData = await refreshRes.json().catch(() => ({}));
          if (refreshRes.ok && refreshData.token) {
            localStorage.setItem('token', refreshData.token);
            if (refreshData.refreshToken) {
              localStorage.setItem('refreshToken', refreshData.refreshToken);
            }
            isRefreshing = false;
            onTokenRefreshed(refreshData.token);
            return request(path, { ...options, _isRetry: true });
          }
        } catch (e) {
          console.warn('Auto token refresh failed:', e);
        }
        isRefreshing = false;
        onTokenRefreshed(null);
      } else {
        // Wait for active refresh request to resolve
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((newToken) => {
            if (newToken) {
              resolve(request(path, { ...options, _isRetry: true }));
            } else {
              reject(new Error('Your session has expired. Please log in again.'));
            }
          });
        });
      }
    }

    // No refresh token available or refresh failed
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login?expired=1';
    }

    throw new Error('Your session has expired. Please log in again.');
  }

  // An admin suspended this account while it was logged in: sign out right away
  if (res.status === 403 && data.code === 'ACCOUNT_SUSPENDED') {
    forceLogout('suspended');
    throw new Error('This account has been suspended.');
  }
  if (res.status === 403 && data.code === 'ACCOUNT_DELETED') {
    forceLogout('deleted');
    throw new Error('This account has been deleted.');
  }

  if (!res.ok) {
    // Keep the server's error code and details (e.g. which contracts block an action)
    const err = new Error(data.message || data.error || 'Something went wrong');
    err.code = data.code;
    err.data = data.data;
    throw err;
  }

  return data;
}

// Clears the saved session and sends the user to the login page with a reason (?suspended=1)
export function forceLogout(reason) {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?${reason}=1`;
  }
}

// Authentication & Profile API
export function registerUser(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// accessToken comes from the emailed reset link
export function resetPassword(accessToken, password) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken, password }),
  });
}

export function changePassword(currentPassword, newPassword) {
  return request('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function switchRole(new_role) {
  return request('/auth/switch-role', {
    method: 'PATCH',
    body: JSON.stringify({ new_role }),
  });
}

export function getProfile() {
  return request('/auth/profile');
}

export function updateProfile(payload) {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Users API — Public profile
export function getFreelancerProfile(userId) {
  return request(`/users/${userId}`);
}

// Jobs API
export function getJobs(categoryId) {
  const query = categoryId ? `?category_id=${categoryId}` : '';
  return request(`/jobs${query}`);
}

export function getCategories() {
  return request('/jobs/categories');
}

export function getJobById(id) {
  return request(`/jobs/${id}`);
}

export function createJob(payload) {
  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyJobs() {
  return request('/jobs/mine');
}

export function getJobProposals(jobId) {
  return request(`/jobs/${jobId}/proposals`);
}

// Job lifecycle (client-owned postings)
export function updateJob(jobId, payload) {
  return request(`/jobs/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function pauseJob(jobId) {
  return request(`/jobs/${jobId}/pause`, { method: 'PATCH' });
}

export function resumeJob(jobId) {
  return request(`/jobs/${jobId}/resume`, { method: 'PATCH' });
}

export function cancelJob(jobId) {
  return request(`/jobs/${jobId}/cancel`, { method: 'PATCH' });
}

// Proposal API
export function submitProposal(payload) {
  return request('/proposals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// A short-lived link to one proposal attachment (freelancer or the job's client only)
export function getProposalFileUrl(proposalId, fileId) {
  return request(`/proposals/${proposalId}/files/${fileId}/download`);
}

export function getMyProposals() {
  return request('/proposals/me');
}

export function acceptProposal(proposalId) {
  return request(`/proposals/${proposalId}/accept`, { method: 'PATCH' });
}

export function rejectProposal(proposalId) {
  return request(`/proposals/${proposalId}/reject`, { method: 'PATCH' });
}

// Contract Execution & Escrow API (Part 3)
export function getContracts() {
  return request('/contracts');
}

export function getContractById(contractId) {
  return request(`/contracts/${contractId}`);
}

export function submitContractWork(contractId, payload = {}) {
  return request(`/contracts/${contractId}/submit`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function completeContract(contractId) {
  return request(`/contracts/${contractId}/complete`, { method: 'PATCH' });
}

export function submitMilestoneWork(contractId, milestoneId, payload = {}) {
  return request(`/contracts/${contractId}/milestones/${milestoneId}/submit`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function approveMilestoneWork(contractId, milestoneId) {
  return request(`/contracts/${contractId}/milestones/${milestoneId}/approve`, {
    method: 'PATCH',
  });
}

// Admin API (Part 4)
export function getAdminAnalytics() {
  return request('/admin/analytics');
}
 
export function getAdminUsers() {
  return request('/admin/users');
}
 
export function updateUserStatus(userId, status) {
  return request(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getAdminJobs() {
  return request('/admin/jobs');
}

export function takedownJob(jobId, reason) {
  return request(`/admin/jobs/${jobId}/takedown`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
}
 
// Disputes API (Part 4)
export function createDispute(payload) {
  return request('/disputes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
 
export function listDisputes() {
  return request('/disputes');
}
 
export function getDisputeById(disputeId) {
  return request(`/disputes/${disputeId}`);
}
 
export function resolveDispute(disputeId, payload) {
  return request(`/disputes/${disputeId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
// Messages API
export function getConversations() { return request("/conversations"); }
export function getConversation(id) { return request(`/conversations/${id}`); }
export function getConversationMessages(id) { return request(`/conversations/${id}/messages`); }
export function sendMessage(id, payload) {
  const formData = new FormData();
  if (payload.content) formData.append("content", payload.content);
  if (payload.file) formData.append("file", payload.file);
  const token = localStorage.getItem("token");
  return fetch(`${API_URL}/conversations/${id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  }).then(async r => {
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.message || data.error);
    return data;
  });
}
export function getAttachmentDownloadUrl(id, messageId) {
  return request(`/conversations/${id}/messages/${messageId}/download`);
}
export function confirmDeleteConversation(id) {
  return request(`/conversations/${id}/delete-confirm`, { method: "POST" });
}
export function cancelDeleteConversation(id) {
  return request(`/conversations/${id}/delete-cancel`, { method: "POST" });
}

// Direct offers ("Hire Me"). payload: { freelancer_id, title, description, amount, currency, deadline?, files?: File[] }
export function createOffer(payload) {
  const formData = new FormData();
  for (const key of ['freelancer_id', 'title', 'description', 'amount', 'currency', 'deadline']) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') formData.append(key, payload[key]);
  }
  for (const file of payload.files || []) formData.append('files', file);
  const token = localStorage.getItem('token');
  return fetch(`${API_URL}/offers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || 'Could not send the offer');
    return data;
  });
}

export function getReceivedOffers() {
  return request('/offers/received');
}

export function getSentOffers() {
  return request('/offers/sent');
}

export function acceptOffer(offerId) {
  return request(`/offers/${offerId}/accept`, { method: 'PATCH' });
}

export function declineOffer(offerId) {
  return request(`/offers/${offerId}/decline`, { method: 'PATCH' });
}

export function withdrawOffer(offerId) {
  return request(`/offers/${offerId}/withdraw`, { method: 'PATCH' });
}

export function getOfferFileUrl(offerId, fileId) {
  return request(`/offers/${offerId}/files/${fileId}/download`);
}

// Notifications API
export function getNotifications() {
  return request('/notifications');
}

export function markNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}

// Top Users API
export function getTopUsers(params = {}) {
  const q = new URLSearchParams();
  if (params.role) q.set('role', params.role);
  if (params.minRating) q.set('min_rating', params.minRating);
  if (params.minPrice !== undefined) q.set('min_price', params.minPrice);
  if (params.maxPrice !== undefined) q.set('max_price', params.maxPrice);
  if (params.limit) q.set('limit', params.limit);
  if (params.offset !== undefined) q.set('offset', params.offset);
  const qs = q.toString();
  return request(`/top-users${qs ? '?' + qs : ''}`);
}

// Rate the other side of a completed contract (once per contract)
export function createReview(payload) {
  return request('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Browse Users page: everyone active in a role, with ratings and their latest 3 reviews
export function browseUsers(params = {}) {
  const q = new URLSearchParams();
  if (params.role) q.set('role', params.role);
  if (params.q) q.set('q', params.q);
  if (params.sort) q.set('sort', params.sort);
  if (params.min_rating) q.set('min_rating', params.min_rating);
  if (params.limit) q.set('limit', params.limit);
  if (params.offset !== undefined) q.set('offset', params.offset);
  return request(`/users/browse?${q.toString()}`);
}

// Profile & Ratings API
export function getUserReviews(userId, role) {
  const query = role ? `?role=${role}` : "";
  return request(`/reviews/users/${userId}${query}`);
}
export function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);
  const token = localStorage.getItem("token");
  return fetch(`${API_URL}/auth/profile/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  }).then(async r => {
    const data = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.message || data.error);
    return data;
  });
}
export function removeAvatar() {
  return request("/auth/profile/avatar", { method: "DELETE" });
}

// Activity Logs API
export function getActivityLogs() {
  return request('/auth/activity');
}

// Proposals API (withdraw)
export function withdrawProposal(proposalId) { return request(`/proposals/${proposalId}/withdraw`, { method: "PATCH" }); }
export function unwithdrawProposal(proposalId, payload) {
  return request(`/proposals/${proposalId}/unwithdraw`, {
    method: "PATCH",
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}


// Auth
export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Logout API failed, continuing with local cleanup:', err);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}


// Payout details (freelancers). Only ever returned masked: account_last4.
export function getPayoutDetails() {
  return request('/auth/payout');
}
export function updatePayoutDetails(payload) {
  return request('/auth/payout', { method: 'PUT', body: JSON.stringify(payload) });
}

// Chats started from a profile ("Message"). Your current mode decides the roles.
export function getProfileChat(userId) {
  return request(`/conversations/direct/${userId}`);
}
export function startProfileChat(userId, content) {
  return request('/conversations/direct', { method: 'POST', body: JSON.stringify({ user_id: userId, content }) });
}

// Delete your own account (anonymized). Needs your password; the UI also asks for "DELETE".
export function deleteAccount(password) {
  return request('/auth/account', { method: 'DELETE', body: JSON.stringify({ password, confirm: 'DELETE' }) });
}

// Client payment method for funding escrow. Only ever returned masked.
export function getPaymentMethodDetails() {
  return request('/auth/payment-method');
}
export function updatePaymentMethodDetails(payload) {
  return request('/auth/payment-method', { method: 'PUT', body: JSON.stringify(payload) });
}

// Activity log: your own (Profile → Activity) and everyone's (admin)
function activityQuery(params = {}) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, value);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
export function getMyActivity(params) {
  return request(`/activity/me${activityQuery(params)}`);
}
export function getAdminActivity(params) {
  return request(`/admin/activity${activityQuery(params)}`);
}

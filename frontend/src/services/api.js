const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Something went wrong');
  }

  return data;
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

// Proposal API
export function submitProposal(payload) {
  return request('/proposals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

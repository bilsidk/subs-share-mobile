import { API_BASE_URL } from '../utils/constants';
import { storageService } from './storageService';
import { t } from '../utils/i18n';

const REQUEST_TIMEOUT = 15000;

// Notify listeners when session expires (e.g., navigation to login)
let _sessionExpiredListeners = [];
export const onSessionExpired = (fn) => {
  _sessionExpiredListeners.push(fn);
  return () => { _sessionExpiredListeners = _sessionExpiredListeners.filter(l => l !== fn); };
};
const _notifySessionExpired = async () => {
  await storageService.clear();
  _sessionExpiredListeners.forEach(fn => fn());
};

const request = async (method, path, body = null) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const token = await storageService.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers, signal: controller.signal };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${path}`, options);

    // Auto-logout on 401 — token expired or invalidated server-side
    if (response.status === 401) {
      await _notifySessionExpired();
      const err = new Error(t('errors.sessionExpired'));
      err.status = 401;
      throw err;
    }

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { error: text || t('errors.serverResponse') }; }

    if (!response.ok) {
      const err = new Error(data.error || t('errors.requestFailed'));
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(t('errors.timeout'));
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

// Retry a request through TRANSIENT failures only (network drop, timeout, 5xx).
// Never retries 4xx (those are deterministic client errors). Used for the
// fire-and-forget /start stamp so a brief connectivity blip when a task opens
// doesn't cost the user a forced re-watch/re-wait at claim time.
async function _retryTransient(fn, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (e.status && e.status >= 400 && e.status < 500) throw e; // deterministic — don't retry
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

export const api = {
  // Auth
  googleSignIn: ({ idToken, serverAuthCode, accessToken, referralCode }) =>
    request('POST', '/auth/google', { idToken, serverAuthCode, accessToken, referralCode }),

  // User
  getMe: () => request('GET', '/users/me'),
  getReferral: () => request('GET', '/users/referral'),
  deleteAccount: () => request('DELETE', '/users/me'),

  // Channels
  addChannel: (data) => request('POST', '/channels', data),
  getMyChannels: () => request('GET', '/channels'),

  // Tasks
  getAvailableTasks: (type) => request('GET', `/tasks${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  getMyTasks: () => request('GET', '/tasks/my'),
  createTask: (data) => request('POST', '/tasks', data),
  // Server-stamps the start time. Retried through transient failures so a network
  // blip at task-open doesn't force the user to redo the task at claim time.
  startTask: (taskId) => _retryTransient(() => request('POST', `/tasks/${taskId}/start`)),
  getIntegrityNonce: () => request('GET', '/tasks/integrity-nonce'),
  getCommentHelp: (taskId, lang) => request('GET', `/tasks/${taskId}/comment-help?lang=${encodeURIComponent(lang || 'en')}`),
  verifyTask: async (taskId, startedAt, deviceId, integrityToken) =>
    request('POST', `/tasks/${taskId}/verify`, {
      started_at: startedAt, device_id: deviceId,
      integrity_token: integrityToken || undefined,
    }),

  // Campaign controls
  pauseCampaign:  (taskId) => request('PATCH', `/tasks/${taskId}/pause`),
  resumeCampaign: (taskId) => request('PATCH', `/tasks/${taskId}/resume`),
  cancelCampaign: (taskId) => request('DELETE', `/tasks/${taskId}`),

  // Payments
  getPricing: () => request('GET', '/payments/tiers'),
  verifyGooglePlay: (productId, purchaseToken) =>
    request('POST', '/payments/google/verify', { product_id: productId, purchase_token: purchaseToken }),

  // Transactions
  getTransactions: (page = 1) => request('GET', `/transactions?page=${encodeURIComponent(page)}`),
  getAdminStatus: () => request('GET', '/admin/status'),
  getAdminStats: () => request('GET', '/admin/stats'),
  getClientConfig: (lang) => request('GET', '/tasks/config' + (lang ? '?lang=' + encodeURIComponent(lang) : '')),
  getAdminSettings: () => request('GET', '/admin/settings'),
  updateAdminSettings: (data) => request('PATCH', '/admin/settings', data),
  setAdminMode: (mode, reason) => request('POST', '/admin/mode', { mode, reason }),
  promoteUser: (email, role) => request('POST', '/admin/promote', { email, role }),
  adminUsers: (params) => request('GET', '/admin/users' + (params ? '?' + new URLSearchParams(params).toString() : '')),
  adminAddCoins: (email, amount) => request('POST', '/admin/coins', { email, amount }),
};

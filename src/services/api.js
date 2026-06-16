import { API_BASE_URL } from '../utils/constants';
import { storageService } from './storageService';

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
      const err = new Error('Session expired — please sign in again');
      err.status = 401;
      throw err;
    }

    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { error: text || 'Unexpected server response' }; }

    if (!response.ok) {
      const err = new Error(data.error || 'Request failed');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export const api = {
  // Auth
  googleSignIn: ({ idToken, serverAuthCode, accessToken }) =>
    request('POST', '/auth/google', { idToken, serverAuthCode, accessToken }),

  // User
  getMe: () => request('GET', '/users/me'),
  deleteAccount: () => request('DELETE', '/users/me'),

  // Channels
  addChannel: (data) => request('POST', '/channels', data),
  getMyChannels: () => request('GET', '/channels'),

  // Tasks
  getAvailableTasks: (type) => request('GET', `/tasks${type ? `?type=${encodeURIComponent(type)}` : ''}`),
  getMyTasks: () => request('GET', '/tasks/my'),
  createTask: (data) => request('POST', '/tasks', data),
  startTask: (taskId) => request('POST', `/tasks/${taskId}/start`), // server-stamps the start time
  verifyTask: async (taskId, startedAt, deviceId) =>
    request('POST', `/tasks/${taskId}/verify`, { started_at: startedAt, device_id: deviceId }),

  // Campaign controls
  pauseCampaign:  (taskId) => request('PATCH', `/tasks/${taskId}/pause`),
  resumeCampaign: (taskId) => request('PATCH', `/tasks/${taskId}/resume`),
  cancelCampaign: (taskId) => request('DELETE', `/tasks/${taskId}`),

  // Transactions
  getTransactions: (page = 1) => request('GET', `/transactions?page=${encodeURIComponent(page)}`),
  getAdminStatus: () => request('GET', '/admin/status'),
  getAdminSettings: () => request('GET', '/admin/settings'),
  updateAdminSettings: (data) => request('PATCH', '/admin/settings', data),
  setAdminMode: (mode, reason) => request('POST', '/admin/mode', { mode, reason }),
  promoteUser: (email, role) => request('POST', '/admin/promote', { email, role }),
};

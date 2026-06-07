import { API_BASE_URL } from '../utils/constants';
import { storageService } from './storageService';

const request = async (method, path, body = null) => {
  const token = await storageService.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  // Tolerate empty bodies (e.g. 204) and non-JSON error pages (e.g. a 502 HTML page)
  // instead of throwing an opaque SyntaxError before the status check runs.
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
  getAvailableTasks: (type) => request('GET', `/tasks${type ? `?type=${type}` : ''}`),
  getMyTasks: () => request('GET', '/tasks/my'),
  createTask: (data) => request('POST', '/tasks', data),
  verifyTask: async (taskId, startedAt, deviceId) =>
    request('POST', `/tasks/${taskId}/verify`, { started_at: startedAt, device_id: deviceId }),

  // Campaign controls
  pauseCampaign:  (taskId) => request('PATCH', `/tasks/${taskId}/pause`),
  resumeCampaign: (taskId) => request('PATCH', `/tasks/${taskId}/resume`),
  cancelCampaign: (taskId) => request('DELETE', `/tasks/${taskId}`),

  // Transactions
  getTransactions: (page = 1) => request('GET', `/transactions?page=${page}`),
  getAdminStatus: () => request('GET', '/admin/status'),
getAdminSettings: () => request('GET', '/admin/settings'),
updateAdminSettings: (data) => request('PATCH', '/admin/settings', data),
setAdminMode: (mode, reason) => request('POST', '/admin/mode', { mode, reason }),
promoteUser: (email, role) => request('POST', '/admin/promote', { email, role }),
};

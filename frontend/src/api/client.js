const API_BASE = '/api';

export async function fetchJson(endpoint, options = {}) {
  const token = localStorage.getItem('th_jwt_token') || localStorage.getItem('th_admin_token');

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data.error || data.message || `HTTP ${response.status}`);
    err.code = data.code;
    err.status = response.status;
    throw err;
  }

  return data;
}

export const api = {
  // Public Capacity & Settings
  getCapacity: () => fetchJson('/game/capacity'),

  // Team Registration
  registerTeam: (payload) =>
    fetchJson('/game/register-team', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Login
  loginUser: (team_name, leader_name) =>
    fetchJson('/game/login', {
      method: 'POST',
      body: JSON.stringify({ team_name, leader_name })
    }),



  loginTeamMember: (team_name, member_name) =>
    fetchJson('/game/login-member', {
      method: 'POST',
      body: JSON.stringify({ team_name, member_name })
    }),

  // Team Game Progress & Clue
  getTeamProgress: () => fetchJson('/game/team-progress'),

  // QR Scan
  scanQR: (qr_token) =>
    fetchJson('/game/scan', {
      method: 'POST',
      body: JSON.stringify({ qr_token })
    }),

  // Reset Team Progress (Anti-cheat trigger)
  resetTeamProgress: () =>
    fetchJson('/game/reset-progress', {
      method: 'POST'
    }),

  // Feedback
  submitFeedback: (payload) =>
    fetchJson('/game/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Leaderboard
  getLeaderboard: () => fetchJson('/game/leaderboard'),

  // Admin API
  adminLogin: (username, password) =>
    fetchJson('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  getDashboardStats: () => fetchJson('/admin/dashboard'),

  getTeamDetails: (id) => fetchJson(`/admin/team/${id}`),

  endHuntManually: () =>
    fetchJson('/admin/end-hunt', {
      method: 'POST'
    }),

  resetHunt: () =>
    fetchJson('/admin/reset-hunt', {
      method: 'POST'
    }),


  updateSettings: (settings) =>
    fetchJson('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }),

  updateTeamMemberCount: (team_id, team_name, member_count) =>
    fetchJson('/admin/team/update-member-count', {
      method: 'POST',
      body: JSON.stringify({ team_id, team_name, member_count })
    }),

  getQRCodes: () => fetchJson('/admin/qr-codes'),

  getStages: () => fetchJson('/admin/stages'),

  updateStage: (stage_id, stage_data) =>
    fetchJson(`/admin/stages/${stage_id}`, {
      method: 'PUT',
      body: JSON.stringify(stage_data)
    })
};



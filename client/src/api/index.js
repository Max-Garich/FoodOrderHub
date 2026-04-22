const API_URL = '/api';

function getHeaders(isAdmin = false) {
  const token = localStorage.getItem(isAdmin ? 'admin_token' : 'token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}, isAdmin = false) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(isAdmin), ...options.headers },
  });

  if (res.status === 401) {
    localStorage.removeItem(isAdmin ? 'admin_token' : 'token');
    localStorage.removeItem(isAdmin ? 'admin_user' : 'user');
    if (!isAdmin) window.location.href = '/login';
    else window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// Auth
export const authApi = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  adminLogin: (body) => request('/auth/admin/login', { method: 'POST', body: JSON.stringify(body) }),
};

// User
export const userApi = {
  profile: () => request('/user/profile'),
  balance: () => request('/user/balance'),
  balanceHistory: () => request('/user/balance-history'),
};

// Menu
export const menuApi = {
  today: () => request('/menu/today'),
  status: () => request('/menu/status'),
  toggleFavorite: (menuItemId) => request('/menu/favorites', { method: 'POST', body: JSON.stringify({ menuItemId }) }),
};

// Orders
export const orderApi = {
  create: (items) => request('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  history: (date) => request(`/orders/history${date ? `?date=${date}` : ''}`),
  detail: (id) => request(`/orders/${id}`),
};

// Admin
export const adminApi = {
  users: () => request('/admin/users', {}, true),
  user: (id) => request(`/admin/users/${id}`, {}, true),
  topup: (id, amount, comment) =>
    request(`/admin/users/${id}/topup`, { method: 'POST', body: JSON.stringify({ amount, comment }) }, true),
  subtract: (id, amount, comment) =>
    request(`/admin/users/${id}/subtract`, { method: 'POST', body: JSON.stringify({ amount, comment }) }, true),
  userBalanceHistory: (id) => request(`/admin/users/${id}/balance-history`, {}, true),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }, true),
  updateUserRole: (id, isAdmin) => request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ isAdmin }) }, true),

  menuItems: () => request('/admin/menu/items', {}, true),
  createMenuItem: (body) => request('/admin/menu/items', { method: 'POST', body: JSON.stringify(body) }, true),
  deleteCatalogItem: (id) => request(`/admin/menu/items/${id}`, { method: 'DELETE' }, true),

  dailyMenu: () => request('/admin/menu/daily', {}, true),
  addDailyItem: (body) => request('/admin/menu/daily', { method: 'POST', body: JSON.stringify(body) }, true),
  updateDailyItem: (id, body) =>
    request(`/admin/menu/daily/${id}`, { method: 'PUT', body: JSON.stringify(body) }, true),
  deleteDailyItem: (id) => request(`/admin/menu/daily/${id}`, { method: 'DELETE' }, true),

  currentSession: () => request('/admin/sessions/current', {}, true),
  startSession: () => request('/admin/sessions/start', { method: 'POST' }, true),
  stopSession: () => request('/admin/sessions/stop', { method: 'POST' }, true),
  sessions: (date) => request(`/admin/sessions${date ? `?date=${date}` : ''}`, {}, true),

  dailyReport: (date) => request(`/admin/reports/daily?date=${date}`, {}, true),
  sessionSummary: (id) => request(`/admin/reports/summary/${id}`, {}, true),
  updateOrderItem: (orderId, itemId, payload) =>
    request(`/admin/orders/${orderId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }, true),
};

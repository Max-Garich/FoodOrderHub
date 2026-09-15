import { mockRequest } from './mock.js';

const API_URL = '/api';
const USE_MOCK = false; // true = работа без бэкенда на моках (локальная разработка). На сервере — false!

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  if (USE_MOCK) {
    return mockRequest(path, options);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// Auth — единый вход для всех ролей
export const authApi = {
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  registerTeacher: (body) => request('/auth/register-teacher', { method: 'POST', body: JSON.stringify(body) }),
};

// Публичные
export const groupsApi = {
  list: () => request('/groups'),
};

// Профиль юзера
export const userApi = {
  profile: () => request('/user/profile'),
  balance: () => request('/user/balance'),
  balanceHistory: () => request('/user/balance-history'),
};

// Меню
export const menuApi = {
  today: () => request('/menu/today'),
  toggleFavorite: (menuItemId) => request('/menu/favorites', { method: 'POST', body: JSON.stringify({ menuItemId }) }),
};

// Заказы
export const orderApi = {
  create: (items) => request('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  history: (date) => request(`/orders/history${date ? `?date=${date}` : ''}`),
  dates: (month) => request(`/orders/history/dates?month=${month}`),
  detail: (id) => request(`/orders/${id}`),
};

// Менеджер группы
export const managerApi = {
  requests: (groupId) => request(`/manager/requests${groupId ? `?groupId=${groupId}` : ''}`),
  acceptRequest: (userId) => request(`/manager/requests/${userId}/accept`, { method: 'POST' }),
  rejectRequest: (userId) => request(`/manager/requests/${userId}/reject`, { method: 'POST' }),
  users: (groupId) => request(`/manager/users${groupId ? `?groupId=${groupId}` : ''}`),
  topup: (id, amount, comment) =>
    request(`/manager/users/${id}/topup`, { method: 'POST', body: JSON.stringify({ amount, comment }) }),
  subtract: (id, amount, comment) =>
    request(`/manager/users/${id}/subtract`, { method: 'POST', body: JSON.stringify({ amount, comment }) }),
  updatePayment: (paymentPhone, paymentBank, groupId) =>
    request('/manager/group/payment', { method: 'PUT', body: JSON.stringify({ paymentPhone, paymentBank, ...(groupId ? { groupId } : {}) }) }),
  updateOrderItem: (orderId, itemId, payload) =>
    request(`/manager/orders/${orderId}/items/${itemId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  groupOrders: (date, groupId) => {
    const params = [];
    if (date) params.push(`date=${date}`);
    if (groupId) params.push(`groupId=${groupId}`);
    return request(`/manager/orders${params.length ? `?${params.join('&')}` : ''}`);
  },
};

// Глава столовой
export const canteenApi = {
  menuItems: () => request('/canteen/menu/items'),
  createMenuItem: (body) => request('/canteen/menu/items', { method: 'POST', body: JSON.stringify(body) }),
  updateCatalogItem: (id, body) => request(`/canteen/menu/items/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCatalogItem: (id) => request(`/canteen/menu/items/${id}`, { method: 'DELETE' }),

  dailyMenu: () => request('/canteen/menu/daily'),
  addDailyItem: (body) => request('/canteen/menu/daily', { method: 'POST', body: JSON.stringify(body) }),
  updateDailyItem: (id, body) => request(`/canteen/menu/daily/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDailyItem: (id) => request(`/canteen/menu/daily/${id}`, { method: 'DELETE' }),
  addAdditionalItem: (body) => request('/canteen/menu/additional', { method: 'POST', body: JSON.stringify(body) }),

  currentSession: () => request('/canteen/sessions/current'),
  startSession: () => request('/canteen/sessions/start', { method: 'POST' }),
  stopSession: () => request('/canteen/sessions/stop', { method: 'POST' }),

  dailyReport: (date) => request(`/canteen/reports/daily?date=${date}`),
};

// Супер-админ
export const adminApi = {
  groups: () => request('/admin/groups'),
  createGroup: (body) => request('/admin/groups', { method: 'POST', body: JSON.stringify(body) }),
  updateGroup: (id, body) => request(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGroup: (id) => request(`/admin/groups/${id}`, { method: 'DELETE' }),
  assignManager: (groupId, userId) =>
    request(`/admin/groups/${groupId}/manager`, { method: 'POST', body: JSON.stringify({ userId }) }),

  teachers: (date) => request(`/admin/teachers${date ? `?date=${date}` : ''}`),

  users: () => request('/admin/users'),
  setUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id, newPassword) =>
    request(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: newPassword }) }),
};

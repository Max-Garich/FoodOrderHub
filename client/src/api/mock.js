// Mock API layer — FoodOrderHub v2.0 (мультигрупповая схема ролей)
// Повторяет API-контракт бэкенда. Когда сервер будет готов — USE_MOCK=false в index.js и удалить этот файл.

const todayStr = new Date().toISOString().split('T')[0];

// ===== Mock State =====
let mockState = {
  currentUserId: null,

  groups: [
    { id: 1, name: 'Группа 101', paymentPhone: '+79028703832', paymentBank: 'Сбербанк', isActive: true, createdAt: '2024-09-01T08:00:00.000Z' },
    { id: 2, name: 'Группа 102', paymentPhone: '+79031112233', paymentBank: 'Т-Банк', isActive: true, createdAt: '2024-09-01T08:00:00.000Z' },
    { id: 3, name: 'Группа 103', paymentPhone: '+79045556677', paymentBank: 'ВТБ', isActive: false, createdAt: '2024-09-01T08:00:00.000Z' },
  ],

  users: [
    { id: 1, name: 'Сергей', surname: 'Администратор', email: 'superadmin@foodorderhub.ru', role: 'SUPER_ADMIN', status: 'ACTIVE', groupId: null, position: null, balance: null, isDeleted: false, createdAt: '2024-01-01T09:00:00.000Z' },
    { id: 2, name: 'Ольга', surname: 'Иванова', email: 'canteen@foodorderhub.ru', role: 'CANTEEN_HEAD', status: 'ACTIVE', groupId: null, position: null, balance: null, isDeleted: false, createdAt: '2024-01-10T09:00:00.000Z' },
    { id: 3, name: 'Дмитрий', surname: 'Петров', email: 'manager101@foodorderhub.ru', role: 'MANAGER', status: 'ACTIVE', groupId: 1, position: null, balance: 800.00, isDeleted: false, createdAt: '2024-02-01T09:00:00.000Z' },
    { id: 4, name: 'Тестовый', surname: 'Пользователь', email: 'test@example.com', role: 'USER', status: 'ACTIVE', groupId: 1, position: null, balance: 1250.50, isDeleted: false, createdAt: '2024-02-15T10:00:00.000Z' },
    { id: 5, name: 'Ожидание', surname: 'Ожидаев', email: 'pending@example.com', role: 'USER', status: 'PENDING', groupId: 1, position: null, balance: 0, isDeleted: false, createdAt: '2024-08-20T10:00:00.000Z' },
    { id: 6, name: 'Алексей', surname: 'Преподаватель', email: 'teacher@example.com', role: 'TEACHER', status: 'PENDING', groupId: null, position: 'Преподаватель математики', balance: null, isDeleted: false, createdAt: '2024-08-21T10:00:00.000Z' },
    { id: 7, name: 'Мария', surname: 'Сидорова', email: 'manager102@foodorderhub.ru', role: 'MANAGER', status: 'ACTIVE', groupId: 2, position: null, balance: 450.00, isDeleted: false, createdAt: '2024-02-05T09:00:00.000Z' },
    { id: 8, name: 'Иван', surname: 'Козлов', email: 'user102@example.com', role: 'USER', status: 'ACTIVE', groupId: 2, position: null, balance: 300.00, isDeleted: false, createdAt: '2024-03-05T10:00:00.000Z' },
    { id: 9, name: 'Анна', surname: 'Смирнова', email: 'pending102@example.com', role: 'USER', status: 'PENDING', groupId: 2, position: null, balance: 0, isDeleted: false, createdAt: '2024-08-22T10:00:00.000Z' },
  ],

  balanceHistory: [
    { id: 1, userId: 4, amount: 2000, type: 'topup', balanceAfter: 2000, orderId: null, comment: 'Начало месяца', createdAt: '2024-08-01T09:00:00.000Z' },
    { id: 2, userId: 4, amount: -350, type: 'order_debit', balanceAfter: 1650, orderId: 100, comment: 'Заказ #100', createdAt: '2024-08-01T12:30:00.000Z' },
    { id: 3, userId: 4, amount: 500, type: 'topup', balanceAfter: 2150, orderId: null, comment: 'Пополнение', createdAt: '2024-08-05T10:00:00.000Z' },
    { id: 4, userId: 4, amount: -899.50, type: 'order_debit', balanceAfter: 1250.50, orderId: 101, comment: 'Заказ #101', createdAt: '2024-08-10T12:45:00.000Z' },
  ],

  favorites: [1, 3], // menuItemId

  menuItems: [
    { id: 1, name: 'Борщ', description: 'Классический борщ со сметаной', category: 'Супы', defaultPrice: 120, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 2, name: 'Котлета с пюре', description: 'Домашняя котлета с картофельным пюре', category: 'Второе', defaultPrice: 180, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 3, name: 'Салат Цезарь', description: 'Салат с курицей и соусом Цезарь', category: 'Салаты', defaultPrice: 150, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 4, name: 'Пельмени', description: 'Пельмени домашние со сметаной', category: 'Второе', defaultPrice: 160, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 5, name: 'Компот', description: 'Компот из сухофруктов', category: 'Напитки', defaultPrice: 40, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 6, name: 'Чай', description: 'Чай чёрный/зелёный', category: 'Напитки', defaultPrice: 30, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 7, name: 'Плов', description: 'Узбекский плов с бараниной', category: 'Второе', defaultPrice: 200, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
    { id: 8, name: 'Солянка', description: 'Солянка мясная сборная', category: 'Супы', defaultPrice: 140, isDeleted: false, createdAt: '2024-01-01T00:00:00.000Z' },
  ],

  dailyMenu: [
    // Основное меню (с лимитами; у части блюд remaining < maxQuantity, одно soldOut)
    { id: 101, sessionId: 1, menuItemId: 1, itemName: 'Борщ', category: 'Супы', price: 120, maxQuantity: 50, orderedQuantity: 12, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 102, sessionId: 1, menuItemId: 2, itemName: 'Котлета с пюре', category: 'Второе', price: 180, maxQuantity: 40, orderedQuantity: 36, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 103, sessionId: 1, menuItemId: 3, itemName: 'Салат Цезарь', category: 'Салаты', price: 150, maxQuantity: 30, orderedQuantity: 30, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 104, sessionId: 1, menuItemId: 4, itemName: 'Пельмени', category: 'Второе', price: 160, maxQuantity: 40, orderedQuantity: 10, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 105, sessionId: 1, menuItemId: 5, itemName: 'Компот', category: 'Напитки', price: 40, maxQuantity: 100, orderedQuantity: 20, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 106, sessionId: 1, menuItemId: 6, itemName: 'Чай', category: 'Напитки', price: 30, maxQuantity: 100, orderedQuantity: 25, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    { id: 107, sessionId: 1, menuItemId: 7, itemName: 'Плов', category: 'Второе', price: 200, maxQuantity: 25, orderedQuantity: 5, isAdditional: false, isAvailable: true, createdAt: `${todayStr}T08:00:00.000Z` },
    // Доп-меню (добавляется во время сессии)
    { id: 201, sessionId: 1, menuItemId: null, itemName: 'Пирожок с капустой', category: 'Булочки', price: 60, maxQuantity: 30, orderedQuantity: 3, isAdditional: true, isAvailable: true, createdAt: `${todayStr}T10:00:00.000Z` },
    { id: 202, sessionId: 1, menuItemId: null, itemName: 'Сок апельсиновый', category: 'Напитки', price: 80, maxQuantity: 50, orderedQuantity: 5, isAdditional: true, isAvailable: true, createdAt: `${todayStr}T10:00:00.000Z` },
  ],

  orders: [
    {
      id: 1, userId: 4, groupId: 1, sessionId: 1, totalAmount: 300, createdAt: `${todayStr}T12:30:00.000Z`,
      items: [
        { id: 11, orderId: 1, dailyMenuId: 101, itemName: 'Борщ', price: 120, quantity: 1, subtotal: 120 },
        { id: 12, orderId: 1, dailyMenuId: 102, itemName: 'Котлета с пюре', price: 180, quantity: 1, subtotal: 180 },
      ],
    },
    {
      id: 2, userId: 8, groupId: 2, sessionId: 1, totalAmount: 230, createdAt: `${todayStr}T12:40:00.000Z`,
      items: [
        { id: 21, orderId: 2, dailyMenuId: 104, itemName: 'Пельмени', price: 160, quantity: 1, subtotal: 160 },
        { id: 22, orderId: 2, dailyMenuId: 105, itemName: 'Компот', price: 40, quantity: 1, subtotal: 40 },
        { id: 23, orderId: 2, dailyMenuId: 106, itemName: 'Чай', price: 30, quantity: 1, subtotal: 30 },
      ],
    },
    {
      id: 3, userId: 4, groupId: 1, sessionId: 1, totalAmount: 160,
      createdAt: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return d.toISOString().split('T')[0] + 'T12:15:00.000Z'; })(),
      items: [
        { id: 31, orderId: 3, dailyMenuId: 101, itemName: 'Борщ', price: 120, quantity: 1, subtotal: 120 },
        { id: 32, orderId: 3, dailyMenuId: 105, itemName: 'Компот', price: 40, quantity: 1, subtotal: 40 },
      ],
    },
    {
      id: 4, userId: 4, groupId: 1, sessionId: 1, totalAmount: 380,
      createdAt: (() => { const d = new Date(); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0] + 'T12:30:00.000Z'; })(),
      items: [
        { id: 41, orderId: 4, dailyMenuId: 102, itemName: 'Котлета с пюре', price: 180, quantity: 1, subtotal: 180 },
        { id: 42, orderId: 4, dailyMenuId: 103, itemName: 'Салат Цезарь', price: 150, quantity: 1, subtotal: 150 },
        { id: 43, orderId: 4, dailyMenuId: 105, itemName: 'Компот', price: 40, quantity: 1, subtotal: 40 },
      ],
    },
    {
      id: 5, userId: 4, groupId: 1, sessionId: 1, totalAmount: 120,
      createdAt: (() => { const d = new Date(); d.setDate(d.getDate() - 8); return d.toISOString().split('T')[0] + 'T12:00:00.000Z'; })(),
      items: [
        { id: 51, orderId: 5, dailyMenuId: 101, itemName: 'Борщ', price: 120, quantity: 1, subtotal: 120 },
      ],
    },
  ],

  session: {
    id: 1, sessionDate: todayStr, isActive: true, startedAt: `${todayStr}T08:00:00.000Z`, endedAt: null, summaryJson: null,
  },
};

// ===== Helpers =====
function delay(ms = 200) {
  return new Promise(r => setTimeout(r, ms));
}

function nextId(arr) {
  return Math.max(0, ...arr.map(x => x.id)) + 1;
}

function currentUser() {
  return mockState.users.find(u => u.id === mockState.currentUserId && !u.isDeleted) || null;
}

function requireUser() {
  const u = currentUser();
  if (!u) throw { status: 401, error: 'Не авторизован' };
  return u;
}

function requireRole(...roles) {
  const u = requireUser();
  if (!roles.includes(u.role)) throw { status: 403, error: 'Недостаточно прав' };
  return u;
}

function publicUser(u) {
  return { id: u.id, name: u.name, surname: u.surname, email: u.email, role: u.role, status: u.status, groupId: u.groupId ?? null, position: u.position ?? null };
}

function dishView(d) {
  const remaining = Math.max(0, (d.maxQuantity ?? 0) - (d.orderedQuantity ?? 0));
  return { ...d, remaining, soldOut: remaining <= 0 };
}

function groupOf(u) {
  if (!u.groupId) return null;
  const g = mockState.groups.find(g => g.id === u.groupId);
  return g ? { id: g.id, name: g.name, paymentPhone: g.paymentPhone, paymentBank: g.paymentBank } : null;
}

// ===== Route Handlers =====
const routes = [

  // --- Auth ---
  {
    method: 'POST', pattern: '/auth/login',
    handler: async (m, body) => {
      const user = mockState.users.find(u => u.email === body.email && !u.isDeleted);
      if (!user) throw { status: 401, error: 'Неверный email или пароль' };
      if (user.status === 'REJECTED') throw { status: 403, error: 'Ваша заявка была отклонена' };
      mockState.currentUserId = user.id;
      return { token: 'mock-jwt-token-' + user.id, user: publicUser(user) };
    },
  },
  {
    method: 'POST', pattern: '/auth/register',
    handler: async (m, body) => {
      if (mockState.users.some(u => u.email === body.email && !u.isDeleted)) {
        throw { status: 409, error: 'Пользователь с таким email уже существует' };
      }
      const group = mockState.groups.find(g => g.id === parseInt(body.groupId) && g.isActive);
      if (!group) throw { status: 400, error: 'Выберите группу' };
      const id = nextId(mockState.users);
      const user = {
        id, name: body.name, surname: body.surname, email: body.email,
        role: 'USER', status: 'PENDING', groupId: group.id, position: null,
        balance: 0, isDeleted: false, createdAt: new Date().toISOString(),
      };
      mockState.users.push(user);
      mockState.currentUserId = id;
      return { token: 'mock-jwt-token-' + id, user: publicUser(user) };
    },
  },
  {
    method: 'POST', pattern: '/auth/register-teacher',
    handler: async (m, body) => {
      if (mockState.users.some(u => u.email === body.email && !u.isDeleted)) {
        throw { status: 409, error: 'Пользователь с таким email уже существует' };
      }
      const id = nextId(mockState.users);
      const user = {
        id, name: body.name, surname: body.surname, email: body.email,
        role: 'TEACHER', status: 'PENDING', groupId: null, position: body.position,
        balance: null, isDeleted: false, createdAt: new Date().toISOString(),
      };
      mockState.users.push(user);
      mockState.currentUserId = id;
      return { token: 'mock-jwt-token-' + id, user: publicUser(user) };
    },
  },

  // --- Public: Groups ---
  {
    method: 'GET', pattern: '/groups',
    handler: async () => mockState.groups.filter(g => g.isActive).map(g => ({ id: g.id, name: g.name })),
  },

  // --- User ---
  {
    method: 'GET', pattern: '/user/profile',
    handler: async () => {
      const u = requireUser();
      return { ...publicUser(u), group: groupOf(u), balance: u.balance ?? null };
    },
  },
  {
    method: 'GET', pattern: '/user/balance',
    handler: async () => {
      const u = requireUser();
      const hasBalance = u.role !== 'TEACHER';
      return { balance: hasBalance ? u.balance : null, hasBalance };
    },
  },
  {
    method: 'GET', pattern: '/user/balance-history',
    handler: async () => {
      const u = requireUser();
      return mockState.balanceHistory.filter(h => h.userId === u.id);
    },
  },

  // --- Menu ---
  {
    method: 'GET', pattern: '/menu/today',
    handler: async () => {
      const available = mockState.dailyMenu.filter(d => d.isAvailable);
      return {
        isOrderingActive: mockState.session.isActive,
        sessionDate: mockState.session.sessionDate,
        items: available.filter(d => !d.isAdditional).map(dishView),
        additionalItems: available.filter(d => d.isAdditional).map(dishView),
        favorites: [...mockState.favorites],
      };
    },
  },
  {
    method: 'POST', pattern: '/menu/favorites',
    handler: async (m, body) => {
      requireUser();
      const idx = mockState.favorites.indexOf(body.menuItemId);
      if (idx >= 0) { mockState.favorites.splice(idx, 1); return { isFavorite: false }; }
      mockState.favorites.push(body.menuItemId);
      return { isFavorite: true };
    },
  },

  // --- Orders ---
  {
    method: 'POST', pattern: '/orders',
    handler: async (m, body) => {
      const u = requireUser();
      if (!mockState.session.isActive) throw { status: 403, error: 'Приём заказов закрыт' };
      if (u.status !== 'ACTIVE') throw { status: 403, error: 'Ваш аккаунт ещё не активирован' };

      // Проверка лимитов
      for (const req of body.items) {
        const dish = mockState.dailyMenu.find(d => d.id === req.dailyMenuId);
        if (!dish || !dish.isAvailable) throw { status: 400, error: 'Позиция не найдена в меню' };
        const remaining = dish.maxQuantity - dish.orderedQuantity;
        if (req.quantity > remaining) {
          throw { status: 409, error: remaining <= 0 ? `«${dish.itemName}» закончилось` : `«${dish.itemName}»: осталось всего ${remaining} порц.` };
        }
      }

      const isTeacher = u.role === 'TEACHER';
      const total = body.items.reduce((sum, item) => {
        const dish = mockState.dailyMenu.find(d => d.id === item.dailyMenuId);
        return sum + (dish ? dish.price * item.quantity : 0);
      }, 0);

      if (!isTeacher && total > u.balance) {
        throw { status: 400, error: 'Недостаточно средств' };
      }

      const orderId = nextId(mockState.orders);
      let itemId = nextId(mockState.orders.flatMap(o => o.items));
      const order = {
        id: orderId, userId: u.id, groupId: isTeacher ? null : u.groupId,
        sessionId: mockState.session.id, totalAmount: total, createdAt: new Date().toISOString(),
        items: body.items.map(item => {
          const dish = mockState.dailyMenu.find(d => d.id === item.dailyMenuId);
          dish.orderedQuantity += item.quantity;
          return { id: itemId++, orderId, dailyMenuId: item.dailyMenuId, itemName: dish.itemName, price: dish.price, quantity: item.quantity, subtotal: dish.price * item.quantity };
        }),
      };
      mockState.orders.push(order);

      let newBalance = null;
      if (!isTeacher) {
        u.balance -= total;
        newBalance = u.balance;
        mockState.balanceHistory.push({
          id: nextId(mockState.balanceHistory), userId: u.id, amount: -total, type: 'order_debit',
          balanceAfter: u.balance, orderId, comment: `Заказ #${orderId}`, createdAt: new Date().toISOString(),
        });
      }
      return { order, newBalance };
    },
  },
  {
    method: 'GET', pattern: '/orders/history/dates',
    handler: async (m, _body, query) => {
      const u = requireUser();
      if (!query.month || !/^\d{4}-\d{2}$/.test(query.month)) {
        throw { status: 400, error: 'Параметр month обязателен (YYYY-MM)' };
      }
      const userOrders = mockState.orders.filter(o => o.userId === u.id && o.createdAt.startsWith(query.month));
      const grouped = {};
      for (const o of userOrders) {
        const date = o.createdAt.split('T')[0];
        if (!grouped[date]) grouped[date] = { date, count: 0, total: 0 };
        grouped[date].count += 1;
        grouped[date].total += o.totalAmount;
      }
      return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
    },
  },
  {
    method: 'GET', pattern: '/orders/history',
    handler: async (m, _body, query) => {
      const u = requireUser();
      let orders = mockState.orders.filter(o => o.userId === u.id);
      if (query.date) orders = orders.filter(o => o.createdAt.startsWith(query.date));
      return orders;
    },
  },
  {
    method: 'GET', pattern: '/orders/:id',
    handler: async (m) => {
      requireUser();
      const order = mockState.orders.find(o => o.id === parseInt(m.id));
      if (!order) throw { status: 404, error: 'Заказ не найден' };
      return order;
    },
  },

  // --- Manager ---
  {
    method: 'GET', pattern: '/manager/requests',
    handler: async (m, _body, query) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      let pending = mockState.users.filter(x => x.status === 'PENDING' && !x.isDeleted);
      if (u.role !== 'SUPER_ADMIN') {
        pending = pending.filter(x => x.groupId === u.groupId);
      } else if (query.groupId) {
        pending = pending.filter(x => x.groupId === parseInt(query.groupId));
      }
      return pending.map(x => ({
        id: x.id, name: x.name, surname: x.surname, email: x.email, role: x.role, position: x.position, createdAt: x.createdAt,
        group: x.groupId
          ? { id: x.groupId, name: mockState.groups.find(g => g.id === x.groupId)?.name || null }
          : null,
      }));
    },
  },
  {
    method: 'POST', pattern: '/manager/requests/:userId/accept',
    handler: async (m) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const target = mockState.users.find(x => x.id === parseInt(m.userId) && !x.isDeleted);
      if (!target || target.status !== 'PENDING') throw { status: 404, error: 'Заявка не найдена' };
      if (u.role === 'MANAGER') {
        if (target.role === 'TEACHER') throw { status: 403, error: 'Заявки преподавателей принимает только главный администратор' };
        if (target.groupId !== u.groupId) throw { status: 403, error: 'Это заявка не вашей группы' };
      }
      target.status = 'ACTIVE';
      return { message: `${target.name} ${target.surname} подключён` };
    },
  },
  {
    method: 'POST', pattern: '/manager/requests/:userId/reject',
    handler: async (m) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const target = mockState.users.find(x => x.id === parseInt(m.userId) && !x.isDeleted);
      if (!target || target.status !== 'PENDING') throw { status: 404, error: 'Заявка не найдена' };
      if (u.role === 'MANAGER') {
        if (target.role === 'TEACHER') throw { status: 403, error: 'Заявки преподавателей рассматривает только главный администратор' };
        if (target.groupId !== u.groupId) throw { status: 403, error: 'Это заявка не вашей группы' };
      }
      target.status = 'REJECTED';
      return { message: `Заявка ${target.name} ${target.surname} отклонена` };
    },
  },
  {
    method: 'GET', pattern: '/manager/users',
    handler: async (m, _body, query) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      let users = mockState.users.filter(x => !x.isDeleted && x.status === 'ACTIVE' && x.role !== 'TEACHER');
      if (u.role !== 'SUPER_ADMIN') {
        users = users.filter(x => x.groupId === u.groupId);
      } else if (query.groupId) {
        users = users.filter(x => x.groupId === parseInt(query.groupId));
      }
      return users.map(x => ({ id: x.id, name: x.name, surname: x.surname, email: x.email, role: x.role, balance: x.balance ?? 0, groupId: x.groupId }));
    },
  },
  {
    method: 'POST', pattern: '/manager/users/:id/topup',
    handler: async (m, body) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const target = mockState.users.find(x => x.id === parseInt(m.id) && !x.isDeleted);
      if (!target) throw { status: 404, error: 'Пользователь не найден' };
      if (target.role === 'TEACHER') throw { status: 400, error: 'У преподавателя нет баланса' };
      if (u.role === 'MANAGER' && target.groupId !== u.groupId) throw { status: 403, error: 'Это пользователь не вашей группы' };
      target.balance += body.amount;
      mockState.balanceHistory.push({
        id: nextId(mockState.balanceHistory), userId: target.id, amount: body.amount, type: 'topup',
        balanceAfter: target.balance, comment: body.comment || 'Пополнение менеджером', createdAt: new Date().toISOString(),
      });
      return { message: `Баланс ${target.name} ${target.surname} пополнен`, newBalance: target.balance };
    },
  },
  {
    method: 'POST', pattern: '/manager/users/:id/subtract',
    handler: async (m, body) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const target = mockState.users.find(x => x.id === parseInt(m.id) && !x.isDeleted);
      if (!target) throw { status: 404, error: 'Пользователь не найден' };
      if (target.role === 'TEACHER') throw { status: 400, error: 'У преподавателя нет баланса' };
      if (u.role === 'MANAGER' && target.groupId !== u.groupId) throw { status: 403, error: 'Это пользователь не вашей группы' };
      target.balance -= body.amount;
      mockState.balanceHistory.push({
        id: nextId(mockState.balanceHistory), userId: target.id, amount: -body.amount, type: 'admin_subtract',
        balanceAfter: target.balance, comment: body.comment || 'Списание менеджером', createdAt: new Date().toISOString(),
      });
      return { message: `С баланса ${target.name} ${target.surname} списано`, newBalance: target.balance };
    },
  },
  {
    method: 'PUT', pattern: '/manager/group/payment',
    handler: async (m, body) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const groupId = u.role === 'SUPER_ADMIN' && body.groupId ? parseInt(body.groupId) : u.groupId;
      const group = mockState.groups.find(g => g.id === groupId);
      if (!group) throw { status: 404, error: 'Группа не найдена' };
      group.paymentPhone = body.paymentPhone;
      group.paymentBank = body.paymentBank;
      return { message: 'Реквизиты оплаты группы обновлены' };
    },
  },
  {
    method: 'GET', pattern: '/manager/orders',
    handler: async (m, _body, query) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      let orders = mockState.orders;
      if (u.role !== 'SUPER_ADMIN') {
        orders = orders.filter(o => o.groupId === u.groupId);
      } else if (query.groupId) {
        orders = orders.filter(o => o.groupId === parseInt(query.groupId));
      }
      if (query.date) orders = orders.filter(o => o.createdAt.startsWith(query.date));
      return orders.map(o => {
        const owner = mockState.users.find(x => x.id === o.userId);
        return {
          id: o.id, userId: o.userId, userName: owner ? `${owner.name} ${owner.surname}` : 'Unknown',
          totalAmount: o.totalAmount, createdAt: o.createdAt, items: o.items,
        };
      });
    },
  },
  {
    method: 'PUT', pattern: '/manager/orders/:orderId/items/:itemId',
    handler: async (m, body) => {
      const u = requireRole('MANAGER', 'SUPER_ADMIN');
      const order = mockState.orders.find(o => o.id === parseInt(m.orderId));
      if (!order) throw { status: 404, error: 'Заказ не найден' };
      if (u.role === 'MANAGER' && order.groupId !== u.groupId) throw { status: 403, error: 'Это заказ не вашей группы' };
      const item = order.items.find(i => i.id === parseInt(m.itemId));
      if (!item) throw { status: 404, error: 'Позиция не найдена' };

      const newQty = parseInt(body.quantity) || 0;
      const newPrice = parseFloat(body.price) || item.price;
      const dish = mockState.dailyMenu.find(d => d.id === item.dailyMenuId);

      // Корректировка лимита порций
      if (dish) {
        const delta = newQty - item.quantity;
        if (delta > 0 && dish.orderedQuantity + delta > dish.maxQuantity) {
          throw { status: 409, error: `«${dish.itemName}»: лимит превышен (максимум ещё ${dish.maxQuantity - dish.orderedQuantity} порц.)` };
        }
        dish.orderedQuantity += delta;
      }

      const oldSubtotal = item.subtotal;
      const newSubtotal = newQty * newPrice;
      item.quantity = newQty;
      item.price = newPrice;
      item.subtotal = newSubtotal;
      order.totalAmount = order.items.reduce((s, i) => s + i.subtotal, 0);

      // Корректировка баланса (кроме преподов)
      const owner = mockState.users.find(x => x.id === order.userId);
      if (owner && owner.role !== 'TEACHER' && oldSubtotal !== newSubtotal) {
        owner.balance += oldSubtotal - newSubtotal;
        mockState.balanceHistory.push({
          id: nextId(mockState.balanceHistory), userId: owner.id, amount: oldSubtotal - newSubtotal,
          type: 'order_adjust', balanceAfter: owner.balance, orderId: order.id,
          comment: `Корректировка заказа #${order.id}`, createdAt: new Date().toISOString(),
        });
      }
      return { message: 'Позиция обновлена' };
    },
  },

  // --- Canteen ---
  {
    method: 'GET', pattern: '/canteen/menu/items',
    handler: async () => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      return mockState.menuItems.filter(i => !i.isDeleted);
    },
  },
  {
    method: 'POST', pattern: '/canteen/menu/items',
    handler: async (m, body) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const item = {
        id: nextId(mockState.menuItems), name: body.name, description: body.description || null,
        category: body.category || 'Прочее', defaultPrice: body.defaultPrice ? parseFloat(body.defaultPrice) : null,
        defaultMaxQuantity: body.defaultMaxQuantity != null && body.defaultMaxQuantity !== '' ? parseInt(body.defaultMaxQuantity) : null,
        photoUrl: body.photoUrl || null,
        isDeleted: false, createdAt: new Date().toISOString(),
      };
      mockState.menuItems.push(item);
      return item;
    },
  },
  {
    method: 'PUT', pattern: '/canteen/menu/items/:id',
    handler: async (m, body) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const item = mockState.menuItems.find(i => i.id === parseInt(m.id));
      if (!item) throw { status: 404, error: 'Блюдо не найдено' };
      if (body.name !== undefined) item.name = body.name;
      if (body.category !== undefined) item.category = body.category;
      if (body.description !== undefined) item.description = body.description;
      if (body.defaultPrice !== undefined) item.defaultPrice = body.defaultPrice === null ? null : parseFloat(body.defaultPrice);
      if (body.defaultMaxQuantity !== undefined) item.defaultMaxQuantity = body.defaultMaxQuantity === null ? null : parseInt(body.defaultMaxQuantity);
      if (body.photoUrl !== undefined) item.photoUrl = body.photoUrl || null;
      return item;
    },
  },
  {
    method: 'DELETE', pattern: '/canteen/menu/items/:id',
    handler: async (m) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const item = mockState.menuItems.find(i => i.id === parseInt(m.id));
      if (item) item.isDeleted = true;
      return { message: 'Блюдо удалено из справочника' };
    },
  },
  {
    method: 'GET', pattern: '/canteen/menu/daily',
    handler: async () => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      return {
        session: { id: mockState.session.id, sessionDate: mockState.session.sessionDate, isActive: mockState.session.isActive },
        items: mockState.dailyMenu.map(dishView),
      };
    },
  },
  {
    method: 'POST', pattern: '/canteen/menu/daily',
    handler: async (m, body) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      if (body.maxQuantity === undefined || body.maxQuantity === null || parseInt(body.maxQuantity) < 0) {
        throw { status: 400, error: 'Укажите лимит порций' };
      }
      // Фото: явное из формы приоритетнее фото из справочника + запоминание последних цены/порций
      let photoUrl = body.photoUrl || null;
      if (body.menuItemId) {
        const cat = mockState.menuItems.find(i => i.id === parseInt(body.menuItemId));
        if (cat) {
          photoUrl = photoUrl || cat.photoUrl || null;
          cat.defaultPrice = parseFloat(body.price);
          cat.defaultMaxQuantity = parseInt(body.maxQuantity);
          if (photoUrl) cat.photoUrl = photoUrl;
        }
      }
      const item = {
        id: nextId(mockState.dailyMenu), sessionId: mockState.session.id, menuItemId: body.menuItemId || null,
        itemName: body.itemName, category: body.category || 'Прочее', price: parseFloat(body.price),
        maxQuantity: parseInt(body.maxQuantity), orderedQuantity: 0,
        isAdditional: false, isAvailable: true, photoUrl, createdAt: new Date().toISOString(),
      };
      mockState.dailyMenu.push(item);
      return dishView(item);
    },
  },
  {
    method: 'PUT', pattern: '/canteen/menu/daily/:id',
    handler: async (m, body) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const item = mockState.dailyMenu.find(d => d.id === parseInt(m.id));
      if (!item) throw { status: 404, error: 'Позиция не найдена' };
      if (body.maxQuantity !== undefined) {
        const max = parseInt(body.maxQuantity);
        if (max < item.orderedQuantity) throw { status: 409, error: `Лимит не может быть меньше уже заказанного (${item.orderedQuantity} порц.)` };
        item.maxQuantity = max;
      }
      if (body.itemName !== undefined) item.itemName = body.itemName;
      if (body.price !== undefined) item.price = parseFloat(body.price);
      if (body.category !== undefined) item.category = body.category;
      if (body.isAvailable !== undefined) item.isAvailable = body.isAvailable;
      return dishView(item);
    },
  },
  {
    method: 'DELETE', pattern: '/canteen/menu/daily/:id',
    handler: async (m) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const idx = mockState.dailyMenu.findIndex(d => d.id === parseInt(m.id));
      if (idx >= 0) mockState.dailyMenu.splice(idx, 1);
      return { message: 'Позиция удалена' };
    },
  },
  {
    method: 'POST', pattern: '/canteen/menu/additional',
    handler: async (m, body) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      if (!mockState.session.isActive) throw { status: 403, error: 'Доп-меню можно добавлять только во время активной сессии' };
      if (body.maxQuantity === undefined || parseInt(body.maxQuantity) < 0) {
        throw { status: 400, error: 'Укажите лимит порций' };
      }
      let photoUrl = body.photoUrl || null;
      if (body.menuItemId) {
        const cat = mockState.menuItems.find(i => i.id === parseInt(body.menuItemId));
        if (cat) {
          photoUrl = photoUrl || cat.photoUrl || null;
          cat.defaultPrice = parseFloat(body.price);
          cat.defaultMaxQuantity = parseInt(body.maxQuantity);
          if (photoUrl) cat.photoUrl = photoUrl;
        }
      }
      const item = {
        id: nextId(mockState.dailyMenu), sessionId: mockState.session.id, menuItemId: body.menuItemId || null,
        itemName: body.itemName, category: body.category || 'Прочее', price: parseFloat(body.price),
        maxQuantity: parseInt(body.maxQuantity), orderedQuantity: 0,
        isAdditional: true, isAvailable: true, photoUrl, createdAt: new Date().toISOString(),
      };
      mockState.dailyMenu.push(item);
      return dishView(item);
    },
  },
  {
    method: 'GET', pattern: '/canteen/sessions/current',
    handler: async () => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const orders = mockState.orders.filter(o => o.sessionId === mockState.session.id);
      const summary = buildSummary(orders);
      return {
        session: { ...mockState.session, dailyMenus: mockState.dailyMenu.filter(d => !d.isAdditional && d.isAvailable) },
        isActive: mockState.session.isActive,
        stats: mockState.session.isActive
          ? { orderCount: orders.length, totalRevenue: summary.totalRevenue, groups: summary.groups }
          : { orderCount: 0, totalRevenue: 0, groups: [] },
      };
    },
  },
  {
    method: 'POST', pattern: '/canteen/sessions/start',
    handler: async () => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      mockState.session.isActive = true;
      mockState.session.startedAt = new Date().toISOString();
      mockState.session.endedAt = null;
      return { message: 'Приём заказов начат', session: mockState.session };
    },
  },
  {
    method: 'POST', pattern: '/canteen/sessions/stop',
    handler: async () => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      mockState.session.isActive = false;
      mockState.session.endedAt = new Date().toISOString();
      return buildSummary(mockState.orders.filter(o => o.sessionId === mockState.session.id));
    },
  },
  {
    method: 'GET', pattern: '/canteen/reports/daily',
    handler: async (m, _body, query) => {
      requireRole('CANTEEN_HEAD', 'SUPER_ADMIN');
      const date = query.date || todayStr;
      const orders = mockState.orders.filter(o => o.createdAt.startsWith(date));
      const summary = buildSummary(orders);
      return {
        date,
        sessions: [{
          sessionId: mockState.session.id,
          sessionDate: mockState.session.sessionDate,
          isActive: mockState.session.isActive,
          orderCount: orders.length,
          revenue: summary.totalRevenue,
        }],
        totalRevenue: summary.totalRevenue,
        dishes: summary.dishes,
        groups: summary.groups,
        teachers: summary.teachers,
      };
    },
  },

  // --- Super Admin ---
  {
    method: 'GET', pattern: '/admin/groups',
    handler: async () => {
      requireRole('SUPER_ADMIN');
      return mockState.groups.map(g => {
        const members = mockState.users.filter(x => x.groupId === g.id && !x.isDeleted && x.status === 'ACTIVE' && x.role !== 'TEACHER');
        const pending = mockState.users.filter(x => x.groupId === g.id && !x.isDeleted && x.status === 'PENDING');
        return { ...g, memberCount: members.length, pendingCount: pending.length };
      });
    },
  },
  {
    method: 'POST', pattern: '/admin/groups',
    handler: async (m, body) => {
      requireRole('SUPER_ADMIN');
      if (mockState.groups.some(g => g.name === body.name)) {
        throw { status: 409, error: 'Группа с таким названием уже существует' };
      }
      const group = {
        id: nextId(mockState.groups), name: body.name,
        paymentPhone: body.paymentPhone || null, paymentBank: body.paymentBank || null,
        isActive: true, createdAt: new Date().toISOString(),
      };
      mockState.groups.push(group);
      return group;
    },
  },
  {
    method: 'PUT', pattern: '/admin/groups/:id',
    handler: async (m, body) => {
      requireRole('SUPER_ADMIN');
      const group = mockState.groups.find(g => g.id === parseInt(m.id));
      if (!group) throw { status: 404, error: 'Группа не найдена' };
      if (body.name !== undefined) group.name = body.name;
      if (body.paymentPhone !== undefined) group.paymentPhone = body.paymentPhone;
      if (body.paymentBank !== undefined) group.paymentBank = body.paymentBank;
      if (body.isActive !== undefined) group.isActive = body.isActive;
      return group;
    },
  },
  {
    method: 'DELETE', pattern: '/admin/groups/:id',
    handler: async (m) => {
      requireRole('SUPER_ADMIN');
      const group = mockState.groups.find(g => g.id === parseInt(m.id));
      if (group) group.isActive = false;
      return { message: 'Группа деактивирована' };
    },
  },

  // --- Teachers ---
  {
    method: 'GET', pattern: '/admin/teachers',
    handler: async (m, _body, query) => {
      requireRole('SUPER_ADMIN');
      const teachers = mockState.users.filter(u => u.role === 'TEACHER' && !u.isDeleted);

      const where = { groupId: null };
      if (query.date) {
        where.createdAt = query.date;
      }

      let orders = mockState.orders.filter(o => o.groupId === null);
      if (query.date) {
        orders = orders.filter(o => o.createdAt.startsWith(query.date));
      }

      const teacherOrders = {};
      for (const order of orders) {
        if (!teacherOrders[order.userId]) {
          teacherOrders[order.userId] = { orderCount: 0, totalSpent: 0, orders: [] };
        }
        teacherOrders[order.userId].orderCount += 1;
        teacherOrders[order.userId].totalSpent += order.totalAmount;
        teacherOrders[order.userId].orders.push({
          id: order.id, totalAmount: order.totalAmount, createdAt: order.createdAt,
          items: order.items.map(i => ({ itemName: i.itemName, quantity: i.quantity, price: i.price, subtotal: i.subtotal })),
        });
      }

      return teachers.map(t => ({
        id: t.id, name: t.name, surname: t.surname, email: t.email,
        position: t.position, status: t.status, createdAt: t.createdAt,
        orderCount: teacherOrders[t.id]?.orderCount || 0,
        totalSpent: teacherOrders[t.id]?.totalSpent || 0,
        orders: teacherOrders[t.id]?.orders || [],
      }));
    },
  },

  // --- Admin Users ---
  {
    method: 'GET', pattern: '/admin/users',
    handler: async () => {
      requireRole('SUPER_ADMIN');
      return mockState.users.filter(u => !u.isDeleted).map(u => ({
        id: u.id, name: u.name, surname: u.surname, email: u.email,
        role: u.role, status: u.status, groupId: u.groupId, position: u.position,
        balance: u.balance ?? null, createdAt: u.createdAt,
      }));
    },
  },
  {
    method: 'PUT', pattern: '/admin/users/:id/role',
    handler: async (m, body) => {
      requireRole('SUPER_ADMIN');
      const user = mockState.users.find(u => u.id === parseInt(m.id) && !u.isDeleted);
      if (!user) throw { status: 404, error: 'Пользователь не найден' };
      user.role = body.role;
      return { message: `Роль ${user.name} ${user.surname} изменена на ${body.role}` };
    },
  },
  {
    method: 'DELETE', pattern: '/admin/users/:id',
    handler: async (m) => {
      requireRole('SUPER_ADMIN');
      const user = mockState.users.find(u => u.id === parseInt(m.id));
      if (user) user.isDeleted = true;
      return { message: 'Пользователь удалён' };
    },
  },
  {
    method: 'POST', pattern: '/admin/users/:id/reset-password',
    handler: async () => {
      requireRole('SUPER_ADMIN');
      return { message: 'Пароль успешно изменён' };
    },
  },
];

// ===== Summary builder (группы + преподаватели) =====
function buildSummary(orders) {
  const groups = {};
  const teachers = {};
  const dishesByGroup = {};
  const dishes = {}; // общая сводка по блюдам (группы + преподаватели + доп-меню)

  for (const order of orders) {
    for (const item of order.items) {
      if (!dishes[item.itemName]) {
        dishes[item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0 };
      }
      dishes[item.itemName].totalQuantity += item.quantity;
      dishes[item.itemName].totalAmount += item.subtotal;
    }

    const owner = mockState.users.find(u => u.id === order.userId);
    const ownerName = owner ? `${owner.name} ${owner.surname}` : 'Unknown';

    if (order.groupId === null) {
      // Заказ преподавателя
      if (!teachers[order.userId]) {
        teachers[order.userId] = {
          userId: order.userId, name: owner?.name || '', surname: owner?.surname || '',
          position: owner?.position || '', orderCount: 0, totalSpent: 0,
        };
      }
      teachers[order.userId].orderCount += 1;
      teachers[order.userId].totalSpent += order.totalAmount;
    } else {
      const group = mockState.groups.find(g => g.id === order.groupId);
      const key = order.groupId;
      if (!groups[key]) {
        groups[key] = { groupId: key, groupName: group?.name || `Группа #${key}`, orderCount: 0, totalRevenue: 0 };
        dishesByGroup[key] = {};
      }
      groups[key].orderCount += 1;
      groups[key].totalRevenue += order.totalAmount;

      for (const item of order.items) {
        if (!dishesByGroup[key][item.itemName]) {
          dishesByGroup[key][item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0 };
        }
        dishesByGroup[key][item.itemName].totalQuantity += item.quantity;
        dishesByGroup[key][item.itemName].totalAmount += item.subtotal;
      }
    }
    void ownerName;
  }

  return {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
    dishes: Object.values(dishes),
    groups: Object.values(groups).map(g => ({ ...g, dishes: Object.values(dishesByGroup[g.groupId]) })),
    teachers: Object.values(teachers),
  };
}

// ===== Matcher =====
function matchRoute(method, path) {
  const [pathOnly, queryString] = path.split('?');
  const query = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      query[k] = decodeURIComponent(v || '');
    }
  }

  for (const route of routes) {
    if (route.method !== method) continue;
    const patternParts = route.pattern.split('/');
    const pathParts = pathOnly.split('/');
    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let matched = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params, query };
  }
  return null;
}

// ===== Main mock request function =====
export async function mockRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  await delay(120 + Math.random() * 120);

  const match = matchRoute(method, path);
  if (!match) {
    throw new Error('API route not found (mock): ' + method + ' ' + path);
  }

  try {
    return await match.route.handler(match.params, body, match.query);
  } catch (err) {
    if (err.status) {
      throw new Error(err.error || 'Ошибка');
    }
    throw err;
  }
}

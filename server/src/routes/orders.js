import { Router } from 'express';
import { requireAuth, requireActive } from '../middleware/auth.js';
import { updateSessionSummary } from '../utils/reports.js';

const router = Router();

// POST /api/orders — создать заказ (юзер/менеджер — с балансом, препод — без)
router.post('/', requireAuth, requireActive, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Заказ должен содержать хотя бы одну позицию' });
    }

    // Валидация формата + слияние дублей одного блюда
    const merged = new Map();
    for (const item of items) {
      const dailyMenuId = parseInt(item.dailyMenuId);
      const quantity = parseInt(item.quantity);
      if (!dailyMenuId || !quantity || quantity < 1) {
        return res.status(400).json({ error: 'Некорректный формат позиции заказа' });
      }
      merged.set(dailyMenuId, (merged.get(dailyMenuId) || 0) + quantity);
    }
    const orderItemsInput = Array.from(merged.entries()).map(([dailyMenuId, quantity]) => ({
      dailyMenuId,
      quantity,
    }));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Активная сессия
      const activeSession = await tx.orderSession.findFirst({
        where: { isActive: true },
      });
      if (!activeSession) {
        throw new Error('ORDER_CLOSED');
      }

      // 2. Позиции принадлежат активной сессии
      const dailyMenuIds = orderItemsInput.map((i) => i.dailyMenuId);
      const dailyMenuItems = await tx.dailyMenu.findMany({
        where: {
          id: { in: dailyMenuIds },
          sessionId: activeSession.id,
          isAvailable: true,
        },
      });
      if (dailyMenuItems.length !== dailyMenuIds.length) {
        throw new Error('INVALID_ITEMS');
      }
      const menuMap = new Map(dailyMenuItems.map((m) => [m.id, m]));

      // 3. Атомарное списание лимитов (защита от гонки между группами):
      // updateMany проходит только если orderedQuantity + qty <= maxQuantity
      for (const item of orderItemsInput) {
        const menu = menuMap.get(item.dailyMenuId);
        const upd = await tx.dailyMenu.updateMany({
          where: {
            id: item.dailyMenuId,
            sessionId: activeSession.id,
            isAvailable: true,
            orderedQuantity: { lte: menu.maxQuantity - item.quantity },
          },
          data: { orderedQuantity: { increment: item.quantity } },
        });
        if (upd.count === 0) {
          throw new Error(`SOLD_OUT:${menu.itemName}`);
        }
      }

      // 4. Сумма заказа
      let totalAmount = 0;
      const orderItems = orderItemsInput.map((item) => {
        const menu = menuMap.get(item.dailyMenuId);
        const subtotal = menu.price * item.quantity;
        totalAmount += subtotal;
        return {
          dailyMenuId: item.dailyMenuId,
          itemName: menu.itemName,
          price: menu.price,
          quantity: item.quantity,
          subtotal,
        };
      });

      // 5. Баланс — только для юзеров и менеджеров групп
      const needsBalance = req.user.role === 'USER' || req.user.role === 'MANAGER';
      let newBalance = null;

      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          sessionId: activeSession.id,
          groupId: needsBalance ? req.user.groupId : null, // null = заказ препода
          totalAmount,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      if (needsBalance) {
        const balance = await tx.balance.findUnique({
          where: { userId: req.user.id },
        });
        // Овердрафт +100₽
        if (!balance || balance.amount + 100 < totalAmount) {
          throw new Error('INSUFFICIENT_FUNDS');
        }

        newBalance = balance.amount - totalAmount;
        await tx.balance.update({
          where: { userId: req.user.id },
          data: { amount: newBalance },
        });

        await tx.balanceHistory.create({
          data: {
            userId: req.user.id,
            amount: -totalAmount,
            type: 'order_debit',
            balanceAfter: newBalance,
            orderId: order.id,
            comment: `Заказ #${order.id}`,
          },
        });
      }

      return { order, newBalance };
    });

    // Обновляем сводку сессии
    await updateSessionSummary(prisma, result.order.sessionId);

    res.status(201).json({
      order: result.order,
      newBalance: result.newBalance,
    });
  } catch (err) {
    if (err.message === 'ORDER_CLOSED') {
      return res.status(403).json({ error: 'Приём заказов закрыт' });
    }
    if (err.message === 'INVALID_ITEMS') {
      return res.status(400).json({ error: 'Некорректные позиции меню' });
    }
    if (err.message.startsWith('SOLD_OUT')) {
      const name = err.message.split(':')[1] || '';
      return res.status(409).json({ error: `Блюдо «${name}» закончилось` });
    }
    if (err.message === 'INSUFFICIENT_FUNDS') {
      return res.status(402).json({ error: 'Недостаточно средств' });
    }
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/history/dates?month=YYYY-MM — даты с заказами за месяц (для календаря)
router.get('/history/dates', requireAuth, requireActive, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Параметр month обязателен (YYYY-MM)' });
    }

    const [year, mon] = month.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, mon - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, mon, 1));

    const rows = await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::int as count,
        SUM("totalAmount")::float as total
      FROM "orders"
      WHERE "userId" = ${req.user.id}
        AND "createdAt" >= ${startOfMonth}
        AND "createdAt" < ${endOfMonth}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    res.json(rows.map(r => ({
      date: typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0],
      count: r.count,
      total: r.total,
    })));
  } catch (err) {
    console.error('Order history dates error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/history — история заказов (юзер и препод видят свои)
router.get('/history', requireAuth, requireActive, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    const where = { userId: req.user.id };

    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (err) {
    console.error('Order history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/:id — свой заказ
router.get('/:id', requireAuth, requireActive, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const order = await prisma.order.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    res.json(order);
  } catch (err) {
    console.error('Order detail error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

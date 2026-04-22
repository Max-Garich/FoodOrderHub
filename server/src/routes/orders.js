import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { updateSessionSummary } from '../utils/reports.js';

const router = Router();
router.use(authMiddleware);

// POST /api/orders - Create order
router.post('/', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Заказ должен содержать хотя бы одну позицию' });
    }

    // Validate items format
    for (const item of items) {
      if (!item.dailyMenuId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: 'Некорректный формат позиции заказа' });
      }
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check active session
      const activeSession = await tx.orderSession.findFirst({
        where: { isActive: true },
      });

      if (!activeSession) {
        throw new Error('ORDER_CLOSED');
      }

      // 2. Validate all daily_menu_ids belong to active session
      const dailyMenuIds = items.map((i) => i.dailyMenuId);
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

      // 3. Calculate total
      const menuMap = new Map(dailyMenuItems.map((m) => [m.id, m]));
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = menuMap.get(item.dailyMenuId);
        const subtotal = menuItem.price * item.quantity;
        totalAmount += subtotal;
        orderItems.push({
          dailyMenuId: item.dailyMenuId,
          itemName: menuItem.itemName,
          price: menuItem.price,
          quantity: item.quantity,
          subtotal,
        });
      }

      // 4. Check balance
      const balance = await tx.balance.findUnique({
        where: { userId: req.userId },
      });

      if (!balance || balance.amount + 100 < totalAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 5. Create order
      const order = await tx.order.create({
        data: {
          userId: req.userId,
          sessionId: activeSession.id,
          totalAmount,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });

      // 6. Deduct balance
      const newBalance = balance.amount - totalAmount;
      await tx.balance.update({
        where: { userId: req.userId },
        data: { amount: newBalance },
      });

      // 7. Record balance history
      await tx.balanceHistory.create({
        data: {
          userId: req.userId,
          amount: -totalAmount,
          type: 'order_debit',
          balanceAfter: newBalance,
          orderId: order.id,
          comment: `Заказ #${order.id}`,
        },
      });

      return { order, newBalance };
    });

    // Update session summary in real-time
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
    if (err.message === 'INSUFFICIENT_FUNDS') {
      return res.status(402).json({ error: 'Недостаточно средств' });
    }
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/history
router.get('/history', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    const where = { userId: req.userId };

    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (err) {
    console.error('Order history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const order = await prisma.order.findFirst({
      where: { id: parseInt(req.params.id), userId: req.userId },
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

import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth.js';

const router = Router();
router.use(adminAuthMiddleware);

// GET /api/admin/reports/daily?date=YYYY-MM-DD
router.get('/daily', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Параметр date обязателен (YYYY-MM-DD)' });
    }

    const sessions = await prisma.orderSession.findMany({
      where: { sessionDate: date },
      include: {
        dailyMenus: true,
        orders: {
          include: {
            items: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return res.json({ date, sessions: [], totalRevenue: 0 });
    }

    let totalRevenue = 0;
    const report = sessions.map((session) => {
      const sessionRevenue = session.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      totalRevenue += sessionRevenue;

      return {
        sessionId: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        isActive: session.isActive,
        menu: session.dailyMenus,
        orders: session.orders.map((o) => ({
          orderId: o.id,
          userName: o.user.name,
          userEmail: o.user.email,
          items: o.items,
          total: o.totalAmount,
          time: o.createdAt,
        })),
        revenue: sessionRevenue,
        summary: session.summaryJson ? JSON.parse(session.summaryJson) : null,
      };
    });

    res.json({ date, sessions: report, totalRevenue });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/reports/summary/:sessionId
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const session = await prisma.orderSession.findUnique({
      where: { id: parseInt(req.params.sessionId) },
    });

    if (!session) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }

    if (session.summaryJson) {
      return res.json(JSON.parse(session.summaryJson));
    }

    // Generate summary on the fly
    const orders = await prisma.order.findMany({
      where: { sessionId: session.id },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const dishSummary = {};
    const userSummary = {};

    for (const order of orders) {
      const uid = order.user.id;
      if (!userSummary[uid]) {
        userSummary[uid] = {
          userId: uid,
          userName: order.user.name,
          orderCount: 0,
          totalSpent: 0,
        };
      }
      userSummary[uid].orderCount += 1;
      userSummary[uid].totalSpent += order.totalAmount;

      for (const item of order.items) {
        if (!dishSummary[item.itemName]) {
          dishSummary[item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0 };
        }
        dishSummary[item.itemName].totalQuantity += item.quantity;
        dishSummary[item.itemName].totalAmount += item.subtotal;
      }
    }

    res.json({
      sessionId: session.id,
      sessionDate: session.sessionDate,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      dishes: Object.values(dishSummary),
      users: Object.values(userSummary),
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

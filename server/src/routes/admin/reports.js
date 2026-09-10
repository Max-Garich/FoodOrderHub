import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

// GET /api/canteen/reports/daily?date=YYYY-MM-DD
// CANTEEN_HEAD / SUPER_ADMIN: все группы; MANAGER: только своя группа
router.get('/daily', requireAuth, requireRole('CANTEEN_HEAD', 'SUPER_ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Параметр date обязателен (YYYY-MM-DD)' });
    }

    const isManager = req.user.role === 'MANAGER';

    const sessions = await prisma.orderSession.findMany({
      where: { sessionDate: date },
      include: {
        dailyMenus: true,
        orders: {
          include: {
            items: true,
            user: { select: { id: true, name: true, surname: true, email: true, position: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return res.json({ date, sessions: [], totalRevenue: 0, groups: [], teachers: [] });
    }

    // Менеджер видит только заказы своей группы
    const visibleOrders = (orders) =>
      isManager ? orders.filter((o) => o.groupId === req.user.groupId) : orders;

    let totalRevenue = 0;
    const groupAgg = {};
    const teacherAgg = {};

    const report = sessions.map((session) => {
      const orders = visibleOrders(session.orders);
      const sessionRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      totalRevenue += sessionRevenue;

      // Агрегация по группам и преподавателям (за день, по всем сессиям)
      for (const o of orders) {
        if (o.groupId !== null) {
          if (!groupAgg[o.groupId]) {
            groupAgg[o.groupId] = {
              groupId: o.groupId,
              groupName: o.group?.name || `Группа #${o.groupId}`,
              orderCount: 0,
              totalRevenue: 0,
              dishes: {},
            };
          }
          const g = groupAgg[o.groupId];
          g.orderCount += 1;
          g.totalRevenue += o.totalAmount;
          for (const item of o.items) {
            if (!g.dishes[item.itemName]) {
              g.dishes[item.itemName] = { name: item.itemName, totalQuantity: 0, totalAmount: 0 };
            }
            g.dishes[item.itemName].totalQuantity += item.quantity;
            g.dishes[item.itemName].totalAmount += item.subtotal;
          }
        } else {
          const t = o.user;
          if (!teacherAgg[t.id]) {
            teacherAgg[t.id] = {
              userId: t.id,
              name: t.name,
              surname: t.surname,
              position: t.position,
              orderCount: 0,
              totalSpent: 0,
            };
          }
          teacherAgg[t.id].orderCount += 1;
          teacherAgg[t.id].totalSpent += o.totalAmount;
        }
      }

      return {
        sessionId: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        isActive: session.isActive,
        menu: session.dailyMenus,
        orders: orders.map((o) => ({
          orderId: o.id,
          userName: o.user.name,
          userSurname: o.user.surname,
          userEmail: o.user.email,
          groupId: o.groupId,
          groupName: o.group?.name || null,
          items: o.items,
          total: o.totalAmount,
          time: o.createdAt,
        })),
        revenue: sessionRevenue,
        // Менеджеру не показываем общую сводку (в ней чужие группы)
        summary: isManager ? null : (session.summaryJson ? JSON.parse(session.summaryJson) : null),
      };
    });

    res.json({
      date,
      sessions: report,
      totalRevenue,
      groups: Object.values(groupAgg).map((g) => ({
        groupId: g.groupId,
        groupName: g.groupName,
        orderCount: g.orderCount,
        totalRevenue: g.totalRevenue,
        dishes: Object.values(g.dishes),
      })),
      teachers: Object.values(teacherAgg),
    });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

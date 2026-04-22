import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth.js';
import { updateSessionSummary } from '../../utils/reports.js';

const router = Router();
router.use(adminAuthMiddleware);

// GET /api/admin/sessions/current
router.get('/current', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const session = await prisma.orderSession.findFirst({
      where: { isActive: true },
      include: {
        dailyMenus: { where: { isAvailable: true } },
        _count: { select: { orders: true } },
      },
    });

    if (!session) {
      // Return the latest draft or null
      const today = new Date().toISOString().split('T')[0];
      const draft = await prisma.orderSession.findFirst({
        where: { sessionDate: today, endedAt: null },
        include: {
          dailyMenus: true,
          _count: { select: { orders: true } },
        },
      });

      return res.json({ session: draft || null, isActive: false });
    }

    // Calculate current totals
    const orders = await prisma.order.findMany({
      where: { sessionId: session.id },
    });
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      session,
      isActive: true,
      stats: {
        orderCount: orders.length,
        totalRevenue,
      },
    });
  } catch (err) {
    console.error('Current session error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/sessions/start
router.post('/start', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    // Check no active session
    const existing = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });
    if (existing) {
      return res.status(409).json({ error: 'Уже есть активная сессия заказов' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Find draft session or create new
    let session = await prisma.orderSession.findFirst({
      where: { sessionDate: today, endedAt: null, isActive: false },
      include: { dailyMenus: { where: { isAvailable: true } } },
    });

    if (session) {
      if (session.dailyMenus.length === 0) {
        return res.status(400).json({ error: 'Добавьте хотя бы одну позицию в меню перед началом заказов' });
      }

      session = await prisma.orderSession.update({
        where: { id: session.id },
        data: { isActive: true, startedAt: new Date() },
        include: { dailyMenus: { where: { isAvailable: true } } },
      });
    } else {
      return res.status(400).json({ error: 'Сначала создайте меню на сегодня' });
    }

    res.json({
      message: 'Приём заказов начат',
      session,
    });
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/sessions/stop
router.post('/stop', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    const session = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });

    if (!session) {
      return res.status(404).json({ error: 'Нет активной сессии заказов' });
    }

    // Close session
    await prisma.orderSession.update({
      where: { id: session.id },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    // Generate/Update summary
    const summary = await updateSessionSummary(prisma, session.id);

    res.json(summary);
  } catch (err) {
    console.error('Stop session error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/sessions - list all sessions
router.get('/', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    const where = {};
    if (date) {
      where.sessionDate = date;
    }

    const sessions = await prisma.orderSession.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        _count: { select: { orders: true, dailyMenus: true } },
      },
    });

    res.json(sessions);
  } catch (err) {
    console.error('Sessions list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

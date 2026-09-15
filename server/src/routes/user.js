import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/user/profile — доступен и PENDING-юзерам (poll статуса)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        role: true,
        status: true,
        position: true,
        groupId: true,
        managerIsTeacher: true,
        group: { select: { id: true, name: true, paymentPhone: true, paymentBank: true } },
        balance: { select: { amount: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      role: user.role,
      status: user.status,
      position: user.position,
      group: user.group,
      managerIsTeacher: user.managerIsTeacher ?? false,
      balance: user.balance ? user.balance.amount : null,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/user/balance — у преподавателя balance: null, hasBalance: false
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const balance = await prisma.balance.findUnique({
      where: { userId: req.user.id },
    });

    res.json({
      balance: balance ? balance.amount : null,
      hasBalance: !!balance,
    });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/user/balance-history
router.get('/balance-history', requireAuth, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const history = await prisma.balanceHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(history);
  } catch (err) {
    console.error('Balance history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

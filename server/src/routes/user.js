import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, phone: true, createdAt: true },
    });

    const balance = await prisma.balance.findUnique({
      where: { userId: req.userId },
    });

    res.json({
      ...user,
      balance: balance ? balance.amount : 0,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/user/balance
router.get('/balance', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const balance = await prisma.balance.findUnique({
      where: { userId: req.userId },
    });

    res.json({ balance: balance ? balance.amount : 0 });
  } catch (err) {
    console.error('Balance error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/user/balance-history
router.get('/balance-history', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const history = await prisma.balanceHistory.findMany({
      where: { userId: req.userId },
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

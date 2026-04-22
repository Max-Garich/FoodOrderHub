import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/menu/today - public for authenticated users
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    const activeSession = await prisma.orderSession.findFirst({
      where: { isActive: true },
      include: {
        dailyMenus: {
          where: { isAvailable: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Get user's favorites
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.userId },
      select: { menuItemId: true }
    });
    const favoriteIds = favorites.map(f => f.menuItemId);

    if (!activeSession) {
      // Check if there's a session today that ended
      const today = new Date().toISOString().split('T')[0];
      const todaySession = await prisma.orderSession.findFirst({
        where: { sessionDate: today },
        include: {
          dailyMenus: {
            where: { isAvailable: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });

      return res.json({
        isOrderingActive: false,
        sessionDate: todaySession?.sessionDate || today,
        items: todaySession?.dailyMenus || [],
        favorites: favoriteIds,
      });
    }

    res.json({
      isOrderingActive: true,
      sessionId: activeSession.id,
      sessionDate: activeSession.sessionDate,
      items: activeSession.dailyMenus,
      favorites: favoriteIds,
    });
  } catch (err) {
    console.error('Menu today error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/menu/status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const activeSession = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });

    res.json({ isActive: !!activeSession });
  } catch (err) {
    console.error('Menu status error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/menu/favorites
router.post('/favorites', authMiddleware, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { menuItemId } = req.body;

    if (!menuItemId) {
      return res.status(400).json({ error: 'menuItemId обязателен' });
    }

    // Toggle favorite
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_menuItemId: {
          userId: req.userId,
          menuItemId: menuItemId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return res.json({ isFavorite: false });
    } else {
      await prisma.favorite.create({
        data: {
          userId: req.userId,
          menuItemId: menuItemId
        }
      });
      return res.json({ isFavorite: true });
    }
  } catch (err) {
    console.error('Favorites error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

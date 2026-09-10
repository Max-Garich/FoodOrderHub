import { Router } from 'express';
import { requireAuth, requireActive } from '../middleware/auth.js';

const router = Router();

// Добавляет remaining и soldOut к позиции меню
function decorate(item) {
  const remaining = item.maxQuantity - item.orderedQuantity;
  return { ...item, remaining, soldOut: remaining <= 0 };
}

// GET /api/menu/today — меню активной (или последней) сессии
router.get('/today', requireAuth, requireActive, async (req, res) => {
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

    // Избранное юзера
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      select: { menuItemId: true },
    });
    const favoriteIds = favorites.map((f) => f.menuItemId);

    let session = activeSession;
    let isOrderingActive = true;

    if (!session) {
      // Возможно, сессия сегодня уже завершилась
      const today = new Date().toISOString().split('T')[0];
      session = await prisma.orderSession.findFirst({
        where: { sessionDate: today },
        include: {
          dailyMenus: {
            where: { isAvailable: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { id: 'desc' },
      });
      isOrderingActive = false;
    }

    const all = (session?.dailyMenus || []).map(decorate);

    res.json({
      isOrderingActive,
      sessionId: session?.id || null,
      sessionDate: session?.sessionDate || new Date().toISOString().split('T')[0],
      items: all.filter((m) => !m.isAdditional),
      additionalItems: all.filter((m) => m.isAdditional),
      favorites: favoriteIds,
    });
  } catch (err) {
    console.error('Menu today error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/menu/status — активна ли сессия заказов
router.get('/status', requireAuth, async (req, res) => {
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

// POST /api/menu/favorites — переключить избранное
router.post('/favorites', requireAuth, async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { menuItemId } = req.body;

    if (!menuItemId) {
      return res.status(400).json({ error: 'menuItemId обязателен' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_menuItemId: {
          userId: req.user.id,
          menuItemId: menuItemId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return res.json({ isFavorite: false });
    }

    await prisma.favorite.create({
      data: {
        userId: req.user.id,
        menuItemId: menuItemId,
      },
    });
    return res.json({ isFavorite: true });
  } catch (err) {
    console.error('Favorites error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

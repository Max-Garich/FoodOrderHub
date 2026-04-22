import { Router } from 'express';
import { adminAuthMiddleware } from '../../middleware/auth.js';

const router = Router();
router.use(adminAuthMiddleware);

// GET /api/admin/menu/items - справочник блюд
router.get('/items', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const items = await prisma.menuItem.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (err) {
    console.error('Menu items error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/menu/items - создать блюдо в справочнике
router.post('/items', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, description, defaultPrice, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название обязательно' });
    }

    const item = await prisma.menuItem.create({
      data: { 
        name, 
        description: description || null,
        category: category || "Прочее",
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : null,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('Create menu item error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/admin/menu/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, description, defaultPrice, category } = req.body;

    const data = {
      name, 
      description,
      defaultPrice: defaultPrice ? parseFloat(defaultPrice) : null,
    };
    if (category !== undefined) data.category = category;

    const item = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data,
    });

    res.json(item);
  } catch (err) {
    console.error('Update menu item error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/admin/menu/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: { isDeleted: true },
    });
    res.json({ message: 'Блюдо удалено' });
  } catch (err) {
    console.error('Delete menu item error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/menu/daily - menu for current/latest session
router.get('/daily', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    let session = await prisma.orderSession.findFirst({
      where: { isActive: true },
      include: { dailyMenus: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      // get the latest session
      session = await prisma.orderSession.findFirst({
        orderBy: { id: 'desc' },
        include: { dailyMenus: { orderBy: { createdAt: 'asc' } } },
      });
    }

    res.json({
      session: session
        ? {
            id: session.id,
            sessionDate: session.sessionDate,
            isActive: session.isActive,
          }
        : null,
      items: session?.dailyMenus || [],
    });
  } catch (err) {
    console.error('Daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/menu/daily - add item to current session menu
router.post('/daily', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { menuItemId, itemName, price, category } = req.body;

    if (!itemName || price === undefined || price === null) {
      return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Цена должна быть положительной' });
    }

    // Find or create a session for today
    const today = new Date().toISOString().split('T')[0];
    let session = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });

    if (!session) {
      // Create a new draft session (not active yet)
      session = await prisma.orderSession.findFirst({
        where: { sessionDate: today, isActive: false, endedAt: null },
      });

      if (!session) {
        session = await prisma.orderSession.create({
          data: {
            adminId: req.adminId,
            sessionDate: today,
            isActive: false,
          },
        });
      }
    }

    const dailyMenu = await prisma.dailyMenu.create({
      data: {
        sessionId: session.id,
        menuItemId: menuItemId || null,
        itemName,
        category: category || "Прочее",
        price,
      },
    });

    res.status(201).json(dailyMenu);
  } catch (err) {
    console.error('Add daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/admin/menu/daily/:id
router.put('/daily/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { itemName, price, isAvailable, category } = req.body;

    const data = {};
    if (itemName !== undefined) data.itemName = itemName;
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = price;
    if (isAvailable !== undefined) data.isAvailable = isAvailable;

    const item = await prisma.dailyMenu.update({
      where: { id: parseInt(req.params.id) },
      data,
    });

    res.json(item);
  } catch (err) {
    console.error('Update daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/admin/menu/daily/:id
router.delete('/daily/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    // Check no orders reference this item
    const orderItems = await prisma.orderItem.findFirst({
      where: { dailyMenuId: parseInt(req.params.id) },
    });

    if (orderItems) {
      // Just mark as unavailable instead of deleting
      await prisma.dailyMenu.update({
        where: { id: parseInt(req.params.id) },
        data: { isAvailable: false },
      });
      return res.json({ message: 'Позиция скрыта (есть связанные заказы)' });
    }

    await prisma.dailyMenu.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Позиция удалена' });
  } catch (err) {
    console.error('Delete daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

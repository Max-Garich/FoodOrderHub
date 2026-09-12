import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('CANTEEN_HEAD', 'SUPER_ADMIN'));

function zodErrorMessage(err) {
  const issue = err.issues?.[0];
  return issue ? issue.message : 'Некорректные данные';
}

const dailySchema = z.object({
  itemName: z.string().min(1, 'Название обязательно'),
  price: z.coerce.number().positive('Цена должна быть положительной'),
  category: z.string().optional(),
  maxQuantity: z.coerce.number({ invalid_type_error: 'Лимит порций обязателен' })
    .int('Лимит порций должен быть целым числом')
    .min(0, 'Лимит порций не может быть отрицательным'),
  menuItemId: z.coerce.number().int().positive().optional().nullable(),
  photoUrl: z.string().max(700000, 'Фото слишком большое (до ~500 КБ)').optional().nullable(),
});

const catalogSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional().nullable(),
  defaultPrice: z.coerce.number().positive().optional().nullable(),
  defaultMaxQuantity: z.coerce.number({ invalid_type_error: 'Порции должны быть числом' })
    .int('Порции должны быть целым числом')
    .min(0, 'Порции не могут быть отрицательными')
    .optional().nullable(),
  category: z.string().optional(),
  photoUrl: z.string().max(700000, 'Фото слишком большое (до ~500 КБ)').optional().nullable(),
});

// ═══════════════════════════════════════════════
// Справочник блюд
// ═══════════════════════════════════════════════

// GET /api/canteen/menu/items
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

// POST /api/canteen/menu/items
router.post('/items', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = catalogSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { name, description, defaultPrice, defaultMaxQuantity, category, photoUrl } = parsed.data;

    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        category: category || 'Прочее',
        defaultPrice: defaultPrice ?? null,
        defaultMaxQuantity: defaultMaxQuantity ?? null,
        photoUrl: photoUrl || null,
      },
    });

    res.status(201).json(item);
  } catch (err) {
    console.error('Create menu item error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/canteen/menu/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { name, description, defaultPrice, defaultMaxQuantity, category, photoUrl } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (defaultPrice !== undefined) data.defaultPrice = defaultPrice === null ? null : parseFloat(defaultPrice);
    if (defaultMaxQuantity !== undefined) {
      data.defaultMaxQuantity = defaultMaxQuantity === null ? null : parseInt(defaultMaxQuantity);
    }
    if (category !== undefined) data.category = category;
    if (photoUrl !== undefined) data.photoUrl = photoUrl === null ? null : String(photoUrl);

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

// DELETE /api/canteen/menu/items/:id
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

// ═══════════════════════════════════════════════
// Ежедневное меню
// ═══════════════════════════════════════════════

// GET /api/canteen/menu/daily — меню текущей/последней сессии
router.get('/daily', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    let session = await prisma.orderSession.findFirst({
      where: { isActive: true },
      include: { dailyMenus: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      session = await prisma.orderSession.findFirst({
        orderBy: { id: 'desc' },
        include: { dailyMenus: { orderBy: { createdAt: 'asc' } } },
      });
    }

    res.json({
      session: session
        ? { id: session.id, sessionDate: session.sessionDate, isActive: session.isActive }
        : null,
      items: (session?.dailyMenus || []).map((m) => ({
        ...m,
        remaining: m.maxQuantity - m.orderedQuantity,
      })),
    });
  } catch (err) {
    console.error('Daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/canteen/menu/daily — позиция основного меню (maxQuantity обязателен)
router.post('/daily', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = dailySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { menuItemId, itemName, price, category, maxQuantity, photoUrl: bodyPhoto } = parsed.data;

    // Найти активную сессию или черновик на сегодня
    const today = new Date().toISOString().split('T')[0];
    let session = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });

    if (!session) {
      session = await prisma.orderSession.findFirst({
        where: { sessionDate: today, isActive: false, endedAt: null },
      });

      if (!session) {
        session = await prisma.orderSession.create({
          data: {
            createdByUserId: req.user.id,
            sessionDate: today,
            isActive: false,
          },
        });
      }
    }

    // Блюдо из справочника: взять фото и запомнить использованные цену/порции,
    // чтобы в следующий раз «В меню» подставило последние данные.
    // Явно переданное фото (из формы главы столовой) приоритетнее.
    let photoUrl = bodyPhoto || null;
    if (menuItemId) {
      const catalogItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (catalogItem) {
        photoUrl = photoUrl || catalogItem.photoUrl;
        await prisma.menuItem.update({
          where: { id: menuItemId },
          data: {
            defaultPrice: price,
            defaultMaxQuantity: maxQuantity,
            ...(photoUrl ? { photoUrl } : {}),
          },
        });
      }
    }

    const dailyMenu = await prisma.dailyMenu.create({
      data: {
        sessionId: session.id,
        menuItemId: menuItemId || null,
        itemName,
        category: category || 'Прочее',
        price,
        maxQuantity,
        isAdditional: false,
        photoUrl,
      },
    });

    res.status(201).json(dailyMenu);
  } catch (err) {
    console.error('Add daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/canteen/menu/additional — доп-меню (только при активной сессии)
router.post('/additional', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = dailySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { menuItemId, itemName, price, category, maxQuantity, photoUrl: bodyPhoto } = parsed.data;

    const activeSession = await prisma.orderSession.findFirst({
      where: { isActive: true },
    });
    if (!activeSession) {
      return res.status(403).json({ error: 'Доп-меню можно добавлять только во время активной сессии заказов' });
    }

    // Фото из справочника + запоминание использованных цены/порций
    let photoUrl = bodyPhoto || null;
    if (menuItemId) {
      const catalogItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (catalogItem) {
        photoUrl = photoUrl || catalogItem.photoUrl;
        await prisma.menuItem.update({
          where: { id: menuItemId },
          data: {
            defaultPrice: price,
            defaultMaxQuantity: maxQuantity,
            ...(photoUrl ? { photoUrl } : {}),
          },
        });
      }
    }

    const dailyMenu = await prisma.dailyMenu.create({
      data: {
        sessionId: activeSession.id,
        menuItemId: menuItemId || null,
        itemName,
        category: category || 'Прочее',
        price,
        maxQuantity,
        isAdditional: true,
        photoUrl,
      },
    });

    res.status(201).json(dailyMenu);
  } catch (err) {
    console.error('Add additional menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/canteen/menu/daily/:id — обновление позиции
router.put('/daily/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { itemName, price, isAvailable, category, maxQuantity } = req.body;

    const existing = await prisma.dailyMenu.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Позиция не найдена' });
    }

    // Запрет снижения лимита ниже уже заказанного
    if (maxQuantity !== undefined && maxQuantity !== null) {
      const newMax = parseInt(maxQuantity);
      if (Number.isNaN(newMax) || newMax < 0) {
        return res.status(400).json({ error: 'Лимит порций должен быть целым числом ≥ 0' });
      }
      if (newMax < existing.orderedQuantity) {
        return res.status(409).json({ error: 'Нельзя установить лимит ниже уже заказанного количества' });
      }
    }

    const data = {};
    if (itemName !== undefined) data.itemName = itemName;
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = parseFloat(price);
    if (isAvailable !== undefined) data.isAvailable = isAvailable;
    if (maxQuantity !== undefined && maxQuantity !== null) data.maxQuantity = parseInt(maxQuantity);
    if (photoUrl !== undefined) data.photoUrl = photoUrl === null ? null : String(photoUrl);

    const item = await prisma.dailyMenu.update({
      where: { id: existing.id },
      data,
    });

    res.json(item);
  } catch (err) {
    console.error('Update daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/canteen/menu/daily/:id — скрытие при наличии заказов
router.delete('/daily/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const id = parseInt(req.params.id);

    const orderItems = await prisma.orderItem.findFirst({
      where: { dailyMenuId: id },
    });

    if (orderItems) {
      await prisma.dailyMenu.update({
        where: { id },
        data: { isAvailable: false },
      });
      return res.json({ message: 'Позиция скрыта (есть связанные заказы)' });
    }

    await prisma.dailyMenu.delete({ where: { id } });
    res.json({ message: 'Позиция удалена' });
  } catch (err) {
    console.error('Delete daily menu error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

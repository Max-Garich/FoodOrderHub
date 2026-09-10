import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const teachersRouter = Router();

const groupSchema = z.object({
  name: z.string().min(1, 'Название группы обязательно'),
  paymentPhone: z.string().min(1, 'Телефон для оплаты обязателен'),
  paymentBank: z.string().min(1, 'Банк обязателен'),
});

// Для PUT: поля опциональны (можно менять только isActive), но хотя бы одно должно быть
const groupUpdateSchema = z.object({
  name: z.string().min(1, 'Название группы обязательно').optional(),
  paymentPhone: z.string().min(1, 'Телефон для оплаты обязателен').optional(),
  paymentBank: z.string().min(1, 'Банк обязателен').optional(),
  isActive: z.boolean().optional(),
});

const paymentSchema = z.object({
  paymentPhone: z.string().min(1, 'Телефон для оплаты обязателен'),
  paymentBank: z.string().min(1, 'Банк обязателен'),
  groupId: z.coerce.number().int().positive().optional(),
});

function zodErrorMessage(err) {
  const issue = err.issues?.[0];
  return issue ? issue.message : 'Некорректные данные';
}

// GET /api/groups — публичный список активных групп (для формы регистрации)
router.get('/groups', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const groups = await prisma.group.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(groups);
  } catch (err) {
    console.error('Groups list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/groups — все группы со счётчиками (SUPER_ADMIN)
router.get('/admin/groups', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const groups = await prisma.group.findMany({
      include: {
        users: {
          where: { isDeleted: false },
          select: { status: true, role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groups.map((g) => {
      const members = g.users.filter((u) => u.status === 'ACTIVE' && u.role !== 'TEACHER');
      const pending = g.users.filter((u) => u.status === 'PENDING');
      const { users, ...rest } = g;
      return { ...rest, memberCount: members.length, pendingCount: pending.length };
    }));
  } catch (err) {
    console.error('Admin groups list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/groups — создание группы (SUPER_ADMIN)
router.post('/admin/groups', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }

    const existing = await prisma.group.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return res.status(409).json({ error: 'Группа с таким названием уже существует' });
    }

    const group = await prisma.group.create({ data: parsed.data });
    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/admin/groups/:id — редактирование группы (SUPER_ADMIN)
router.put('/admin/groups/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = groupUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const data = parsed.data;
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    const id = parseInt(req.params.id);
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    if (data.name) {
      const nameTaken = await prisma.group.findFirst({
        where: { name: data.name, id: { not: id } },
      });
      if (nameTaken) {
        return res.status(409).json({ error: 'Группа с таким названием уже существует' });
      }
    }

    const group = await prisma.group.update({ where: { id }, data });
    res.json(group);
  } catch (err) {
    console.error('Update group error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/admin/groups/:id — мягкое удаление группы (SUPER_ADMIN)
router.delete('/admin/groups/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const id = parseInt(req.params.id);
    const existing = await prisma.group.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    await prisma.group.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Группа деактивирована' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/manager/group/payment — реквизиты оплаты группы
// MANAGER: только своя группа; SUPER_ADMIN: любая (groupId в теле)
router.put('/manager/group/payment', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { paymentPhone, paymentBank, groupId } = parsed.data;

    let targetGroupId;
    if (req.user.role === 'MANAGER') {
      targetGroupId = req.user.groupId;
      if (!targetGroupId) {
        return res.status(403).json({ error: 'Вы не привязаны к группе' });
      }
    } else {
      // SUPER_ADMIN — любая группа
      targetGroupId = groupId;
      if (!targetGroupId) {
        return res.status(400).json({ error: 'Укажите groupId группы' });
      }
    }

    const group = await prisma.group.findUnique({ where: { id: targetGroupId } });
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    const updated = await prisma.group.update({
      where: { id: targetGroupId },
      data: { paymentPhone, paymentBank },
    });

    res.json(updated);
  } catch (err) {
    console.error('Update group payment error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

// ═══════════════════════════════════════════════
// GET /api/admin/teachers — список преподавателей с агрегацией заказов
// Только SUPER_ADMIN
// ═══════════════════════════════════════════════
teachersRouter.get('/admin/teachers', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { date } = req.query;

    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER', isDeleted: false },
      select: {
        id: true, name: true, surname: true, email: true, position: true, status: true, createdAt: true,
      },
      orderBy: [{ surname: 'asc' }, { name: 'asc' }],
    });

    // Собираем заказы преподов (groupId = null)
    const where = { groupId: null };
    if (date) {
      const startOfDay = new Date(date + 'T00:00:00.000Z');
      const endOfDay = new Date(date + 'T23:59:59.999Z');
      where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        user: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Агрегация по каждому преподу
    const teacherOrders = {};
    for (const order of orders) {
      const tid = order.userId;
      if (!teacherOrders[tid]) {
        teacherOrders[tid] = { orderCount: 0, totalSpent: 0, orders: [] };
      }
      teacherOrders[tid].orderCount += 1;
      teacherOrders[tid].totalSpent += order.totalAmount;
      teacherOrders[tid].orders.push({
        id: order.id, totalAmount: order.totalAmount, createdAt: order.createdAt,
        items: order.items.map(i => ({ itemName: i.itemName, quantity: i.quantity, price: i.price, subtotal: i.subtotal })),
      });
    }

    res.json(teachers.map((t) => ({
      ...t,
      orderCount: teacherOrders[t.id]?.orderCount || 0,
      totalSpent: teacherOrders[t.id]?.totalSpent || 0,
      orders: teacherOrders[t.id]?.orders || [],
    })));
  } catch (err) {
    console.error('Admin teachers error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export { teachersRouter };

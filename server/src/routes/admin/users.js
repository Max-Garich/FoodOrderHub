import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();

const roleSchema = z.object({
  role: z.enum(['USER', 'TEACHER', 'MANAGER', 'CANTEEN_HEAD', 'SUPER_ADMIN'], {
    errorMap: () => ({ message: 'Некорректная роль' }),
  }),
});

const passwordSchema = z.object({
  password: z.string().min(4, 'Пароль должен быть не менее 4 символов'),
});

function zodErrorMessage(err) {
  const issue = err.issues?.[0];
  return issue ? issue.message : 'Некорректные данные';
}

// ═══════════════════════════════════════════════
// Менеджер группы: юзеры, балансы, заявки
// ═══════════════════════════════════════════════

// GET /api/manager/users — MANAGER: своя группа; SUPER_ADMIN: все или ?groupId= конкретная
router.get('/manager/users', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    const where = { isDeleted: false, status: 'ACTIVE' };
    if (req.user.role === 'MANAGER') {
      where.groupId = req.user.groupId;
      where.role = { in: ['USER', 'MANAGER'] }; // без преподов
    } else if (req.query.groupId) {
      where.groupId = parseInt(req.query.groupId);
      where.role = { in: ['USER', 'MANAGER'] };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        role: true,
        status: true,
        groupId: true,
        group: { select: { id: true, name: true } },
        balance: { select: { amount: true } },
        createdAt: true,
      },
      orderBy: [{ surname: 'asc' }, { name: 'asc' }],
    });

    res.json(users.map((u) => ({ ...u, balance: u.balance ? u.balance.amount : null })));
  } catch (err) {
    console.error('Manager users error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/manager/users/:id/balance-history — история баланса юзера
router.get('/manager/users/:id/balance-history', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (req.user.role === 'MANAGER' && target.groupId !== req.user.groupId) {
      return res.status(403).json({ error: 'Вы можете смотреть балансы только в своей группе' });
    }

    const history = await prisma.balanceHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(history);
  } catch (err) {
    console.error('Manager balance history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/manager/users/:id/topup — пополнение баланса
router.post('/manager/users/:id/topup', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);
    const { amount, comment } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Сумма пополнения должна быть положительной' });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (target.role === 'TEACHER') {
      return res.status(400).json({ error: 'У преподавателя нет баланса' });
    }
    if (req.user.role === 'MANAGER' && target.groupId !== req.user.groupId) {
      return res.status(403).json({ error: 'Вы можете изменять баланс только в своей группе' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let balance = await tx.balance.findUnique({ where: { userId } });
      if (!balance) {
        balance = await tx.balance.create({ data: { userId, amount: 0 } });
      }

      const newAmount = balance.amount + amount;
      await tx.balance.update({
        where: { userId },
        data: { amount: newAmount },
      });

      await tx.balanceHistory.create({
        data: {
          userId,
          managerId: req.user.id,
          amount: amount,
          type: 'topup',
          balanceAfter: newAmount,
          comment: comment || 'Пополнение',
        },
      });

      return { newBalance: newAmount, userName: `${target.name} ${target.surname}` };
    });

    res.json({
      message: `Баланс пользователя ${result.userName} пополнен`,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error('Topup error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/manager/users/:id/subtract — списание с баланса
router.post('/manager/users/:id/subtract', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);
    const { amount, comment } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Сумма списания должна быть больше нуля' });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (target.role === 'TEACHER') {
      return res.status(400).json({ error: 'У преподавателя нет баланса' });
    }
    if (req.user.role === 'MANAGER' && target.groupId !== req.user.groupId) {
      return res.status(403).json({ error: 'Вы можете изменять баланс только в своей группе' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let balance = await tx.balance.findUnique({ where: { userId } });
      if (!balance) {
        balance = await tx.balance.create({ data: { userId, amount: 0 } });
      }

      const newAmount = balance.amount - amount;
      await tx.balance.update({
        where: { userId },
        data: { amount: newAmount },
      });

      await tx.balanceHistory.create({
        data: {
          userId,
          managerId: req.user.id,
          amount: -amount,
          type: 'admin_subtract',
          balanceAfter: newAmount,
          comment: comment || 'Списание',
        },
      });

      return { newBalance: newAmount, userName: `${target.name} ${target.surname}` };
    });

    res.json({
      message: `С баланса ${result.userName} списано ₽${amount}`,
      newBalance: result.newBalance,
    });
  } catch (err) {
    console.error('Subtract error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/manager/requests — заявки на подключение
// MANAGER: PENDING-юзеры своей группы; SUPER_ADMIN: ВСЕ PENDING (включая преподов) или ?groupId= конкретной группы
router.get('/manager/requests', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;

    const where = { status: 'PENDING', isDeleted: false };
    if (req.user.role === 'MANAGER') {
      where.groupId = req.user.groupId;
    } else if (req.query.groupId) {
      where.groupId = parseInt(req.query.groupId);
    }

    const requests = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        role: true,
        position: true,
        groupId: true,
        group: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(requests);
  } catch (err) {
    console.error('Manager requests error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/manager/requests/:userId/accept — принять заявку
router.post('/manager/requests/:userId/accept', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.userId);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (target.status !== 'PENDING') {
      return res.status(400).json({ error: 'Заявка уже обработана' });
    }
    if (req.user.role === 'MANAGER') {
      if (target.role === 'TEACHER') {
        return res.status(403).json({ error: 'Заявки преподавателей принимает только главный админ' });
      }
      if (target.groupId !== req.user.groupId) {
        return res.status(403).json({ error: 'Эта заявка не из вашей группы' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
    });

    res.json({
      message: 'Заявка принята',
      user: { id: updated.id, name: updated.name, surname: updated.surname, status: updated.status },
    });
  } catch (err) {
    console.error('Accept request error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/manager/requests/:userId/reject — отклонить заявку
router.post('/manager/requests/:userId/reject', requireAuth, requireRole('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.userId);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (target.status !== 'PENDING') {
      return res.status(400).json({ error: 'Заявка уже обработана' });
    }
    if (req.user.role === 'MANAGER') {
      if (target.role === 'TEACHER') {
        return res.status(403).json({ error: 'Заявки преподавателей принимает только главный админ' });
      }
      if (target.groupId !== req.user.groupId) {
        return res.status(403).json({ error: 'Эта заявка не из вашей группы' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
    });

    res.json({
      message: 'Заявка отклонена',
      user: { id: updated.id, name: updated.name, surname: updated.surname, status: updated.status },
    });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ═══════════════════════════════════════════════
// Только SUPER_ADMIN
// ═══════════════════════════════════════════════

// PUT /api/admin/users/:id/role — назначение роли
router.put('/admin/users/:id/role', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { role } = parsed.data;

    const target = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (role === 'MANAGER' && !target.groupId) {
      return res.status(400).json({ error: 'Менеджер должен состоять в группе' });
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role },
    });

    res.json({
      message: 'Роль обновлена',
      user: { id: updated.id, name: updated.name, surname: updated.surname, role: updated.role },
    });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/admin/users/:id — мягкое удаление
router.delete('/admin/users/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const target = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!target) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { isDeleted: true },
    });
    res.json({ message: 'Пользователь удален' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/users/:id/reset-password — сброс пароля
router.post('/admin/users/:id/reset-password', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }

    const target = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash },
    });

    res.json({ message: 'Пароль обновлен' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

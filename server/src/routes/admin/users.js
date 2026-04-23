import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { adminAuthMiddleware } from '../../middleware/auth.js';

const router = Router();
router.use(adminAuthMiddleware);

// GET /api/admin/users - list all users with balances
router.get('/', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        balance: { select: { amount: true } },
      },
      orderBy: { name: 'asc' },
    });

    const activeAdmins = await prisma.admin.findMany({ where: { isActive: true }, select: { email: true } });
    const adminEmails = new Set(activeAdmins.map(a => a.email));

    const result = users.map((u) => {
      const data = {
        ...u,
        balance: u.balance ? u.balance.amount : 0,
        isAdmin: adminEmails.has(u.email)
      };
      return data;
    });

    res.json(result);
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/users/:id
router.get('/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        balance: { select: { amount: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      ...user,
      balance: user.balance ? user.balance.amount : 0,
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/users/:id/topup - top up user balance
router.post('/:id/topup', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);
    const { amount, comment } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Сумма пополнения должна быть положительной' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('USER_NOT_FOUND');

      let balance = await tx.balance.findUnique({ where: { userId } });

      if (!balance) {
        balance = await tx.balance.create({
          data: { userId, amount: 0 },
        });
      }

      const newAmount = balance.amount + amount;

      await tx.balance.update({
        where: { userId },
        data: { amount: newAmount },
      });

      await tx.balanceHistory.create({
        data: {
          userId,
          adminId: req.adminId,
          amount: amount,
          type: 'topup',
          balanceAfter: newAmount,
          comment: comment || 'Пополнение администратором',
        },
      });

      return { newBalance: newAmount, userName: user.name };
    });

    res.json({
      message: `Баланс пользователя ${result.userName} пополнен`,
      newBalance: result.newBalance,
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    console.error('Topup error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/users/:id/subtract - subtract from user balance
router.post('/:id/subtract', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);
    const { amount, comment } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Сумма списания должна быть больше нуля' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('USER_NOT_FOUND');

      let balance = await tx.balance.findUnique({ where: { userId } });

      if (!balance) {
        balance = await tx.balance.create({
          data: { userId, amount: 0 },
        });
      }

      const newAmount = balance.amount - amount;

      await tx.balance.update({
        where: { userId },
        data: { amount: newAmount },
      });

      await tx.balanceHistory.create({
        data: {
          userId,
          adminId: req.adminId,
          amount: -amount,
          type: 'admin_subtract',
          balanceAfter: newAmount,
          comment: comment || 'Списание администратором',
        },
      });

      return { newBalance: newAmount, userName: user.name };
    });

    res.json({
      message: `С баланса ${result.userName} списано ₽${amount}`,
      newBalance: result.newBalance,
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    console.error('Subtract error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/admin/users/:id/balance-history
router.get('/:id/balance-history', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const userId = parseInt(req.params.id);

    const history = await prisma.balanceHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(history);
  } catch (err) {
    console.error('Balance history error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/:id/role', async (req, res) => {
  if (!req.isSuperAdmin) return res.status(403).json({ error: 'Только Главный админ может управлять правами' });
  try {
    const prisma = req.app.locals.prisma;
    const { isAdmin } = req.body;
    const user = await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    
    const admin = await prisma.admin.findUnique({ where: { email: user.email } });
    
    if (isAdmin) {
      if (!admin) {
        await prisma.admin.create({
          data: { email: user.email, name: user.name, passwordHash: user.passwordHash, isActive: true }
        });
      } else {
        await prisma.admin.update({ where: { email: user.email }, data: { isActive: true } });
      }
    } else {
      if (admin && !admin.isSuperAdmin) {
        await prisma.admin.update({ where: { email: user.email }, data: { isActive: false } });
      }
    }
    res.json({ message: 'Права обновлены' });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { isDeleted: true },
    });
    res.json({ message: 'Пользователь удален' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { newPassword } = req.body;
    const userId = parseInt(req.params.id);

    console.log('Reset password for user:', userId, 'newPassword:', newPassword ? 'yes' : 'no');

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    console.log('Password updated for user:', userId);
    res.json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

export default router;

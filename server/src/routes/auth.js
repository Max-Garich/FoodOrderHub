import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 4 символов' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone: phone || null },
    });

    // Create balance record
    await prisma.balance.create({
      data: { userId: user.id, amount: 0 },
    });

    const token = generateToken({ id: user.id, email: user.email, role: 'user' });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: 'user' });

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      console.warn(`[Login] Admin not found or inactive: ${email}`);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      console.warn(`[Login] Invalid password for admin: ${email}`);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    console.log(`[Login] Admin logged in successfully: ${email}`);
    const token = generateToken({ id: admin.id, email: admin.email, role: 'admin', isSuperAdmin: admin.isSuperAdmin });

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, isSuperAdmin: admin.isSuperAdmin },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

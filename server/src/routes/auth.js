import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateToken } from '../middleware/auth.js';

const router = Router();

const CYRILLIC = /^[А-ЯЁа-яё]+(?:[ -][А-ЯЁа-яё]+)*$/;

// Стоимость bcrypt: 8 раундов (~40мс на 1-ядерном VPS против ~150мс у 10).
// Для системы заказа обедов этого достаточно; главное — rate limit на /api/auth.
const BCRYPT_ROUNDS = 8;

const registerSchema = z.object({
  name: z.string().regex(CYRILLIC, 'Имя должно содержать только кириллицу'),
  surname: z.string().regex(CYRILLIC, 'Фамилия должна содержать только кириллицу'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(4, 'Пароль должен быть не менее 4 символов'),
  groupId: z.coerce.number({ invalid_type_error: 'Выберите группу' }).int().positive('Выберите группу'),
});

const teacherSchema = z.object({
  name: z.string().regex(CYRILLIC, 'Имя должно содержать только кириллицу'),
  surname: z.string().regex(CYRILLIC, 'Фамилия должна содержать только кириллицу'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(4, 'Пароль должен быть не менее 4 символов'),
  position: z.string().regex(CYRILLIC, 'Должность должна содержать только кириллицу'),
});

function zodErrorMessage(err) {
  const issue = err.issues?.[0];
  return issue ? issue.message : 'Некорректные данные';
}

// POST /api/auth/register — регистрация юзера (выбирает группу, ждёт приёма менеджером)
router.post('/register', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { name, surname, email, password, groupId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group || !group.isActive) {
      return res.status(400).json({ error: 'Группа не найдена или недоступна' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        surname,
        role: 'USER',
        status: 'PENDING',
        groupId,
        balance: { create: { amount: 0 } },
      },
    });

    const token = generateToken({ id: user.id, role: user.role, status: user.status, groupId: user.groupId });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        status: user.status,
        groupId: user.groupId,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/register-teacher — регистрация преподавателя (принимает только супер-админ)
router.post('/register-teacher', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const parsed = teacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: zodErrorMessage(parsed.error) });
    }
    const { name, surname, email, password, position } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        surname,
        position,
        role: 'TEACHER',
        status: 'PENDING',
        // Без Balance и без groupId
      },
    });

    const token = generateToken({ id: user.id, role: user.role, status: user.status, groupId: null });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        status: user.status,
        groupId: null,
        position: user.position,
      },
    });
  } catch (err) {
    console.error('Register teacher error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login — единый вход для всех ролей
router.post('/login', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isDeleted) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Аккаунт отклонён' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      status: user.status,
      groupId: user.groupId,
    });

    // Баланс и группа — сразу в ответе логина, чтобы фронт не ждал
    // отдельного запроса профиля (иначе кнопка заказа мёртвая первые секунды)
    const [balanceRec, group] = await Promise.all([
      prisma.balance.findUnique({ where: { userId: user.id } }),
      user.groupId
        ? prisma.group.findUnique({
            where: { id: user.groupId },
            select: { id: true, name: true, paymentPhone: true, paymentBank: true },
          })
        : Promise.resolve(null),
    ]);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        role: user.role,
        status: user.status,
        groupId: user.groupId,
        position: user.position,
        managerIsTeacher: user.managerIsTeacher ?? false,
        balance: balanceRec ? balanceRec.amount : null,
        group,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;

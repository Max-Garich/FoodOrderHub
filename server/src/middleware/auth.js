import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware: любой валидный JWT.
// Кладёт req.user = { id, role, status, groupId }
// ВАЖНО: роль/статус/groupId берём из БД, а не из токена — иначе после
// подтверждения заявки (или смены роли) юзер со старым токеном видит
// устаревший статус («Приём заказов закрыт») до перелогина.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
    if (!payload.id) {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }

  try {
    const prisma = req.app.locals.prisma;
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { role: true, status: true, groupId: true, managerIsTeacher: true, isDeleted: true },
    });
    if (!dbUser || dbUser.isDeleted) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }
    req.user = {
      id: payload.id,
      role: dbUser.role,
      status: dbUser.status,
      groupId: dbUser.groupId ?? null,
      managerIsTeacher: dbUser.managerIsTeacher ?? false,
    };
    next();
  } catch (err) {
    console.error('requireAuth DB error:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// Middleware: требует status === 'ACTIVE' (после requireAuth)
export function requireActive(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Ожидайте подтверждения аккаунта' });
  }
  next();
}

// Фабрика middleware: requireRole('MANAGER', 'SUPER_ADMIN') (после requireAuth)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    next();
  };
}

// Generate JWT token (4h)
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '4h' });
}

export { JWT_SECRET };

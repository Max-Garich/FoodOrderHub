import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware: любой валидный JWT.
// Кладёт req.user = { id, role, status, groupId }
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.id || !payload.role) {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
    req.user = {
      id: payload.id,
      role: payload.role,
      status: payload.status,
      groupId: payload.groupId ?? null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный токен' });
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

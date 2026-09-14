import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import groupRoutes, { teachersRouter } from './routes/groups.js';
import adminUserRoutes from './routes/admin/users.js';
import adminMenuRoutes from './routes/admin/menu.js';
import adminSessionRoutes from './routes/admin/sessions.js';
import adminReportRoutes from './routes/admin/reports.js';
import adminOrderRoutes from './routes/admin/orders.js';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
const app = express();
const prisma = new PrismaClient();

// Лимиты под 1000 пользователей.
// ВАЖНО: считаются запросы С ОДНОГО IP. Студенты колледжа сидят за NAT —
// сотни людей могут выходить с одного IP, поэтому лимиты с запасом.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // окно 1 минута
  max: 3000, // 3000 запросов/мин с одного IP (NAT колледжа + пуллинг фронта)
  standardHeaders: true,
  message: { error: 'Слишком много запросов, попробуйте позже' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1500, // логины/регистрации: массовый вход на обеде не должен упираться в лимит
  standardHeaders: true,
  message: { error: 'Слишком много попыток входа, попробуйте позже' },
});

// Make prisma available to routes
app.locals.prisma = prisma;

app.use(cors());
// gzip для JSON API и статики — меньше трафика, быстрее загрузка на мобильных
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Единая точка применения общего лимита (не дублируем на роутах — иначе счётчик x2)
app.use(generalLimiter);

// Request logger for debugging (в проде отключён — каждый логин/заказ писал строку в stdout)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check (before rate limits)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authLimiter, authRoutes);

// User routes
app.use('/api/user', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

// Groups (public list + admin CRUD + manager payment)
app.use('/api', groupRoutes);

// Teachers (super admin)
app.use('/api', teachersRouter);

// Manager / admin users, requests, roles
app.use('/api', adminUserRoutes);

// Canteen menu (daily + additional + catalog)
app.use('/api/canteen/menu', adminMenuRoutes);

// Sessions (start/stop/current/list) — путь как в клиенте: /api/canteen/sessions/*
app.use('/api/canteen/sessions', adminSessionRoutes);

// Canteen reports
app.use('/api/canteen/reports', adminReportRoutes);

// Manager order editing
app.use('/api/manager/orders', adminOrderRoutes);
 
// Serve static files from the React app
// Ассеты Vite хэшированы → кэш 30 дней; index.html всегда свежий (no-cache)
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath, {
  maxAge: '30d',
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));
 
// Catch-all route for SPA
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    console.warn(`[404] API Route not found: ${req.method} ${req.path}`);
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  }
  if (req.method === 'GET') {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 FoodOrderHub server running on http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

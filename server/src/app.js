import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import adminUserRoutes from './routes/admin/users.js';
import adminMenuRoutes from './routes/admin/menu.js';
import adminSessionRoutes from './routes/admin/sessions.js';
import adminReportRoutes from './routes/admin/reports.js';
import adminOrderRoutes from './routes/admin/orders.js';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
const app = express();
const prisma = new PrismaClient();

const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { error: 'Слишком много запросов, попробуйте позже' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много попыток входа, попробуйте позже' },
});

// Make prisma available to routes
app.locals.prisma = prisma;

app.use(cors());
app.use(express.json());

app.use(generalLimiter);

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check (before rate limits)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authLimiter, authRoutes);

// User routes
app.use('/api/user', generalLimiter, userRoutes);
app.use('/api/menu', generalLimiter, menuRoutes);
app.use('/api/orders', generalLimiter, orderRoutes);

// Admin routes
app.use('/api/admin/users', generalLimiter, adminUserRoutes);
app.use('/api/admin/menu', generalLimiter, adminMenuRoutes);
app.use('/api/admin/sessions', generalLimiter, adminSessionRoutes);
app.use('/api/admin/reports', generalLimiter, adminReportRoutes);
app.use('/api/admin/orders', generalLimiter, adminOrderRoutes);
 
// Serve static files from the React app
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));
 
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

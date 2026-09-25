const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { requireAuth, createLoginLimiter } = require('./auth');
const { ValidationError } = require('./validate');
const { authRoutes } = require('./routes/auth');
const { disciplinaRoutes } = require('./routes/disciplinas');
const { tarefaRoutes } = require('./routes/tarefas');
const { metaRoutes } = require('./routes/metas');
const { turmaRoutes } = require('./routes/turmas');
const { dashboardRoutes } = require('./routes/dashboard');

function createApp({ db, secret, now = () => new Date(), logger = console, corsOrigin = '*' }) {
  const app = express();
  const ctx = { db, secret, now, limiter: createLoginLimiter() };

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'",
    });
    next();
  });
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '20kb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  const api = express.Router();
  api.use('/auth', authRoutes(ctx));
  api.use(requireAuth(secret));
  api.use('/dashboard', dashboardRoutes(ctx));
  api.use('/disciplinas', disciplinaRoutes(ctx));
  api.use('/tarefas', tarefaRoutes(ctx));
  api.use('/metas', metaRoutes(ctx));
  api.use('/turmas', turmaRoutes(ctx));
  app.use('/api', api);

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Rota ${req.method} ${req.originalUrl} não encontrada` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ValidationError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição grande demais.' });
    logger.error(err);
    res.status(500).json({ error: 'Erro interno. Tente novamente.' });
  });

  return app;
}

module.exports = { createApp };

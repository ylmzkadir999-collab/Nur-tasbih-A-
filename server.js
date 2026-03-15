require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const logger  = require('./logger');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers (helmet) ─────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // frontend served separately; this is API-only
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = new Set([
  'http://localhost',
  'http://localhost:80',
  ...Array.from({ length: 10 }, (_, i) => `http://localhost:${5173 + i}`),
  ...(process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean),
]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                               // non-browser clients
    if (allowedOrigins.has(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true); // dev: allow all
    cb(null, false); // production: block unknown origins silently
  },
  credentials: true,
}));

// ── Request parsing ───────────────────────────────────────────────────────
// İyzico callback form-urlencoded olarak gelir
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '64kb' }));  // tighter than before — we don't expect large bodies

// ── Request logging ───────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'incoming request');
  next();
});

// ── Request timeout (prevent hanging connections) ─────────────────────────
app.use((req, res, next) => {
  res.setTimeout(10_000, () => {
    logger.warn({ url: req.url }, 'Request timeout');
    res.status(503).json({ error: 'İstek zaman aşımına uğradı' });
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/tasbih',    require('./routes/tasbih'));
app.use('/api/quran',     require('./routes/quran'));
app.use('/api/subscribe', require('./routes/subscription'));
app.use('/api/payment',   require('./routes/payment'));

// GET /api/subscription-status  (alias — inline to avoid Express router re-dispatch bug)
const { authenticate } = require('./middleware/auth');
const { apiLimiter }   = require('./middleware/rateLimits');
const db = require('./database');

app.get('/api/subscription-status', authenticate, apiLimiter, (req, res) => {
  const row = db.prepare(
    'SELECT subscription_status, subscription_expiry FROM users WHERE id=?'
  ).get(req.userId);
  if (!row) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  let status = row.subscription_status;
  const now  = Math.floor(Date.now() / 1000);
  if (status === 'premium' && row.subscription_expiry && row.subscription_expiry < now) {
    db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run('free', req.userId);
    status = 'free';
  }
  res.json({
    subscription_status: status,
    is_premium:          status === 'premium',
    subscription_expiry: row.subscription_expiry,
    expires_at: row.subscription_expiry
      ? new Date(row.subscription_expiry * 1000).toISOString()
      : null,
  });
});

// ── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  // Check DB is reachable
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, service: 'Nur Tasbih API', ts: Date.now() });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
// Must have 4 params so Express recognises it as an error handler
app.use((err, req, res, _next) => {
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error');
  // Don't leak internal error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Sunucu hatası oluştu'
    : err.message;
  res.status(err.status || 500).json({ error: message });
});

// ── Production validation ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  const errs = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-change-in-production')
    errs.push('JWT_SECRET production değeri ayarlanmamış');
  if (!process.env.IYZICO_API_KEY || process.env.IYZICO_API_KEY === 'sandbox-api-key')
    errs.push('IYZICO_API_KEY ayarlanmamış');
  if (!process.env.IYZICO_SECRET_KEY || process.env.IYZICO_SECRET_KEY === 'sandbox-secret-key')
    errs.push('IYZICO_SECRET_KEY ayarlanmamış');
  if (errs.length) {
    errs.forEach(e => process.stderr.write('⚠️  ' + e + '\n'));
  }
}

// ── Start ─────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`✨ Nur Tasbih API → http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(
      `Port ${PORT} is already in use.\n` +
      `  Kill it:  npx kill-port ${PORT}\n` +
      `  Or set:   PORT=3002 in .env`
    );
  } else {
    logger.error({ err }, 'Server startup error');
  }
  process.exit(1);
});

// Graceful shutdown — ensures SQLite WAL is flushed
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    db.close();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => { db.close(); process.exit(0); });
});

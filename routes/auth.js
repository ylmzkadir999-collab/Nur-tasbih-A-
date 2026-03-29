const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../database');
const logger = require('../logger');
const { authenticate, signToken }         = require('../middleware/auth');
const { authLimiter, apiLimiter }         = require('../middleware/rateLimits');
const { validateRegister, validateLogin } = require('../middleware/validate');

const PREMIUM_THEMES = ['gold', 'emerald', 'obsidian'];
const FREE_THEMES    = ['black', 'wood'];
const ALL_THEMES     = [...FREE_THEMES, ...PREMIUM_THEMES];

const safe = u => ({
  id:                  u.id,
  email:               u.email,
  full_name:           u.full_name || null,
  subscription_status: u.subscription_status,
  subscription_expiry: u.subscription_expiry,
  total_count:         u.total_count,
  streak_days:         u.streak_days,
  theme:               u.theme || 'black',
  created_at:          u.created_at,
});

const today     = () => new Date().toISOString().split('T')[0];
const yesterday = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', authLimiter, validateRegister, (req, res) => {
  const { email, password, full_name } = req.body;

  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (exists) return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });

  const hash   = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, last_active_date, streak_days, theme) VALUES (?,?,?,?,1,?)'
  ).run(email, hash, full_name || null, today(), 'black');

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
  logger.info({ userId: user.id }, 'New user registered');
  res.status(201).json({ ok: true, token: signToken(user), user: safe(user) });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', authLimiter, validateLogin, (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const hash = user?.password_hash || '$2a$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXX';
  const match = bcrypt.compareSync(password, hash);

  if (!user || !match) {
    return res.status(401).json({ error: 'Geçersiz e-posta veya şifre' });
  }

  // Süresi dolmuş premium
  const now = Math.floor(Date.now() / 1000);
  if (user.subscription_status === 'premium' && user.subscription_expiry && user.subscription_expiry < now) {
    db.prepare("UPDATE users SET subscription_status='free', theme='black' WHERE id=?").run(user.id);
    user.subscription_status = 'free';
    user.theme = 'black';
  }

  // Streak hesapla
  let streak = user.streak_days || 0;
  if      (user.last_active_date === yesterday()) streak += 1;
  else if (user.last_active_date !== today())     streak  = 1;

  db.prepare('UPDATE users SET last_active_date=?, streak_days=? WHERE id=?')
    .run(today(), streak, user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  logger.info({ userId: user.id }, 'User logged in');
  res.json({ ok: true, token: signToken(updated), user: safe(updated) });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const now = Math.floor(Date.now() / 1000);
  if (user.subscription_status === 'premium' && user.subscription_expiry && user.subscription_expiry < now) {
    db.prepare("UPDATE users SET subscription_status='free', theme='black' WHERE id=?").run(user.id);
    user.subscription_status = 'free';
    user.theme = 'black';
  }
  res.json({ user: safe(user) });
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────
router.put('/profile', authenticate, apiLimiter, (req, res) => {
  const { full_name } = req.body || {};
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    return res.status(400).json({ error: 'Ad en az 2 karakter olmalı' });
  }
  db.prepare('UPDATE users SET full_name=? WHERE id=?').run(full_name.trim(), req.userId);
  res.json({ ok: true, full_name: full_name.trim() });
});

// ── PUT /api/auth/password ─────────────────────────────────────────────────
router.put('/password', authenticate, authLimiter, (req, res) => {
  const { current_password, new_password } = req.body || {};

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Mevcut ve yeni şifre gerekli' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Yeni şifre en az 8 karakter olmalı' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Mevcut şifre yanlış' });
  }

  const newHash = bcrypt.hashSync(new_password, 12);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(newHash, req.userId);
  logger.info({ userId: req.userId }, 'Password changed');
  res.json({ ok: true });
});

// ── PUT /api/auth/theme ────────────────────────────────────────────────────
router.put('/theme', authenticate, apiLimiter, (req, res) => {
  const { theme } = req.body || {};
  if (!ALL_THEMES.includes(theme)) {
    return res.status(400).json({ error: 'Geçersiz tema' });
  }
  if (PREMIUM_THEMES.includes(theme)) {
    const user = db.prepare('SELECT subscription_status, subscription_expiry FROM users WHERE id=?').get(req.userId);
    const now  = Math.floor(Date.now() / 1000);
    const isPremium = user?.subscription_status === 'premium' &&
                      (!user.subscription_expiry || user.subscription_expiry > now);
    if (!isPremium) {
      return res.status(403).json({ error: 'Bu tema Premium üyelik gerektirir', code: 'PREMIUM_REQUIRED' });
    }
  }
  db.prepare('UPDATE users SET theme=? WHERE id=?').run(theme, req.userId);
  res.json({ ok: true, theme });
});

// ── DELETE /api/auth/account ───────────────────────────────────────────────
// Play Store 2024 zorunluluğu: hesap silme seçeneği
router.delete('/account', authenticate, authLimiter, (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Şifre gerekli' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Şifre yanlış' });
  }

  // Cascade — tüm veriler silinir (FK ON DELETE CASCADE)
  db.prepare('DELETE FROM users WHERE id=?').run(req.userId);
  logger.info({ userId: req.userId }, 'Account deleted');
  res.json({ ok: true, message: 'Hesabınız ve tüm verileriniz silindi' });
});

module.exports = router;

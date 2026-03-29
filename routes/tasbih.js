const router = require('express').Router();
const db     = require('../database');
const logger = require('../logger');
const { authenticate }                          = require('../middleware/auth');
const { tasbihLimiter, apiLimiter }             = require('../middleware/rateLimits');
const { validateSession, validateCustomDhikr }  = require('../middleware/validate');

const today     = () => new Date().toISOString().split('T')[0];
const yesterday = () => new Date(Date.now() - 86400000).toISOString().split('T')[0];

// ── POST /api/tasbih/session ───────────────────────────────────────────────
router.post('/session', authenticate, tasbihLimiter, validateSession, (req, res) => {
  const { count, dhikr, date } = req.body;
  const day  = date || today();
  const name = dhikr || 'SubhanAllah';

  const existing = db.prepare(
    'SELECT id FROM tasbih_sessions WHERE user_id=? AND date=? AND dhikr=?'
  ).get(req.userId, day, name);

  if (existing) {
    db.prepare('UPDATE tasbih_sessions SET count=count+? WHERE id=?').run(count, existing.id);
  } else {
    db.prepare(
      'INSERT INTO tasbih_sessions (user_id, dhikr, count, date) VALUES (?,?,?,?)'
    ).run(req.userId, name, count, day);
  }

  db.prepare('UPDATE users SET total_count=total_count+?, last_active_date=? WHERE id=?')
    .run(count, day, req.userId);

  const user = db.prepare('SELECT streak_days, last_active_date FROM users WHERE id=?').get(req.userId);
  if (user.last_active_date === yesterday()) {
    db.prepare('UPDATE users SET streak_days=streak_days+1 WHERE id=?').run(req.userId);
  }

  const updated = db.prepare('SELECT total_count, streak_days FROM users WHERE id=?').get(req.userId);
  res.json({ ok: true, total_count: updated.total_count, streak_days: updated.streak_days });
});

// ── GET /api/tasbih/stats ─────────────────────────────────────────────────
router.get('/stats', authenticate, apiLimiter, (req, res) => {
  const day     = today();
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  const user      = db.prepare('SELECT total_count, streak_days FROM users WHERE id=?').get(req.userId);
  const todayRows = db.prepare(
    'SELECT dhikr, SUM(count) as total FROM tasbih_sessions WHERE user_id=? AND date=? GROUP BY dhikr'
  ).all(req.userId, day);
  const weekRows  = db.prepare(
    'SELECT date, SUM(count) as total FROM tasbih_sessions WHERE user_id=? AND date>=? GROUP BY date ORDER BY date'
  ).all(req.userId, weekAgo);

  res.json({
    total_count:    user?.total_count || 0,
    streak_days:    user?.streak_days || 0,
    today_count:    todayRows.reduce((s, r) => s + r.total, 0),
    today_by_dhikr: todayRows,
    week_history:   weekRows,
  });
});

// ── GET /api/tasbih/history ───────────────────────────────────────────────
router.get('/history', authenticate, apiLimiter, (req, res) => {
  const rows = db.prepare(
    'SELECT date, dhikr, count FROM tasbih_sessions WHERE user_id=? ORDER BY date DESC LIMIT 60'
  ).all(req.userId);
  res.json({ history: rows });
});

// ── POST /api/tasbih/dhikr ────────────────────────────────────────────────
router.post('/dhikr', authenticate, apiLimiter, validateCustomDhikr, (req, res) => {
  const { arabic, transliteration, translation, target } = req.body;

  const c = db.prepare('SELECT COUNT(*) as n FROM custom_dhikr WHERE user_id=?').get(req.userId);
  if (c.n >= 20) return res.status(400).json({ error: 'En fazla 20 özel zikir ekleyebilirsiniz' });

  const r = db.prepare(
    'INSERT INTO custom_dhikr (user_id, arabic, transliteration, translation, target) VALUES (?,?,?,?,?)'
  ).run(req.userId, arabic || null, transliteration, translation || null, target || 33);

  logger.debug({ userId: req.userId, dhikrId: r.lastInsertRowid }, 'Custom dhikr created');
  res.status(201).json({ id: r.lastInsertRowid, transliteration });
});

router.get('/dhikr', authenticate, apiLimiter, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM custom_dhikr WHERE user_id=? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ dhikr: rows });
});

router.delete('/dhikr/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Geçersiz ID' });

  const ch = db.prepare('DELETE FROM custom_dhikr WHERE id=? AND user_id=?')
    .run(id, req.userId).changes;
  if (!ch) return res.status(404).json({ error: 'Bulunamadı' });
  res.json({ ok: true });
});

module.exports = router;

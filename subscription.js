const router = require('express').Router();
const db     = require('../database');
const logger = require('../logger');
const { authenticate }  = require('../middleware/auth');
const { apiLimiter }    = require('../middleware/rateLimits');

const PLANS = {
  monthly: { days: 30,  label: 'Premium Aylık'  },
  yearly:  { days: 365, label: 'Premium Yıllık' },
};

// POST /api/subscribe
router.post('/', authenticate, apiLimiter, (req, res) => {
  const { plan } = req.body || {};
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Geçersiz plan. monthly veya yearly seçin' });
  }

  const expiry = Math.floor(Date.now() / 1000) + PLANS[plan].days * 86400;
  db.prepare('UPDATE users SET subscription_status=?, subscription_expiry=? WHERE id=?')
    .run('premium', expiry, req.userId);

  logger.info({ userId: req.userId, plan }, 'User subscribed');
  res.json({
    ok: true,
    plan,
    subscription_status: 'premium',
    subscription_expiry: expiry,
    expires_at: new Date(expiry * 1000).toISOString(),
  });
});

// GET /api/subscribe/status
router.get('/status', authenticate, apiLimiter, (req, res) => {
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
    is_premium: status === 'premium',
    subscription_expiry: row.subscription_expiry,
    expires_at: row.subscription_expiry
      ? new Date(row.subscription_expiry * 1000).toISOString()
      : null,
  });
});

// POST /api/subscribe/cancel
router.post('/cancel', authenticate, (req, res) => {
  db.prepare('UPDATE users SET subscription_status=?, subscription_expiry=NULL WHERE id=?')
    .run('free', req.userId);
  logger.info({ userId: req.userId }, 'User cancelled subscription');
  res.json({ ok: true, subscription_status: 'free' });
});

module.exports = router;

/**
 * Nur Tasbih — İyzico Ödeme Entegrasyonu
 *
 * Akış:
 *   1. POST /api/payment/init      → Ödeme formu token oluştur
 *   2. Frontend iyzico formunu embed eder (checkout form HTML)
 *   3. POST /api/payment/callback  → İyzico sonucu bildirir (redirect)
 *   4. GET  /api/payment/status    → Kullanıcı abonelik durumu
 *
 * İyzico Başvuru: https://merchant.iyzico.com
 * Bireysel başvuru kabul edilir — şirket gerekmez.
 */

const router   = require('express').Router();
const Iyzipay  = require('iyzipay');
const { v4: uuidv4 } = require('uuid');
const db       = require('../database');
const logger   = require('../logger');
const { authenticate } = require('../middleware/auth');
const { apiLimiter }   = require('../middleware/rateLimits');

// İyzico istemcisi
const iyzipay = new Iyzipay({
  apiKey:    process.env.IYZICO_API_KEY    || 'sandbox-api-key',
  secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-secret-key',
  uri:       process.env.IYZICO_URI        || 'https://sandbox-api.iyzipay.com',
  // Production: https://api.iyzipay.com
});

const PLANS = {
  monthly: { days: 30,  label: 'Nur Tasbih Premium Aylik',  price: '49.00'  },
  yearly:  { days: 365, label: 'Nur Tasbih Premium Yillik', price: '349.00' },
};

// POST /api/payment/init
// Iyzico checkout form baslat
router.post('/init', authenticate, apiLimiter, async (req, res) => {
  const { plan, buyer } = req.body || {};

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Gecersiz plan. monthly veya yearly secin.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

  const conversationId = uuidv4();
  const price          = PLANS[plan].price;

  const buyerInfo = {
    id:                  String(user.id),
    name:                buyer?.name    || (user.full_name || 'Kullanici').split(' ')[0],
    surname:             buyer?.surname || (user.full_name || 'Nur').split(' ').slice(1).join(' ') || 'Nur',
    gsmNumber:           buyer?.phone   || '+905000000000',
    email:               user.email,
    identityNumber:      buyer?.tc      || '11111111111',
    registrationAddress: buyer?.address || 'Turkiye',
    ip:                  req.ip         || '85.34.78.112',
    city:                buyer?.city    || 'Istanbul',
    country:             buyer?.country || 'Turkey',
  };

  const request = {
    locale:              Iyzipay.LOCALE.TR,
    conversationId,
    price,
    paidPrice:           price,
    currency:            Iyzipay.CURRENCY.TRY,
    basketId:            'basket_' + conversationId,
    paymentGroup:        Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
    callbackUrl:         (process.env.BACKEND_URL || 'http://localhost:3001') + '/api/payment/callback',
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer:               buyerInfo,
    shippingAddress: {
      contactName: buyerInfo.name + ' ' + buyerInfo.surname,
      city:        buyerInfo.city,
      country:     buyerInfo.country,
      address:     buyerInfo.registrationAddress,
    },
    billingAddress: {
      contactName: buyerInfo.name + ' ' + buyerInfo.surname,
      city:        buyerInfo.city,
      country:     buyerInfo.country,
      address:     buyerInfo.registrationAddress,
    },
    basketItems: [{
      id:        'plan_' + plan,
      name:      PLANS[plan].label,
      category1: 'Dijital Hizmet',
      category2: 'Premium Abonelik',
      itemType:  Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
      price,
    }],
  };

  // Intent'i DB'e kaydet
  db.prepare(`
    INSERT OR REPLACE INTO payment_intents
    (conversation_id, user_id, plan, price, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', unixepoch())
  `).run(conversationId, user.id, plan, price);

  iyzipay.checkoutFormInitialize.create(request, (err, result) => {
    if (err) {
      logger.error({ err }, 'Iyzico init error');
      return res.status(500).json({ error: 'Odeme sistemi baslatılamadi' });
    }
    if (result.status !== 'success') {
      logger.warn({ result }, 'Iyzico init failed');
      return res.status(400).json({
        error: result.errorMessage || 'Odeme baslatılamadi',
        code:  result.errorCode,
      });
    }

    logger.info({ userId: user.id, plan, conversationId }, 'Payment init OK');
    res.json({
      ok:                  true,
      checkoutFormContent: result.checkoutFormContent,
      token:               result.token,
      tokenExpireTime:     result.tokenExpireTime,
      conversationId,
    });
  });
});

// POST /api/payment/callback
// Iyzico bu endpoint'e redirect eder odeme sonrasi
router.post('/callback', (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/premium?status=error');
  }

  iyzipay.checkoutForm.retrieve({
    locale:         Iyzipay.LOCALE.TR,
    conversationId: uuidv4(),
    token,
  }, (err, result) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (err || result.status !== 'success') {
      logger.warn({ err, result }, 'Iyzico callback error');
      return res.redirect(frontendUrl + '/premium?status=failed');
    }

    const intent = db.prepare(
      'SELECT * FROM payment_intents WHERE conversation_id=?'
    ).get(result.basketId?.replace('basket_', '') || '');

    if (!intent) {
      // conversationId ile tekrar dene
      const allPending = db.prepare(
        'SELECT * FROM payment_intents WHERE user_id IS NOT NULL AND status=? ORDER BY created_at DESC LIMIT 1'
      ).get('pending');

      if (!allPending) {
        logger.warn({ token }, 'Payment intent not found');
        return res.redirect(frontendUrl + '/premium?status=error');
      }
    }

    const targetIntent = intent || db.prepare(
      'SELECT * FROM payment_intents WHERE status=? ORDER BY created_at DESC LIMIT 1'
    ).get('pending');

    if (result.paymentStatus === 'SUCCESS') {
      const expiry = Math.floor(Date.now() / 1000) + PLANS[targetIntent.plan].days * 86400;

      db.prepare('UPDATE users SET subscription_status=?, subscription_expiry=? WHERE id=?')
        .run('premium', expiry, targetIntent.user_id);
      db.prepare('UPDATE payment_intents SET status=?, iyzico_payment_id=? WHERE conversation_id=?')
        .run('completed', result.paymentId, targetIntent.conversation_id);

      logger.info({ userId: targetIntent.user_id, plan: targetIntent.plan }, 'Premium aktif edildi');
      return res.redirect(frontendUrl + '/premium?status=success&plan=' + targetIntent.plan);
    }

    db.prepare('UPDATE payment_intents SET status=? WHERE conversation_id=?')
      .run('failed', targetIntent.conversation_id);

    logger.warn({ paymentStatus: result.paymentStatus }, 'Odeme basarisiz');
    res.redirect(frontendUrl + '/premium?status=failed');
  });
});

// GET /api/payment/status
router.get('/status', authenticate, (req, res) => {
  const row = db.prepare(
    'SELECT subscription_status, subscription_expiry FROM users WHERE id=?'
  ).get(req.userId);
  if (!row) return res.status(404).json({ error: 'Kullanici bulunamadi' });

  const now    = Math.floor(Date.now() / 1000);
  const active = row.subscription_status === 'premium' &&
    (!row.subscription_expiry || row.subscription_expiry > now);

  if (row.subscription_status === 'premium' && row.subscription_expiry && row.subscription_expiry < now) {
    db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run('free', req.userId);
  }

  res.json({
    is_premium:          active,
    subscription_status: active ? 'premium' : 'free',
    expires_at: row.subscription_expiry
      ? new Date(row.subscription_expiry * 1000).toISOString()
      : null,
    plans: {
      monthly: { amount: '49.00', display: 'TL49', days: 30,  label: 'Aylik'  },
      yearly:  { amount: '349.00', display: 'TL349', days: 365, label: 'Yillik', discount: '%40 indirim' },
    },
  });
});

// GET /api/payment/plans
router.get('/plans', (req, res) => {
  res.json([
    { id: 'monthly', price: '49.00', display: 'TL49/ay',    days: 30,  installments: [1,2,3]     },
    { id: 'yearly',  price: '349.00', display: 'TL349/yil', days: 365, installments: [1,2,3,6,9], discount: '%40' },
  ]);
});

module.exports = router;

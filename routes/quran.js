/**
 * Kuran API rotaları
 * - Favori ayetler (CRUD)
 * - Hatim ilerleme (sync)
 */

const router = require('express').Router();
const db     = require('../database');
const logger = require('../logger');
const { authenticate } = require('../middleware/auth');
const { apiLimiter }   = require('../middleware/rateLimits');

// ── GET /api/quran/favorites ──────────────────────────────────────────────
router.get('/favorites', authenticate, apiLimiter, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM favorite_ayahs WHERE user_id=? ORDER BY created_at DESC'
  ).all(req.userId);
  res.json({ favorites: rows, count: rows.length });
});

// ── POST /api/quran/favorites ─────────────────────────────────────────────
router.post('/favorites', authenticate, apiLimiter, (req, res) => {
  const { sure_no, ayah_no, arabic, translation, source, sure_name, note } = req.body || {};

  if (!sure_no || !ayah_no || !arabic || !translation) {
    return res.status(400).json({ error: 'sure_no, ayah_no, arabic, translation zorunlu' });
  }
  if (sure_no < 1 || sure_no > 114 || ayah_no < 1) {
    return res.status(400).json({ error: 'Geçersiz sure/ayet numarası' });
  }

  // Maksimum favori limiti
  const count = db.prepare('SELECT COUNT(*) as n FROM favorite_ayahs WHERE user_id=?').get(req.userId);
  const limit = 50; // ücretsiz
  if (count.n >= limit) {
    return res.status(400).json({ error: `En fazla ${limit} favori ayet kaydedebilirsiniz` });
  }

  try {
    const r = db.prepare(`
      INSERT INTO favorite_ayahs (user_id, sure_no, ayah_no, arabic, translation, source, sure_name, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.userId, sure_no, ayah_no, arabic, translation, source || 'yazir', sure_name || null, note || null);

    logger.debug({ userId: req.userId, sure_no, ayah_no }, 'Favori eklendi');
    res.status(201).json({ ok: true, id: r.lastInsertRowid });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Bu ayet zaten favorilerde' });
    }
    throw e;
  }
});

// ── DELETE /api/quran/favorites/:id ──────────────────────────────────────
router.delete('/favorites/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Geçersiz ID' });

  const changes = db.prepare(
    'DELETE FROM favorite_ayahs WHERE id=? AND user_id=?'
  ).run(id, req.userId).changes;

  if (!changes) return res.status(404).json({ error: 'Favori bulunamadı' });
  res.json({ ok: true });
});

// ── DELETE /api/quran/favorites/ayah/:sure/:ayah ──────────────────────────
// sure_no + ayah_no ile direkt sil (frontend için daha kolay)
router.delete('/favorites/ayah/:sure/:ayah', authenticate, (req, res) => {
  const sure_no = parseInt(req.params.sure, 10);
  const ayah_no = parseInt(req.params.ayah, 10);

  const changes = db.prepare(
    'DELETE FROM favorite_ayahs WHERE user_id=? AND sure_no=? AND ayah_no=?'
  ).run(req.userId, sure_no, ayah_no).changes;

  if (!changes) return res.status(404).json({ error: 'Favori bulunamadı' });
  res.json({ ok: true });
});

// ── GET /api/quran/favorites/check/:sure/:ayah ────────────────────────────
// Bu ayet favoride mi?
router.get('/favorites/check/:sure/:ayah', authenticate, (req, res) => {
  const row = db.prepare(
    'SELECT id FROM favorite_ayahs WHERE user_id=? AND sure_no=? AND ayah_no=?'
  ).get(req.userId, parseInt(req.params.sure), parseInt(req.params.ayah));
  res.json({ is_favorite: !!row, id: row?.id || null });
});

// ── GET /api/quran/hatim ──────────────────────────────────────────────────
router.get('/hatim', authenticate, (req, res) => {
  const row = db.prepare(
    'SELECT * FROM hatim_progress WHERE user_id=?'
  ).get(req.userId);

  res.json(row || { user_id: req.userId, sure_no: 1, ayah_no: 1, completed: 0 });
});

// ── PUT /api/quran/hatim ──────────────────────────────────────────────────
router.put('/hatim', authenticate, apiLimiter, (req, res) => {
  const { sure_no, ayah_no, completed } = req.body || {};

  if (!sure_no || !ayah_no) {
    return res.status(400).json({ error: 'sure_no ve ayah_no zorunlu' });
  }

  db.prepare(`
    INSERT INTO hatim_progress (user_id, sure_no, ayah_no, completed, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(user_id) DO UPDATE SET
      sure_no    = excluded.sure_no,
      ayah_no    = excluded.ayah_no,
      completed  = excluded.completed,
      updated_at = unixepoch()
  `).run(req.userId, sure_no, ayah_no, completed || 0);

  res.json({ ok: true });
});

module.exports = router;

// ── Dream Cache (in-memory, SQLite fallback) ─────────────────
// "yılan görmek" → 1000 kullanıcı sorar → 1 API çağrısı
const Anthropic = require('@anthropic-ai/sdk');
const crypto    = require('crypto');

const dreamCache = new Map(); // key → { text, ts }
const DREAM_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 gün
const MAX_DREAM_CACHE = 200; // max 200 entry

function dreamCacheKey(dream) {
  // Normalize: küçük harf, noktalama temizle, 50 karakter al
  const normalized = dream.toLowerCase().trim()
    .replace(/[^a-züğışöçâîû\s]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 50);
  return crypto.createHash('md5').update(normalized).digest('hex');
}

function dreamCacheGet(key) {
  const entry = dreamCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > DREAM_CACHE_TTL) { dreamCache.delete(key); return null; }
  return entry.text;
}

function dreamCacheSet(key, text) {
  // LRU: boyut aşılınca en eskiyi sil
  if (dreamCache.size >= MAX_DREAM_CACHE) {
    const oldest = [...dreamCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) dreamCache.delete(oldest[0]);
  }
  dreamCache.set(key, { text, ts: Date.now() });
}

// ── POST /api/quran/dream ─────────────────────────────────────
router.post('/dream', authenticate, apiLimiter, async (req, res) => {
  const { dream, detail } = req.body || {};
  if (!dream) return res.status(400).json({ error: 'dream required' });

  const user = db.prepare('SELECT subscription_status, subscription_expiry FROM users WHERE id=?').get(req.userId);
  const now  = Math.floor(Date.now() / 1000);
  const isPremium = user?.subscription_status === 'premium' &&
    (!user.subscription_expiry || user.subscription_expiry > now);

  if (!isPremium) return res.status(403).json({ error: 'Premium üyelik gereklidir' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI servisi yapılandırılmamış' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // ── Cache kontrolü ────────────────────────────────────────────
  // Özel rüyalar (detail varsa) cache'leme — kişiseldir
  // Genel anahtar kelimeler (detail yoksa) cache'le
  const cacheKey = !detail ? dreamCacheKey(dream) : null;

  if (cacheKey) {
    const cached = dreamCacheGet(cacheKey);
    if (cached) {
      logger.debug({ dream: dream.slice(0, 30) }, 'Dream cache hit');
      // Cache'den geleni streaming gibi gönder
      res.write(`data: ${JSON.stringify({ text: cached, cached: true })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
  }

  // ── API çağrısı ───────────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey });
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      stream: true,
      system: `Sen İslami rüya tabiri uzmanısın. İbn Sirin, Nablusi ve klasik İslam alimlerinin görüşlerine dayanarak yorum yaparsın.

KURALLAR:
- Kesin hüküm verme, "olabilir", "işaret edebilir" ifadelerini kullan
- Rüyanın kişinin psikolojik durumuna göre değişebileceğini belirt
- Kur'an ve hadis referansları ver (varsa)
- Pozitif yorumu öne çıkar ama gerçekçi ol
- Max 150 kelime, sade Türkçe`,
      messages: [{ role: 'user', content: `Rüya: ${dream}${detail ? '\nEk bilgi: ' + detail : ''}` }],
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

    // Cache'e yaz (genel rüyalar için)
    if (cacheKey && fullText.length > 20) {
      dreamCacheSet(cacheKey, fullText);
      logger.debug({ dream: dream.slice(0, 30), chars: fullText.length }, 'Dream cached');
    }
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`); res.end(); }
  }
});

const rateLimit = require('express-rate-limit');

// ── Helpers ───────────────────────────────────────────────────────────────
const json429 = (req, res) =>
  res.status(429).json({
    error: 'Çok fazla istek. Lütfen biraz bekleyin.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000),
  });

// ── Auth endpoints (login / register) ────────────────────────────────────
// Tight window to prevent brute-force & account enumeration
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 min
  max:              20,              // 20 attempts per IP per 15 min
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          json429,
  skip: () => process.env.NODE_ENV === 'test',
});

// ── Tasbih write endpoint ─────────────────────────────────────────────────
// Each tap batch can fire up to once per second for active users
const tasbihLimiter = rateLimit({
  windowMs:         60 * 1000,       // 1 min
  max:              120,             // 120 syncs/min is generous for batch tapping
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          json429,
  skip: () => process.env.NODE_ENV === 'test',
});

// ── General API limiter ───────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              500,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          json429,
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, tasbihLimiter, apiLimiter };

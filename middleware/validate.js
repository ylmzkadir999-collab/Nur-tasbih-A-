// Input sanitization & validation helpers
// Keeps route handlers clean — all validation in one place

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DHIKR_MAX = 100;  // max length for custom dhikr names
const ARABIC_MAX = 200;

function validateRegister(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || typeof email !== 'string')
    return res.status(400).json({ error: 'E-posta zorunludur' });
  if (!EMAIL_RE.test(email.trim()))
    return res.status(400).json({ error: 'Geçersiz e-posta formatı' });
  if (!password || typeof password !== 'string')
    return res.status(400).json({ error: 'Şifre zorunludur' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Şifre çok uzun' });
  // Normalise in-place so routes don't have to
  req.body.email = email.toLowerCase().trim();
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'E-posta ve şifre zorunludur' });
  req.body.email = (email || '').toLowerCase().trim();
  next();
}

function validateSession(req, res, next) {
  const { count, dhikr } = req.body || {};
  // count must be a positive integer ≤ 10 000 (prevents runaway sync bugs)
  if (!Number.isInteger(count) || count < 1 || count > 10_000)
    return res.status(400).json({ error: 'count 1–10000 arası tam sayı olmalıdır' });
  // dhikr name: strip HTML, limit length
  if (dhikr !== undefined) {
    if (typeof dhikr !== 'string' || dhikr.trim().length === 0)
      return res.status(400).json({ error: 'Geçersiz dhikr adı' });
    req.body.dhikr = dhikr.replace(/<[^>]*>/g, '').trim().slice(0, DHIKR_MAX);
  }
  next();
}

function validateCustomDhikr(req, res, next) {
  const { transliteration, arabic, translation, target } = req.body || {};
  if (!transliteration || typeof transliteration !== 'string' || transliteration.trim().length === 0)
    return res.status(400).json({ error: 'transliteration zorunludur' });
  if (transliteration.trim().length > DHIKR_MAX)
    return res.status(400).json({ error: `transliteration max ${DHIKR_MAX} karakter` });
  if (arabic   && arabic.length   > ARABIC_MAX) return res.status(400).json({ error: 'arabic çok uzun' });
  if (translation && translation.length > 300)  return res.status(400).json({ error: 'translation çok uzun' });
  if (target !== undefined && (!Number.isInteger(target) || target < 1 || target > 10_000))
    return res.status(400).json({ error: 'target 1–10000 arası tam sayı olmalıdır' });
  // Sanitise
  req.body.transliteration = transliteration.replace(/<[^>]*>/g, '').trim();
  if (req.body.arabic)      req.body.arabic      = arabic.replace(/<[^>]*>/g, '').trim();
  if (req.body.translation) req.body.translation = translation.replace(/<[^>]*>/g, '').trim();
  next();
}

module.exports = { validateRegister, validateLogin, validateSession, validateCustomDhikr };

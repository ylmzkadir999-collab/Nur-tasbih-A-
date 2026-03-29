const jwt    = require('jsonwebtoken');
const logger = require('../logger');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId    = payload.sub;
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'JWT verification failed');
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

module.exports = { signToken, authenticate };

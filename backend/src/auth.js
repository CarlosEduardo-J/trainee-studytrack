const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(expected, actual);
}

const b64url = (value) => Buffer.from(value).toString('base64url');

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

// Minimal HS256 JWT so the API does not depend on an external auth library.
function signToken(payload, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: nowSeconds, exp: nowSeconds + TOKEN_TTL_SECONDS }));
  return `${header}.${body}.${sign(`${header}.${body}`, secret)}`;
}

function verifyToken(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${body}`, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof payload.exp !== 'number' || payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(secret) {
  return (req, res, next) => {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = verifyToken(token, secret);
    if (!payload) return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
    req.userId = payload.sub;
    next();
  };
}

// Blocks an email/IP pair after repeated wrong passwords for a short window.
function createLoginLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const failures = new Map();
  const keyOf = (ip, email) => `${ip}|${String(email).toLowerCase()}`;
  return {
    isBlocked(ip, email) {
      const entry = failures.get(keyOf(ip, email));
      if (!entry) return false;
      if (Date.now() - entry.first > windowMs) {
        failures.delete(keyOf(ip, email));
        return false;
      }
      return entry.count >= maxAttempts;
    },
    fail(ip, email) {
      const key = keyOf(ip, email);
      const entry = failures.get(key);
      if (!entry || Date.now() - entry.first > windowMs) failures.set(key, { count: 1, first: Date.now() });
      else entry.count += 1;
    },
    reset(ip, email) {
      failures.delete(keyOf(ip, email));
    },
  };
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, requireAuth, createLoginLimiter };

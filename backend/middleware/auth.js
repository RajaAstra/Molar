'use strict';

const { jwtVerify, SignJWT } = require('jose');

// JWT secret is loaded from environment; we keep a cached TextEncoder result.
let _secret = null;

function getSecret() {
  if (_secret) return _secret;
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error('JWT_SECRET env var must be at least 32 characters');
  }
  _secret = new TextEncoder().encode(raw);
  return _secret;
}

/**
 * Sign a JWT for the given user.
 * Payload includes id, email, role.
 * Expires in 24 h.
 */
async function signToken(user) {
  return new SignJWT({ sub: String(user.id), email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

/**
 * Express middleware: verify Bearer JWT, attach req.user = { id, email, role }.
 * Returns 401 if missing/invalid, 403 if expired.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, getSecret());
    req.user = { id: Number(payload.sub), email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      return res.status(403).json({ error: 'Session expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Middleware factory: restrict to specific role(s).
 * Must be used AFTER requireAuth.
 *
 * Usage: requireRole('dentist')   or   requireRole(['dentist','admin'])
 */
function requireRole(role) {
  const allowed = Array.isArray(role) ? role : [role];
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };

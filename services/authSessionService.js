const crypto = require('crypto');

const TOKEN_NAME = 'gp_auth';
const TOKEN_TTL_SEC = Math.max(3600, Number(process.env.ACCESS_AUTH_SESSION_TTL_SEC || 30 * 24 * 60 * 60));

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64url(input) {
  const normalized = String(input).replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64').toString('utf8');
}

function secret() {
  return process.env.ACCESS_AUTH_SESSION_SECRET || 'gp-auth-dev-secret-change-me';
}

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('hex');
}

function parseCookies(req) {
  const raw = String(req?.headers?.cookie || '');
  const out = {};
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function readAuthTokenFromRequest(req) {
  const cookies = parseCookies(req);
  const fromCookie = cookies[TOKEN_NAME] || '';
  if (fromCookie) return fromCookie;
  const authHeader = String(req.headers?.authorization || '').trim();
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return String(req.headers?.['x-gp-auth'] || '').trim();
}

function issueAuthToken(payload = {}) {
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC
  };
  const encoded = base64url(JSON.stringify(body));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

function verifyAuthToken(token) {
  const [encoded, sig] = String(token || '').split('.');
  if (!encoded || !sig) return { valid: false, reason: 'malformed' };
  const expected = sign(encoded);
  if (sig !== expected) return { valid: false, reason: 'bad_signature' };
  let data;
  try {
    data = JSON.parse(fromBase64url(encoded));
  } catch {
    return { valid: false, reason: 'bad_payload' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(data.exp) || data.exp < now) return { valid: false, reason: 'expired' };
  return { valid: true, payload: data };
}

function useCrossSiteCookies() {
  const explicit = String(process.env.PAYWALL_COOKIE_CROSS_SITE || '').toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  return String(process.env.RENDER || '').toLowerCase() === 'true';
}

function buildAuthCookie(token) {
  const base = `${TOKEN_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Max-Age=${TOKEN_TTL_SEC}`;
  if (useCrossSiteCookies()) return `${base}; SameSite=None; Secure`;
  return `${base}; SameSite=Lax`;
}

function clearAuthCookie() {
  const base = `${TOKEN_NAME}=; Path=/; HttpOnly; Max-Age=0`;
  if (useCrossSiteCookies()) return `${base}; SameSite=None; Secure`;
  return `${base}; SameSite=Lax`;
}

module.exports = {
  TOKEN_NAME,
  issueAuthToken,
  verifyAuthToken,
  readAuthTokenFromRequest,
  buildAuthCookie,
  clearAuthCookie
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'auth-users.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ records: {} }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    if (!parsed.records || typeof parsed.records !== 'object') {
      return { records: {} };
    }
    return parsed;
  } catch {
    return { records: {} };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeAccessId(value) {
  return String(value || '').trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function deriveHash(password, saltHex) {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function hashPassword(password) {
  const raw = String(password || '');
  if (raw.length < 8) {
    const error = new Error('Password must be at least 8 characters.');
    error.code = 'WEAK_PASSWORD';
    throw error;
  }
  const saltHex = crypto.randomBytes(16).toString('hex');
  const hashHex = deriveHash(raw, saltHex);
  return `${saltHex}:${hashHex}`;
}

function verifyPassword(password, encoded) {
  const [saltHex, hashHex] = String(encoded || '').split(':');
  if (!saltHex || !hashHex) return false;
  const calc = deriveHash(password, saltHex);
  try {
    return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(hashHex, 'hex'));
  } catch {
    return false;
  }
}

function sanitizeUserRecord(raw, accessId) {
  return {
    accessId,
    active: raw?.active !== false,
    createdAt: raw?.createdAt || null,
    updatedAt: raw?.updatedAt || null,
    role: String(raw?.role || 'user') === 'admin' ? 'admin' : 'user',
    displayName: String(raw?.displayName || '').trim() || null,
    lastLoginAt: raw?.lastLoginAt || null,
    assignedProfileHash: String(raw?.assignedProfileHash || '').trim() || null,
    assignedChart: raw?.assignedChart && typeof raw.assignedChart === 'object' ? raw.assignedChart : null,
    insightsLimit: Number.isFinite(Number(raw?.insightsLimit)) ? Number(raw.insightsLimit) : 55,
    insightsUsed: Number.isFinite(Number(raw?.insightsUsed)) ? Number(raw.insightsUsed) : 0
  };
}

function createOrUpdateUser({ accessId, password, displayName, assignedProfileHash, role, insightsLimit }) {
  const id = normalizeAccessId(accessId);
  if (!id) {
    const error = new Error('accessId is required.');
    error.code = 'INVALID_ACCESS_ID';
    throw error;
  }
  const store = readStore();
  const prev = store.records[id] || {};
  const ts = nowIso();
  const next = {
    accessId: id,
    passwordHash: hashPassword(password),
    active: true,
    role: String(role || prev.role || 'user') === 'admin' ? 'admin' : 'user',
    displayName: String(displayName || prev.displayName || '').trim() || null,
    assignedProfileHash: String(assignedProfileHash || prev.assignedProfileHash || '').trim() || null,
    assignedChart: prev.assignedChart && typeof prev.assignedChart === 'object' ? prev.assignedChart : null,
    insightsLimit: Number.isFinite(Number(insightsLimit))
      ? Math.max(1, Math.trunc(Number(insightsLimit)))
      : Number.isFinite(Number(prev.insightsLimit))
        ? Math.max(1, Math.trunc(Number(prev.insightsLimit)))
        : 55,
    insightsUsed: Number.isFinite(Number(prev.insightsUsed)) ? Math.max(0, Math.trunc(Number(prev.insightsUsed))) : 0,
    createdAt: prev.createdAt || ts,
    updatedAt: ts,
    lastLoginAt: prev.lastLoginAt || null
  };
  store.records[id] = next;
  writeStore(store);
  return sanitizeUserRecord(next, id);
}

function setUserActive(accessId, active) {
  const id = normalizeAccessId(accessId);
  if (!id) return null;
  const store = readStore();
  const row = store.records[id];
  if (!row) return null;
  row.active = Boolean(active);
  row.updatedAt = nowIso();
  store.records[id] = row;
  writeStore(store);
  return sanitizeUserRecord(row, id);
}

function listUsers() {
  const store = readStore();
  return Object.entries(store.records)
    .map(([accessId, row]) => sanitizeUserRecord(row, accessId))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function verifyCredentials(accessId, password) {
  const id = normalizeAccessId(accessId);
  if (!id) return { ok: false, reason: 'missing_access_id' };
  const store = readStore();
  const row = store.records[id];
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.active === false) return { ok: false, reason: 'inactive' };
  if (!verifyPassword(password, row.passwordHash)) return { ok: false, reason: 'bad_password' };
  row.lastLoginAt = nowIso();
  row.updatedAt = nowIso();
  store.records[id] = row;
  writeStore(store);
  return { ok: true, user: sanitizeUserRecord(row, id) };
}

function getUserByAccessId(accessId) {
  const id = normalizeAccessId(accessId);
  if (!id) return null;
  const store = readStore();
  const row = store.records[id];
  if (!row) return null;
  return sanitizeUserRecord(row, id);
}

function assignChartToUser(accessId, chartPayload) {
  const id = normalizeAccessId(accessId);
  if (!id || !chartPayload || typeof chartPayload !== 'object') return null;
  const store = readStore();
  const row = store.records[id];
  if (!row) return null;
  row.assignedChart = chartPayload;
  row.assignedProfileHash = String(chartPayload.profileHash || row.assignedProfileHash || '').trim() || null;
  row.updatedAt = nowIso();
  store.records[id] = row;
  writeStore(store);
  return sanitizeUserRecord(row, id);
}

function consumeInsight(accessId) {
  const id = normalizeAccessId(accessId);
  if (!id) return { allowed: false, reason: 'invalid_access_id', remainingInsights: 0 };
  const store = readStore();
  const row = store.records[id];
  if (!row) return { allowed: false, reason: 'not_found', remainingInsights: 0 };
  const limit = Number.isFinite(Number(row.insightsLimit)) ? Math.max(1, Math.trunc(Number(row.insightsLimit))) : 55;
  const used = Number.isFinite(Number(row.insightsUsed)) ? Math.max(0, Math.trunc(Number(row.insightsUsed))) : 0;
  if (used >= limit) {
    return { allowed: false, reason: 'insights_exhausted', remainingInsights: 0, insightsUsed: used, insightsLimit: limit };
  }
  const nextUsed = used + 1;
  row.insightsLimit = limit;
  row.insightsUsed = nextUsed;
  row.updatedAt = nowIso();
  store.records[id] = row;
  writeStore(store);
  const remaining = Math.max(0, limit - nextUsed);
  return {
    allowed: true,
    remainingInsights: remaining,
    insightsUsed: nextUsed,
    insightsLimit: limit,
    phase: nextUsed <= 5 ? 'test' : 'full'
  };
}

module.exports = {
  normalizeAccessId,
  createOrUpdateUser,
  setUserActive,
  listUsers,
  verifyCredentials,
  getUserByAccessId,
  assignChartToUser,
  consumeInsight
};

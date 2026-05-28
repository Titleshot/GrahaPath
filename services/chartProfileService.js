const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { stampChartIdentity } = require('./chartIdentityService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'chart-profiles.json');

function ensureStoreFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify({ records: {} }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return parsed.records && typeof parsed.records === 'object' ? parsed : { records: {} };
  } catch {
    return { records: {} };
  }
}

function writeStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return `cp_${crypto.randomBytes(8).toString('hex')}`;
}

function randomToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function sanitizeRecord(row) {
  return {
    id: row.id,
    clientName: row.clientName || null,
    accessToken: row.accessToken,
    createdBy: row.createdBy || null,
    createdAt: row.createdAt || null,
    revoked: row.revoked === true,
    expiresAt: row.expiresAt || null,
    insightsUsed: Number.isFinite(Number(row.insightsUsed)) ? Number(row.insightsUsed) : 0,
    insightsLimit: Number.isFinite(Number(row.insightsLimit)) ? Number(row.insightsLimit) : 55,
    chart: row.chart && typeof row.chart === 'object' ? row.chart : null
  };
}

function createChartProfile({ clientName, chart, createdBy, expiresAt = null, insightsLimit = 55 }) {
  if (!chart || typeof chart !== 'object') {
    const error = new Error('chart is required.');
    error.code = 'INVALID_CHART';
    throw error;
  }
  const store = readStore();
  const id = randomId();
  const accessToken = randomToken();
  const record = {
    id,
    clientName: String(clientName || '').trim() || null,
    chart: stampChartIdentity(chart),
    accessToken,
    createdBy: String(createdBy || '').trim() || null,
    createdAt: nowIso(),
    revoked: false,
    expiresAt: expiresAt || null,
    insightsUsed: 0,
    insightsLimit: Math.max(1, Math.trunc(Number(insightsLimit) || 55))
  };
  store.records[id] = record;
  writeStore(store);
  return sanitizeRecord(record);
}

function getProfileByToken(accessToken) {
  const token = String(accessToken || '').trim();
  if (!token) return null;
  const store = readStore();
  const record = Object.values(store.records).find((row) => String(row?.accessToken || '') === token);
  return record ? sanitizeRecord(record) : null;
}

function getProfileById(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  const store = readStore();
  const row = store.records[key];
  return row ? sanitizeRecord(row) : null;
}

function recordLegalAcceptance(profileId, meta = {}) {
  const id = String(profileId || '').trim();
  if (!id) return false;
  const store = readStore();
  const row = store.records[id];
  if (!row) return false;
  const entry = {
    at: nowIso(),
    termsVersion: String(meta.termsVersion || '').trim() || null,
    privacyVersion: String(meta.privacyVersion || '').trim() || null,
    disclaimerVersion: String(meta.disclaimerVersion || '').trim() || null,
    userAgent: String(meta.userAgent || '').slice(0, 280) || null
  };
  const list = Array.isArray(row.legalAcceptances) ? row.legalAcceptances : [];
  list.push(entry);
  row.legalAcceptances = list.slice(-20);
  store.records[id] = row;
  writeStore(store);
  return true;
}

function consumeProfileInsight(profileId) {
  const id = String(profileId || '').trim();
  if (!id) return { allowed: false, reason: 'invalid_profile' };
  const store = readStore();
  const row = store.records[id];
  if (!row) return { allowed: false, reason: 'not_found' };
  const limit = Math.max(1, Math.trunc(Number(row.insightsLimit) || 55));
  const used = Math.max(0, Math.trunc(Number(row.insightsUsed) || 0));
  if (row.revoked === true) return { allowed: false, reason: 'revoked' };
  if (row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()) {
    return { allowed: false, reason: 'expired' };
  }
  if (used >= limit) return { allowed: false, reason: 'exhausted', remainingInsights: 0 };
  row.insightsUsed = used + 1;
  store.records[id] = row;
  writeStore(store);
  return {
    allowed: true,
    insightsUsed: row.insightsUsed,
    insightsLimit: limit,
    remainingInsights: Math.max(0, limit - row.insightsUsed),
    phase: row.insightsUsed <= 5 ? 'test' : 'full'
  };
}

module.exports = {
  createChartProfile,
  getProfileByToken,
  getProfileById,
  recordLegalAcceptance,
  consumeProfileInsight
};

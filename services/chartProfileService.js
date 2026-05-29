const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { stampChartIdentity } = require('./chartIdentityService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'chart-profiles.json');
const MAGIC_EMAIL_DOMAIN = 'view.grahapath.app';
const MAGIC_PURCHASE_STATUS = 'magic_link';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket }
  });
}

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

function magicEmail(profileId) {
  return `magic+${String(profileId || '').trim()}@${MAGIC_EMAIL_DOMAIN}`;
}

function profileIdFromMagicEmail(email) {
  const match = String(email || '').match(/^magic\+(.+)@view\.grahapath\.app$/i);
  return match ? match[1] : null;
}

function readGpMeta(chart) {
  const meta = chart?._gpMeta;
  return meta && typeof meta === 'object' ? meta : {};
}

function normalizeAccessToken(raw) {
  let token = String(raw || '').trim();
  if (!token) return '';
  try {
    if (token.includes('%')) token = decodeURIComponent(token);
  } catch {
    // keep original token
  }
  return token;
}

function isProductionRuntime() {
  return String(process.env.RENDER || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
}

function profileFromAccessTableRow(row) {
  if (!row?.chart_data) return null;
  const chart = row.chart_data;
  const meta = readGpMeta(chart);
  return sanitizeRecord({
    id: row.id,
    clientName: row.client_name || meta.clientName || null,
    accessToken: row.access_token,
    createdBy: row.created_by || meta.createdBy || null,
    createdAt: row.created_at || null,
    revoked: row.revoked === true,
    expiresAt: row.expires_at || meta.expiresAt || null,
    insightsUsed: Number.isFinite(Number(row.insights_used))
      ? Number(row.insights_used)
      : Number(meta.insightsUsed) || 0,
    insightsLimit: Number.isFinite(Number(row.insights_limit))
      ? Number(row.insights_limit)
      : Number(meta.insightsLimit) || 55,
    chart,
    legalAcceptances: Array.isArray(row.legal_acceptances)
      ? row.legal_acceptances
      : Array.isArray(meta.legalAcceptances)
        ? meta.legalAcceptances
        : [],
    supabaseUserId: null
  });
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
    chart: row.chart && typeof row.chart === 'object' ? row.chart : null,
    legalAcceptances: Array.isArray(row.legalAcceptances) ? row.legalAcceptances : [],
    supabaseUserId: row.supabaseUserId || null
  };
}

function profileFromSupabaseRows(user, chartRow) {
  if (!user || !chartRow?.chart_data) return null;
  const profileId = profileIdFromMagicEmail(user.email);
  if (!profileId) return null;
  const chart = chartRow.chart_data;
  const meta = readGpMeta(chart);
  const limit = Math.max(1, Math.trunc(Number(meta.insightsLimit) || Number(user.remaining_insights) || 55));
  const remaining = Math.max(0, Math.trunc(Number(user.remaining_insights) || 0));
  const used = Number.isFinite(Number(meta.insightsUsed))
    ? Math.max(0, Math.trunc(Number(meta.insightsUsed)))
    : Math.max(0, limit - remaining);

  return sanitizeRecord({
    id: profileId,
    clientName: meta.clientName || null,
    accessToken: user.chart_id,
    createdBy: meta.createdBy || null,
    createdAt: user.created_at || user.purchase_timestamp || null,
    revoked: meta.revoked === true || user.premium_active === false,
    expiresAt: meta.expiresAt || null,
    insightsUsed: used,
    insightsLimit: limit,
    chart,
    legalAcceptances: Array.isArray(meta.legalAcceptances) ? meta.legalAcceptances : [],
    supabaseUserId: user.id
  });
}

async function getLatestChartRowForUser(userId) {
  const { data, error } = await supabase
    .from('charts')
    .select('id, chart_data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[chartProfileService] chart lookup failed:', error.message);
    return null;
  }
  return data;
}

async function getProfileFromAccessTable(accessToken) {
  if (!supabase) return null;
  const token = normalizeAccessToken(accessToken);
  if (!token) return null;
  const { data, error } = await supabase
    .from('chart_access_profiles')
    .select('*')
    .eq('access_token', token)
    .maybeSingle();
  if (error) {
    if (!String(error.message || '').includes('does not exist')) {
      console.warn('[chartProfileService] chart_access_profiles lookup failed:', error.message);
    }
    return null;
  }
  return profileFromAccessTableRow(data);
}

async function getProfileByIdFromAccessTable(profileId) {
  if (!supabase) return null;
  const id = String(profileId || '').trim();
  if (!id) return null;
  const { data, error } = await supabase.from('chart_access_profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return profileFromAccessTableRow(data);
}

async function createProfileInAccessTable(record) {
  if (!supabase) return false;
  const { error } = await supabase.from('chart_access_profiles').upsert(
    {
      id: record.id,
      access_token: record.accessToken,
      client_name: record.clientName || null,
      chart_data: {
        ...record.chart,
        _gpMeta: {
          insightsLimit: record.insightsLimit,
          insightsUsed: 0,
          clientName: record.clientName || null,
          createdBy: record.createdBy || null,
          revoked: false,
          expiresAt: record.expiresAt || null,
          legalAcceptances: []
        }
      },
      created_by: record.createdBy || null,
      created_at: record.createdAt || nowIso(),
      revoked: false,
      expires_at: record.expiresAt || null,
      insights_used: 0,
      insights_limit: record.insightsLimit,
      legal_acceptances: []
    },
    { onConflict: 'access_token' }
  );
  if (error) {
    console.warn('[chartProfileService] chart_access_profiles upsert failed:', error.message);
    return false;
  }
  return true;
}

async function patchAccessTable(profileId, patch = {}) {
  if (!supabase) return false;
  const id = String(profileId || '').trim();
  if (!id) return false;
  const { error } = await supabase.from('chart_access_profiles').update(patch).eq('id', id);
  if (error) {
    console.warn('[chartProfileService] chart_access_profiles update failed:', error.message);
    return false;
  }
  return true;
}

async function getProfileByTokenFromSupabase(accessToken) {
  if (!supabase) return null;
  const token = normalizeAccessToken(accessToken);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, chart_id, remaining_insights, premium_active, purchase_status, purchase_timestamp, created_at')
    .eq('chart_id', token)
    .eq('purchase_status', MAGIC_PURCHASE_STATUS)
    .maybeSingle();
  if (error) {
    console.warn('[chartProfileService] Supabase token lookup failed:', error.message);
    return null;
  }
  if (!user) return null;
  const chartRow = await getLatestChartRowForUser(user.id);
  return profileFromSupabaseRows(user, chartRow);
}

async function getProfileByIdFromSupabase(profileId) {
  if (!supabase) return null;
  const email = magicEmail(profileId);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, chart_id, remaining_insights, premium_active, purchase_status, purchase_timestamp, created_at')
    .eq('email', email)
    .eq('purchase_status', MAGIC_PURCHASE_STATUS)
    .maybeSingle();
  if (error) {
    console.warn('[chartProfileService] Supabase profile lookup failed:', error.message);
    return null;
  }
  if (!user) return null;
  const chartRow = await getLatestChartRowForUser(user.id);
  return profileFromSupabaseRows(user, chartRow);
}

async function createChartProfileInSupabase(record) {
  if (!supabase) return false;
  const email = magicEmail(record.id);
  const limit = Math.max(1, Math.trunc(Number(record.insightsLimit) || 55));
  const chartPayload = {
    ...record.chart,
    _gpMeta: {
      insightsLimit: limit,
      insightsUsed: 0,
      clientName: record.clientName || null,
      createdBy: record.createdBy || null,
      revoked: false,
      expiresAt: record.expiresAt || null,
      legalAcceptances: []
    }
  };

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email,
      chart_id: record.accessToken,
      plan: 'full',
      remaining_insights: limit,
      premium_active: true,
      purchase_status: MAGIC_PURCHASE_STATUS,
      purchase_timestamp: record.createdAt || nowIso()
    })
    .select('id')
    .single();

  if (userError) {
    console.warn('[chartProfileService] Supabase user insert failed:', userError.message);
    return false;
  }

  const { error: chartError } = await supabase.from('charts').insert({
    user_id: user.id,
    birth_date: record.chart?.birthDate || record.chart?.dateOfBirth || null,
    birth_time: record.chart?.birthTime || record.chart?.timeOfBirth || null,
    birth_place: record.chart?.place || record.chart?.location?.displayName || null,
    chart_data: chartPayload
  });

  if (chartError) {
    console.warn('[chartProfileService] Supabase chart insert failed:', chartError.message);
    return false;
  }
  return true;
}

function getProfileByTokenFromFile(accessToken) {
  const store = readStore();
  const record = Object.values(store.records).find((row) => String(row?.accessToken || '') === accessToken);
  return record ? sanitizeRecord(record) : null;
}

function getProfileByIdFromFile(id) {
  const store = readStore();
  const row = store.records[id];
  return row ? sanitizeRecord(row) : null;
}

async function createChartProfile({ clientName, chart, createdBy, expiresAt = null, insightsLimit = 55 }) {
  if (!chart || typeof chart !== 'object') {
    const error = new Error('chart is required.');
    error.code = 'INVALID_CHART';
    throw error;
  }
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
    insightsLimit: Math.max(1, Math.trunc(Number(insightsLimit) || 55)),
    legalAcceptances: []
  };

  if (supabase) {
    const tableOk = await createProfileInAccessTable(record);
    const legacyOk = await createChartProfileInSupabase(record);
    if (!tableOk && !legacyOk) {
      const err = new Error(
        'Could not save this chart link to the database. Run scripts/supabase-chart-access-profiles.sql in Supabase, then try again.'
      );
      err.statusCode = 503;
      throw err;
    }
    const verified = await getProfileByToken(accessToken);
    if (!verified) {
      const err = new Error('Chart link was created but could not be verified. Please generate a new link.');
      err.statusCode = 503;
      throw err;
    }
    return verified;
  }

  const store = readStore();
  store.records[id] = record;
  writeStore(store);
  return sanitizeRecord(record);
}

async function getProfileByToken(accessToken) {
  const token = normalizeAccessToken(accessToken);
  if (!token) return null;

  if (supabase) {
    const fromTable = await getProfileFromAccessTable(token);
    if (fromTable) return fromTable;
    const fromLegacy = await getProfileByTokenFromSupabase(token);
    if (fromLegacy) return fromLegacy;
    if (isProductionRuntime()) return null;
  }

  return getProfileByTokenFromFile(token);
}

async function getProfileById(id) {
  const key = String(id || '').trim();
  if (!key) return null;

  if (supabase) {
    const fromTable = await getProfileByIdFromAccessTable(key);
    if (fromTable) return fromTable;
    const fromLegacy = await getProfileByIdFromSupabase(key);
    if (fromLegacy) return fromLegacy;
    if (isProductionRuntime()) return null;
  }

  return getProfileByIdFromFile(key);
}

async function updateSupabaseMeta(profile, patch = {}) {
  if (!supabase || !profile?.supabaseUserId) return false;
  const chartRow = await getLatestChartRowForUser(profile.supabaseUserId);
  if (!chartRow?.id || !chartRow?.chart_data) return false;
  const nextChart = {
    ...chartRow.chart_data,
    _gpMeta: {
      ...readGpMeta(chartRow.chart_data),
      ...patch
    }
  };
  const { error } = await supabase.from('charts').update({ chart_data: nextChart }).eq('id', chartRow.id);
  if (error) {
    console.warn('[chartProfileService] Supabase meta update failed:', error.message);
    return false;
  }
  return true;
}

async function recordLegalAcceptance(profileId, meta = {}) {
  const id = String(profileId || '').trim();
  if (!id) return false;
  const entry = {
    at: nowIso(),
    termsVersion: String(meta.termsVersion || '').trim() || null,
    privacyVersion: String(meta.privacyVersion || '').trim() || null,
    disclaimerVersion: String(meta.disclaimerVersion || '').trim() || null,
    userAgent: String(meta.userAgent || '').slice(0, 280) || null
  };

  const profile = await getProfileById(id);
  if (!profile) return false;

  const list = Array.isArray(profile.legalAcceptances) ? profile.legalAcceptances : [];
  list.push(entry);
  const legalAcceptances = list.slice(-20);

  if (!isProductionRuntime()) {
    const store = readStore();
    const row = store.records[id] || { ...profile };
    row.legalAcceptances = legalAcceptances;
    store.records[id] = row;
    writeStore(store);
  }

  await patchAccessTable(id, { legal_acceptances: legalAcceptances });
  await updateSupabaseMeta(profile, { legalAcceptances });
  return true;
}

async function consumeProfileInsight(profileId) {
  const id = String(profileId || '').trim();
  if (!id) return { allowed: false, reason: 'invalid_profile' };

  const profile = await getProfileById(id);
  if (!profile) return { allowed: false, reason: 'not_found' };

  const limit = Math.max(1, Math.trunc(Number(profile.insightsLimit) || 55));
  const used = Math.max(0, Math.trunc(Number(profile.insightsUsed) || 0));
  if (profile.revoked === true) return { allowed: false, reason: 'revoked' };
  if (profile.expiresAt && new Date(profile.expiresAt).getTime() < Date.now()) {
    return { allowed: false, reason: 'expired' };
  }
  if (used >= limit) return { allowed: false, reason: 'exhausted', remainingInsights: 0 };

  const nextUsed = used + 1;
  const remaining = Math.max(0, limit - nextUsed);

  if (!isProductionRuntime()) {
    const store = readStore();
    const row = store.records[id] || { ...profile };
    row.insightsUsed = nextUsed;
    store.records[id] = row;
    writeStore(store);
  }

  await patchAccessTable(id, { insights_used: nextUsed, insights_limit: limit });

  if (supabase && profile.supabaseUserId) {
    const { error } = await supabase
      .from('users')
      .update({ remaining_insights: remaining })
      .eq('id', profile.supabaseUserId);
    if (error) console.warn('[chartProfileService] insight consume update failed:', error.message);
    await updateSupabaseMeta(profile, { insightsUsed: nextUsed, insightsLimit: limit });
  }

  return {
    allowed: true,
    insightsUsed: nextUsed,
    insightsLimit: limit,
    remainingInsights: remaining,
    phase: nextUsed <= 5 ? 'test' : 'full'
  };
}

module.exports = {
  createChartProfile,
  getProfileByToken,
  getProfileById,
  recordLegalAcceptance,
  consumeProfileInsight
};

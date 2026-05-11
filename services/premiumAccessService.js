const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'premium-access.json');
const CHARTS_FILE = path.join(DATA_DIR, 'charts.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const DEFAULT_INSIGHTS_BY_PLAN = {
  quick: 12,
  full: 50,
  basic: 12,
  premium: 50
};
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
  if (!fs.existsSync(CHARTS_FILE)) {
    fs.writeFileSync(CHARTS_FILE, JSON.stringify({ records: [] }, null, 2), 'utf8');
  }
  if (!fs.existsSync(PAYMENTS_FILE)) {
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify({ records: [] }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    if (!parsed.records || typeof parsed.records !== 'object') {
      return { records: {} };
    }
    return parsed;
  } catch (_error) {
    return { records: {} };
  }
}

function writeStore(store) {
  ensureStoreFile();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function readArrayStore(filePath) {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch (_error) {
    return [];
  }
}

function writeArrayStore(filePath, records) {
  ensureStoreFile();
  fs.writeFileSync(filePath, JSON.stringify({ records }, null, 2), 'utf8');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizePlan(plan) {
  const cleaned = String(plan || '').trim().toLowerCase();
  return cleaned || 'full';
}

function sanitizeChartId(chartId) {
  return String(chartId || '').trim().slice(0, 120) || null;
}

function toIsoNow() {
  return new Date().toISOString();
}

function mapUserRecord(previous, { email, chartId, chartFingerprint, normalizedPlan, resolvedInsights }) {
  const createdAt = toIsoNow();
  return {
    email,
    chartId: sanitizeChartId(chartId),
    chartFingerprint: chartFingerprint || null,
    plan: normalizedPlan,
    remainingInsights: resolvedInsights,
    premiumActive: true,
    purchaseStatus: 'paid',
    purchaseTimestamp: createdAt,
    createdAt: previous?.createdAt || createdAt,
    updatedAt: createdAt
  };
}

async function upsertPremiumAccess({ email, chartId, chartFingerprint, plan, remainingInsights }) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('A valid email is required.');
    error.code = 'INVALID_EMAIL';
    throw error;
  }

  const normalizedPlan = sanitizePlan(plan);
  const resolvedInsights = Number.isFinite(remainingInsights)
    ? Math.max(0, Math.trunc(remainingInsights))
    : (DEFAULT_INSIGHTS_BY_PLAN[normalizedPlan] || 20);

  if (supabase) {
    const existing = await getUserByEmail(normalizedEmail);
    const record = mapUserRecord(existing, {
      email: normalizedEmail,
      chartId,
      chartFingerprint,
      normalizedPlan,
      resolvedInsights
    });
    const payload = {
      email: record.email,
      plan: record.plan,
      remaining_insights: record.remainingInsights,
      premium_active: record.premiumActive,
      chart_id: record.chartId,
      chart_fingerprint: record.chartFingerprint,
      purchase_status: record.purchaseStatus,
      purchase_timestamp: record.purchaseTimestamp,
      created_at: record.createdAt
    };
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'email' });
    if (!error) return record;
  }

  const store = readStore();
  const previous = store.records[normalizedEmail] || {};
  const record = mapUserRecord(previous, {
    email: normalizedEmail,
    chartId,
    chartFingerprint,
    normalizedPlan,
    resolvedInsights
  });
  store.records[normalizedEmail] = record;
  writeStore(store);
  return record;
}

async function getUserByEmail(email) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    plan: data.plan,
    remainingInsights: Number(data.remaining_insights || 0),
    premiumActive: data.premium_active === true,
    chartId: data.chart_id || null,
    chartFingerprint: data.chart_fingerprint || null,
    purchaseStatus: data.purchase_status || null,
    purchaseTimestamp: data.purchase_timestamp || null,
    createdAt: data.created_at || null
  };
}

async function findPremiumByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return null;

  if (supabase) {
    const record = await getUserByEmail(normalizedEmail);
    if (record?.premiumActive) return record;
  }

  const store = readStore();
  const record = store.records[normalizedEmail];
  if (!record || record.premiumActive !== true) return null;
  return record;
}

async function consumePremiumInsight(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return { allowed: false, remainingInsights: 0, plan: null };
  }

  const current = await findPremiumByEmail(normalizedEmail);
  if (!current) {
    return { allowed: false, remainingInsights: 0, plan: null };
  }

  const currentRemaining = Number(
    current.remainingInsights ?? current.remaining_insights ?? 0
  );
  if (!Number.isFinite(currentRemaining) || currentRemaining <= 0) {
    return {
      allowed: false,
      remainingInsights: 0,
      plan: current.plan || 'full'
    };
  }

  const nextRemaining = Math.max(0, Math.trunc(currentRemaining - 1));
  const plan = current.plan || 'full';

  if (supabase) {
    const { error } = await supabase
      .from('users')
      .update({ remaining_insights: nextRemaining })
      .eq('email', normalizedEmail);
    if (!error) {
      return { allowed: true, remainingInsights: nextRemaining, plan };
    }
  }

  const store = readStore();
  const record = store.records[normalizedEmail];
  if (!record || record.premiumActive !== true) {
    return { allowed: false, remainingInsights: 0, plan: null };
  }
  record.remainingInsights = nextRemaining;
  record.updatedAt = toIsoNow();
  store.records[normalizedEmail] = record;
  writeStore(store);
  return { allowed: true, remainingInsights: nextRemaining, plan };
}

function normalizeChartPayload(raw = {}) {
  return {
    birthDate: raw.dateMetadata?.birthDateAD || raw.birthDate || null,
    birthTime: raw.localDateTime || raw.birthTime || null,
    birthPlace: raw.place || raw.birthPlace || null,
    chartData: raw,
    dashaData: raw?.dasha || raw?.vimshottariDasha || null
  };
}

async function saveChartForEmail({ email, chart }) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail) || !chart || typeof chart !== 'object') return null;
  const normalizedChart = normalizeChartPayload(chart);
  const now = toIsoNow();

  if (supabase) {
    const user = await getUserByEmail(normalizedEmail);
    if (user?.id) {
      const { data, error } = await supabase
        .from('charts')
        .insert({
          user_id: user.id,
          birth_date: normalizedChart.birthDate,
          birth_time: normalizedChart.birthTime,
          birth_place: normalizedChart.birthPlace,
          chart_data: normalizedChart.chartData,
          dasha_data: normalizedChart.dashaData
        })
        .select('*')
        .single();
      if (!error) {
        return {
          id: data.id,
          userId: data.user_id,
          birthDate: data.birth_date,
          birthTime: data.birth_time,
          birthPlace: data.birth_place,
          createdAt: data.created_at
        };
      }
    }
  }

  const records = readArrayStore(CHARTS_FILE);
  const record = {
    id: `${normalizedEmail}:${Date.now()}`,
    email: normalizedEmail,
    ...normalizedChart,
    createdAt: now
  };
  records.push(record);
  writeArrayStore(CHARTS_FILE, records);
  return record;
}

async function findLatestChartByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return null;

  if (supabase) {
    const user = await getUserByEmail(normalizedEmail);
    if (user?.id) {
      const { data, error } = await supabase
        .from('charts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data?.chart_data && typeof data.chart_data === 'object') {
        return data.chart_data;
      }
    }
  }

  const records = readArrayStore(CHARTS_FILE);
  const matches = records
    .filter((record) => record?.email === normalizedEmail && record?.chartData && typeof record.chartData === 'object')
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return matches[0]?.chartData || null;
}

async function recordPaymentForEmail({ email, orderId, amount, plan, status = 'paid' }) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return null;
  const normalizedPlan = sanitizePlan(plan);
  const safeAmount = Number.isFinite(amount) ? Number(amount) : null;
  const now = toIsoNow();

  if (supabase) {
    const user = await getUserByEmail(normalizedEmail);
    if (user?.id) {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          gumroad_order_id: orderId || null,
          amount: safeAmount,
          plan: normalizedPlan,
          status
        })
        .select('*')
        .single();
      if (!error) {
        return {
          id: data.id,
          userId: data.user_id,
          orderId: data.gumroad_order_id,
          amount: data.amount,
          plan: data.plan,
          status: data.status,
          createdAt: data.created_at
        };
      }
    }
  }

  const records = readArrayStore(PAYMENTS_FILE);
  const record = {
    id: `${normalizedEmail}:${Date.now()}`,
    email: normalizedEmail,
    orderId: orderId || null,
    amount: safeAmount,
    plan: normalizedPlan,
    status,
    createdAt: now
  };
  records.push(record);
  writeArrayStore(PAYMENTS_FILE, records);
  return record;
}

module.exports = {
  supabaseEnabled: Boolean(supabase),
  upsertPremiumAccess,
  findPremiumByEmail,
  consumePremiumInsight,
  findLatestChartByEmail,
  saveChartForEmail,
  recordPaymentForEmail
};

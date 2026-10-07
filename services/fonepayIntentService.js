const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'fonepay-intents.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Node 20 has no native WebSocket; without this the client constructor throws at load
    // and takes the whole premium router down (same fix as premiumAccessService).
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

function toIsoNow() {
  return new Date().toISOString();
}

/** Records which email a referenceLabel belongs to, before the QR is ever shown,
 * so a later status check can't be replayed with a different email. */
async function createFonepayIntent({ referenceLabel, email, plan, amount }) {
  const record = {
    referenceLabel,
    email: String(email).trim().toLowerCase(),
    plan,
    amount,
    redeemedAt: null,
    createdAt: toIsoNow()
  };

  if (supabase) {
    const { error } = await supabase.from('fonepay_intents').insert({
      reference_label: record.referenceLabel,
      email: record.email,
      plan: record.plan,
      amount: record.amount
    });
    if (!error) return record;
  }

  const store = readStore();
  store.records[referenceLabel] = record;
  writeStore(store);
  return record;
}

async function getFonepayIntent(referenceLabel) {
  if (supabase) {
    const { data, error } = await supabase
      .from('fonepay_intents')
      .select('*')
      .eq('reference_label', referenceLabel)
      .maybeSingle();
    if (!error && data) {
      return {
        referenceLabel: data.reference_label,
        email: data.email,
        plan: data.plan,
        amount: Number(data.amount),
        redeemedAt: data.redeemed_at,
        createdAt: data.created_at
      };
    }
  }

  const store = readStore();
  return store.records[referenceLabel] || null;
}

async function markFonepayIntentRedeemed(referenceLabel) {
  if (supabase) {
    const { error } = await supabase
      .from('fonepay_intents')
      .update({ redeemed_at: toIsoNow() })
      .eq('reference_label', referenceLabel);
    if (!error) return;
  }

  const store = readStore();
  if (store.records[referenceLabel]) {
    store.records[referenceLabel].redeemedAt = toIsoNow();
    writeStore(store);
  }
}

module.exports = {
  createFonepayIntent,
  getFonepayIntent,
  markFonepayIntentRedeemed
};

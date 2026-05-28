const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'access-requests.json');
const APPROVED_FILE = path.join(DATA_DIR, 'approved-users.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket }
  });
}

function ensureFiles() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify({ records: [] }, null, 2), 'utf8');
  }
  if (!fs.existsSync(APPROVED_FILE)) {
    fs.writeFileSync(APPROVED_FILE, JSON.stringify({ records: {} }, null, 2), 'utf8');
  }
}

function readArrayFile(filePath) {
  ensureFiles();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return Array.isArray(parsed.records) ? parsed.records : [];
  } catch {
    return [];
  }
}

function writeArrayFile(filePath, records) {
  ensureFiles();
  fs.writeFileSync(filePath, JSON.stringify({ records }, null, 2), 'utf8');
}

function readMapFile(filePath) {
  ensureFiles();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    return parsed.records && typeof parsed.records === 'object' ? parsed.records : {};
  } catch {
    return {};
  }
}

function writeMapFile(filePath, records) {
  ensureFiles();
  fs.writeFileSync(filePath, JSON.stringify({ records }, null, 2), 'utf8');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProfile(input = {}) {
  return {
    email: normalizeEmail(input.email),
    name: String(input.name || '').trim().slice(0, 120),
    phone: String(input.phone || '').trim().slice(0, 40),
    note: String(input.note || '').trim().slice(0, 800)
  };
}

async function submitAccessRequest(input = {}) {
  const profile = normalizeProfile(input);
  if (!isValidEmail(profile.email)) {
    const error = new Error('A valid email is required.');
    error.code = 'INVALID_EMAIL';
    throw error;
  }

  if (supabase) {
    const { error } = await supabase.from('access_requests').upsert(
      {
        email: profile.email,
        name: profile.name || null,
        phone: profile.phone || null,
        note: profile.note || null,
        status: 'pending',
        requested_at: nowIso(),
        updated_at: nowIso()
      },
      { onConflict: 'email' }
    );
    if (!error) return { ...profile, status: 'pending' };
  }

  const rows = readArrayFile(REQUESTS_FILE);
  const idx = rows.findIndex((x) => x?.email === profile.email);
  const record = {
    ...profile,
    status: 'pending',
    requestedAt: nowIso(),
    updatedAt: nowIso()
  };
  if (idx >= 0) rows[idx] = record;
  else rows.push(record);
  writeArrayFile(REQUESTS_FILE, rows);
  return record;
}

async function listPendingAccessRequests(limit = 100) {
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  if (supabase) {
    const { data, error } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
      .limit(safeLimit);
    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        email: row.email,
        name: row.name || '',
        phone: row.phone || '',
        note: row.note || '',
        status: row.status || 'pending',
        requestedAt: row.requested_at || null
      }));
    }
  }

  return readArrayFile(REQUESTS_FILE)
    .filter((row) => row?.status === 'pending')
    .sort((a, b) => String(b?.requestedAt || '').localeCompare(String(a?.requestedAt || '')))
    .slice(0, safeLimit);
}

async function approveAccessEmail(email, approvedBy = 'admin') {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    const error = new Error('A valid email is required.');
    error.code = 'INVALID_EMAIL';
    throw error;
  }
  const approvedAt = nowIso();
  const by = String(approvedBy || 'admin').trim().slice(0, 120) || 'admin';

  if (supabase) {
    const allowError = await supabase.from('access_allowlist').upsert(
      {
        email: normalizedEmail,
        approved: true,
        approved_at: approvedAt,
        approved_by: by
      },
      { onConflict: 'email' }
    );
    if (!allowError.error) {
      await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: approvedAt,
          reviewed_by: by,
          updated_at: approvedAt
        })
        .eq('email', normalizedEmail);
      return { email: normalizedEmail, approved: true, approvedAt, approvedBy: by };
    }
  }

  const approved = readMapFile(APPROVED_FILE);
  approved[normalizedEmail] = {
    approved: true,
    approvedAt,
    approvedBy: by
  };
  writeMapFile(APPROVED_FILE, approved);

  const rows = readArrayFile(REQUESTS_FILE);
  const idx = rows.findIndex((x) => x?.email === normalizedEmail);
  if (idx >= 0) {
    rows[idx] = {
      ...rows[idx],
      status: 'approved',
      reviewedAt: approvedAt,
      reviewedBy: by,
      updatedAt: approvedAt
    };
    writeArrayFile(REQUESTS_FILE, rows);
  }
  return { email: normalizedEmail, approved: true, approvedAt, approvedBy: by };
}

async function isEmailApproved(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) return false;

  if (supabase) {
    const { data, error } = await supabase
      .from('access_allowlist')
      .select('approved')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (!error && data) return data.approved === true;
  }

  const records = readMapFile(APPROVED_FILE);
  return records[normalizedEmail]?.approved === true;
}

module.exports = {
  submitAccessRequest,
  listPendingAccessRequests,
  approveAccessEmail,
  isEmailApproved
};

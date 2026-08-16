const crypto = require('crypto');
const store = require('./securityStore');
const { incCounter } = require('./securityMetricsService');

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ROUND_MINUTES = Math.max(1, Number(process.env.KUNDALI_TIME_ROUND_MINUTES || 5));
const DAILY_NEW_PROFILES_PER_IP = Math.max(1, Number(process.env.DAILY_NEW_PROFILES_PER_IP || 3));
const FREE_CHAT_LIMIT = Math.max(1, Number(process.env.FREE_CHAT_LIMIT || 3));
const CHAT_BURST_LIMIT_PER_MIN = Math.max(1, Number(process.env.CHAT_BURST_LIMIT_PER_MIN || 20));
const CHALLENGE_SCORE_THRESHOLD = Math.max(1, Number(process.env.SECURITY_CHALLENGE_SCORE_THRESHOLD || 4));

function nowMs() {
  return Date.now();
}

function floorToDay(ts) {
  return Math.floor(ts / DAY_MS) * DAY_MS;
}

function parseTimeMinutes(timeText) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(timeText || '').trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function formatMinutesToTime(totalMinutes) {
  const clamped = Math.min(23 * 60 + 59, Math.max(0, totalMinutes));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function roundTimeToStep(timeText, stepMinutes = TIME_ROUND_MINUTES) {
  const total = parseTimeMinutes(timeText);
  if (total == null) return '';
  const rounded = Math.round(total / stepMinutes) * stepMinutes;
  return formatMinutesToTime(rounded);
}

function normalizeText(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Repopulate `{ year, month, day }` for identity hashing when POST body omits bsDate but chart was generated as BS (frontend only sends `chart`). */
function inferBsDateObjectFromChart(chart) {
  if (!chart || typeof chart !== 'object') return null;
  const dt = normalizeText(chart.inputDateType || '').toUpperCase();
  const raw =
    (typeof chart.originalBsDate === 'string' && chart.originalBsDate.trim()) ||
    (typeof chart.birthDateBS === 'string' && chart.birthDateBS.trim()) ||
    '';
  const matched = raw ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw) : null;
  if (!matched) return null;
  if (dt && dt !== 'BS') return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function normalizeKundaliInput(input = {}) {
  const dateType = normalizeText(input.dateType || 'ad').toUpperCase();
  const adDate = normalizeText(input.date || input.birthDateAD || '');
  const bsDate = input.bsDate || {};
  const place = normalizeText(input.place || '');
  const latitude = Number(input.location?.latitude);
  const longitude = Number(input.location?.longitude);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const time = roundTimeToStep(input.time || '', TIME_ROUND_MINUTES);

  return {
    dateType: dateType || 'AD',
    date: adDate,
    bsDate:
      dateType === 'BS'
        ? {
            year: Number(bsDate.year) || null,
            month: Number(bsDate.month) || null,
            day: Number(bsDate.day) || null
          }
        : null,
    time,
    place,
    location: hasCoords
      ? {
          latitude: Number(latitude.toFixed(3)),
          longitude: Number(longitude.toFixed(3))
        }
      : null
  };
}

function stableHash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function buildIdentityHash(kundaliInput, clientFingerprint) {
  const normalized = normalizeKundaliInput(kundaliInput);
  const fp = normalizeText(clientFingerprint || 'unknown-fp');
  const profileHash = stableHash(normalized);
  const identityHash = stableHash({ profileHash, fp });
  return { normalized, profileHash, identityHash };
}

function extractClientFingerprint(req) {
  const explicit = req.headers['x-gp-client-fp'];
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim().slice(0, 256);
  const ua = String(req.headers['user-agent'] || '');
  const lang = String(req.headers['accept-language'] || '');
  return `${ua}|${lang}`.slice(0, 256);
}

function logSecurityEvent(type, meta = {}) {
  incCounter(`security.${type}`);
  console.log(`[Security] ${type}`, JSON.stringify(meta));
}

function assessAbuseRisk({ sessionValid, fingerprintPresent, burstCount }) {
  let score = 0;
  const reasons = [];
  if (!sessionValid) {
    score += 3;
    reasons.push('missing_or_invalid_session');
  }
  if (!fingerprintPresent) {
    score += 1;
    reasons.push('missing_client_fingerprint');
  }
  if (Number.isFinite(burstCount) && burstCount > Math.floor(CHAT_BURST_LIMIT_PER_MIN * 0.7)) {
    score += 2;
    reasons.push('high_burst_velocity');
  }
  const requireChallenge = score >= CHALLENGE_SCORE_THRESHOLD;
  return { score, reasons, requireChallenge };
}

async function checkAndRecordNewProfile() {
  return { allowed: true, isNew: true, used: 0, limit: DAILY_NEW_PROFILES_PER_IP };
}

async function checkAndUseFreeMessage(identityHash) {
  const key = `anti:free:chat:${identityHash}`;
  const used = await store.incrWithTtl(key, 30 * 24 * 60 * 60);
  if (used > FREE_CHAT_LIMIT) {
    logSecurityEvent('free_chat_limit_block', { identityHash: identityHash.slice(0, 12), used, limit: FREE_CHAT_LIMIT });
    return { allowed: false, used: used - 1, limit: FREE_CHAT_LIMIT };
  }
  return { allowed: true, used, limit: FREE_CHAT_LIMIT };
}

function toIpBucket(ip) {
  const raw = String(ip || 'unknown').trim();
  if (!raw || raw === 'unknown') return 'unknown';
  if (raw.includes(':')) {
    // IPv6 or IPv4-mapped IPv6: keep a coarse /64-ish prefix for privacy + stability.
    const parts = raw.split(':').filter(Boolean);
    return `v6:${parts.slice(0, 4).join(':')}`;
  }
  const parts = raw.split('.');
  if (parts.length === 4) {
    return `v4:${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return raw;
}

async function checkAndUseFreeMessageBound({ profileHash }) {
  // Keyed on profileHash alone: same birth details = same counter regardless of
  // browser, device, IP, or cookies. Prevents the "switch browser" bypass.
  const safeProfile = String(profileHash || '').trim() || 'unknown-profile';
  return checkAndUseFreeMessage(safeProfile);
}

async function checkBurstLimit(ip) {
  const minuteBucket = Math.floor(nowMs() / 60000);
  const key = `anti:burst:${ip || 'unknown'}:${minuteBucket}`;
  const count = await store.incrWithTtl(key, 120);
  if (count > CHAT_BURST_LIMIT_PER_MIN) {
    logSecurityEvent('burst_limit_block', { ip: ip || 'unknown', count, limit: CHAT_BURST_LIMIT_PER_MIN });
    return { allowed: false, count, limit: CHAT_BURST_LIMIT_PER_MIN };
  }
  return { allowed: true, count, limit: CHAT_BURST_LIMIT_PER_MIN };
}

async function clearIdentityUsage(identityHash) {
  const key = `anti:free:chat:${identityHash}`;
  await store.delKey(key);
}

async function clearIpDailyProfiles(ip, unixTsMs = Date.now()) {
  const dayStart = floorToDay(unixTsMs);
  const key = `anti:profiles:${ip || 'unknown'}:${dayStart}`;
  await store.delKey(key);
}

module.exports = {
  normalizeKundaliInput,
  inferBsDateObjectFromChart,
  buildIdentityHash,
  extractClientFingerprint,
  checkAndRecordNewProfile,
  checkAndUseFreeMessage,
  checkAndUseFreeMessageBound,
  checkBurstLimit,
  assessAbuseRisk,
  clearIdentityUsage,
  clearIpDailyProfiles
};


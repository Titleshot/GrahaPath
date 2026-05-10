const crypto = require('crypto');

function getKofiConfig() {
  return {
    verificationToken: String(process.env.KOFI_VERIFICATION_TOKEN || '').trim(),
    checkoutUrlQuick: String(process.env.KOFI_CHECKOUT_URL_QUICK || '').trim(),
    checkoutUrlFull: String(process.env.KOFI_CHECKOUT_URL_FULL || '').trim(),
    shopLinkCodeQuick: String(process.env.KOFI_SHOP_LINK_CODE_QUICK || '').trim(),
    shopLinkCodeFull: String(process.env.KOFI_SHOP_LINK_CODE_FULL || '').trim(),
    membershipTierQuick: String(process.env.KOFI_MEMBERSHIP_TIER_QUICK || '').trim().toLowerCase(),
    membershipTierFull: String(process.env.KOFI_MEMBERSHIP_TIER_FULL || '').trim().toLowerCase(),
    /** Donation fallback only when USD; amount >= min → full, else quick. */
    donationFullMinUsd: Math.max(
      0,
      Number.parseFloat(String(process.env.KOFI_DONATION_FULL_MIN_USD || '').trim())
    ),
    checkoutProviderPreference: String(process.env.PAYMENT_CHECKOUT_PROVIDER || 'auto').trim().toLowerCase()
  };
}

function normalizeHttpUrl(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function timingSafeToken(received, expected) {
  const a = Buffer.from(String(received || ''), 'utf8');
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function kofiCheckoutUrlForPlan(plan) {
  const cfg = getKofiConfig();
  const p = String(plan || 'full').toLowerCase() === 'quick' ? 'quick' : 'full';
  const raw = p === 'quick' ? cfg.checkoutUrlQuick : cfg.checkoutUrlFull;
  return normalizeHttpUrl(raw);
}

/** Both tiers must have HTTPS checkout links for GrahaPath to offer Ko‑fi checkout. */
function isKofiCheckoutFullyConfigured() {
  return Boolean(kofiCheckoutUrlForPlan('quick') && kofiCheckoutUrlForPlan('full'));
}

/**
 * Decide checkout: kofi | gumroad | none
 * PAYMENT_CHECKOUT_PROVIDER=auto | kofi | gumroad (default auto)
 */
function resolveCheckoutBackend({ gumroadCheckoutReady }) {
  const pref = getKofiConfig().checkoutProviderPreference;
  const kofiOk = isKofiCheckoutFullyConfigured();

  if (pref === 'kofi') {
    return kofiOk ? 'kofi' : 'none';
  }
  if (pref === 'gumroad') {
    return gumroadCheckoutReady ? 'gumroad' : 'none';
  }
  if (kofiOk) return 'kofi';
  if (gumroadCheckoutReady) return 'gumroad';
  return 'none';
}

/**
 * Parses Ko‑fi webhook: application/x-www-form-urlencoded field `data` (JSON string or rare object).
 */
function parseKofiFormBody(body) {
  if (!body || typeof body !== 'object') return null;
  const raw = body.data;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

function verifyKofiPayload(payload, verificationTokenSecret) {
  if (!verificationTokenSecret) return false;
  if (!payload || typeof payload !== 'object') return false;
  return timingSafeToken(payload.verification_token, verificationTokenSecret);
}

function normalizeTierName(t) {
  return String(t || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Map Ko‑fi event → quick | full. Configure shop link codes OR membership tiers OR donation USD threshold. */
function resolvePlanFromKofiPayload(payload, cfg = getKofiConfig()) {
  const type = String(payload.type || '').trim();
  const currency = String(payload.currency || '').trim().toUpperCase();

  if (type === 'Shop Order' && Array.isArray(payload.shop_items)) {
    const codes = payload.shop_items
      .map((item) => String(item?.direct_link_code || '').trim())
      .filter(Boolean);
    if (codes.length > 0) {
      const q = cfg.shopLinkCodeQuick.trim();
      const f = cfg.shopLinkCodeFull.trim();
      if (q && codes.includes(q)) return 'quick';
      if (f && codes.includes(f)) return 'full';
    }
    return 'full';
  }

  if (type === 'Subscription') {
    const tierNorm = normalizeTierName(payload.tier_name);
    if (tierNorm) {
      if (cfg.membershipTierQuick && tierNorm.includes(cfg.membershipTierQuick)) return 'quick';
      if (cfg.membershipTierFull && tierNorm.includes(cfg.membershipTierFull)) return 'full';
      if (/quick|starter|coffee/.test(tierNorm)) return 'quick';
      if (/full|decode|lifetime|annual|premium/.test(tierNorm)) return 'full';
    }
    return 'full';
  }

  if (type === 'Commission') {
    return 'full';
  }

  if (type === 'Donation') {
    const amt = Number.parseFloat(String(payload.amount ?? '').replace(/,/g, ''));
    if (currency === 'USD' && Number.isFinite(cfg.donationFullMinUsd) && cfg.donationFullMinUsd > 0) {
      if (Number.isFinite(amt) && amt >= cfg.donationFullMinUsd) return 'full';
      return 'quick';
    }
    return 'quick';
  }

  return 'full';
}

function summarizeKofiWebhookReadiness() {
  const cfg = getKofiConfig();
  const blockingIssues = [];
  if (!cfg.verificationToken) {
    blockingIssues.push('KOFI_VERIFICATION_TOKEN is empty — webhooks will reject');
  }
  if (!isKofiCheckoutFullyConfigured()) {
    blockingIssues.push('KOFI_CHECKOUT_URL_QUICK and/or KOFI_CHECKOUT_URL_FULL invalid or missing');
  }
  const hasShopMap = !!(cfg.shopLinkCodeQuick || cfg.shopLinkCodeFull);
  const hasTierMap = !!(cfg.membershipTierQuick || cfg.membershipTierFull);
  const recommendations = [];
  if (!hasShopMap && !hasTierMap && !Number.isFinite(cfg.donationFullMinUsd)) {
    recommendations.push(
      'Set KOFI_SHOP_LINK_CODE_* from test webhook payloads, or KOFI_MEMBERSHIP_TIER_* for subscriptions, so quick vs full is correct.'
    );
  }
  return {
    checkoutReady: isKofiCheckoutFullyConfigured(),
    webhookReady: Boolean(cfg.verificationToken),
    productionOk:
      Boolean(cfg.verificationToken) && kofiCheckoutUrlForPlan('quick') && kofiCheckoutUrlForPlan('full'),
    blockingIssues,
    recommendations,
    issues: [...blockingIssues, ...recommendations]
  };
}

module.exports = {
  getKofiConfig,
  kofiCheckoutUrlForPlan,
  isKofiCheckoutFullyConfigured,
  resolveCheckoutBackend,
  parseKofiFormBody,
  verifyKofiPayload,
  resolvePlanFromKofiPayload,
  summarizeKofiWebhookReadiness
};

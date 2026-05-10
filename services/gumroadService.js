const crypto = require('crypto');

function getGumroadConfig() {
  return {
    productUrlQuick: String(process.env.GUMROAD_PRODUCT_URL_QUICK || '').trim(),
    productUrlFull: String(process.env.GUMROAD_PRODUCT_URL_FULL || '').trim(),
    webhookSecret: String(process.env.GUMROAD_WEBHOOK_SECRET || '').trim(),
    productPermalinkQuick: String(process.env.GUMROAD_PRODUCT_PERMALINK_QUICK || '').trim(),
    productPermalinkFull: String(process.env.GUMROAD_PRODUCT_PERMALINK_FULL || '').trim(),
    productIdQuick: String(process.env.GUMROAD_PRODUCT_ID_QUICK || '').trim(),
    productIdFull: String(process.env.GUMROAD_PRODUCT_ID_FULL || '').trim()
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

function createGumroadCheckoutUrl({ email, plan }) {
  const cfg = getGumroadConfig();
  const normalizedPlan = String(plan || 'full').toLowerCase() === 'quick' ? 'quick' : 'full';
  const base = normalizeHttpUrl(normalizedPlan === 'quick' ? cfg.productUrlQuick : cfg.productUrlFull);
  if (!base) {
    const err = new Error('Gumroad is not configured. Missing product URL env vars.');
    err.code = 'GUMROAD_NOT_CONFIGURED';
    throw err;
  }

  const url = new URL(base);
  url.searchParams.set('wanted', 'true');
  if (email) {
    url.searchParams.set('email', String(email).trim().toLowerCase());
  }
  url.searchParams.set('recommended_by', 'grahapath');
  return url.toString();
}

function verifyGumroadSignature(rawBodyBuffer, signature) {
  const cfg = getGumroadConfig();
  if (!cfg.webhookSecret || !signature) return false;
  const digest = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBodyBuffer).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** For ops / `npm run check:gumroad` — never log secrets. */
function summarizeGumroadReadiness() {
  const cfg = getGumroadConfig();
  const blockingIssues = [];
  const recommendations = [];
  const quickOk = Boolean(normalizeHttpUrl(cfg.productUrlQuick));
  const fullOk = Boolean(normalizeHttpUrl(cfg.productUrlFull));
  if (!quickOk) {
    blockingIssues.push('GUMROAD_PRODUCT_URL_QUICK must be a full https checkout URL');
  }
  if (!fullOk) {
    blockingIssues.push('GUMROAD_PRODUCT_URL_FULL must be a full https checkout URL');
  }
  const checkoutReady = quickOk && fullOk;
  const webhookSecretOk = Boolean(cfg.webhookSecret);
  if (!webhookSecretOk) {
    blockingIssues.push('GUMROAD_WEBHOOK_SECRET is empty — webhooks cannot be verified');
  }
  const hasPermalinkPair = Boolean(
    String(cfg.productPermalinkQuick || '').trim() && String(cfg.productPermalinkFull || '').trim()
  );
  const hasIdPair = Boolean(String(cfg.productIdQuick || '').trim() && String(cfg.productIdFull || '').trim());
  if (!hasPermalinkPair && !hasIdPair) {
    recommendations.push(
      'Set GUMROAD_PRODUCT_PERMALINK_* or GUMROAD_PRODUCT_ID_* so each sale maps cleanly to quick vs full'
    );
  }
  const planMappingRecommended = hasPermalinkPair || hasIdPair;
  return {
    checkoutReady,
    webhookSecretOk,
    planMappingRecommended,
    /** True when checkout works and webhooks verify (recommended for production). */
    productionOk: checkoutReady && webhookSecretOk,
    blockingIssues,
    recommendations,
    /** All messages (blocking first) for CLI output. */
    issues: [...blockingIssues, ...recommendations]
  };
}

function resolvePlanFromWebhook(payload) {
  const cfg = getGumroadConfig();
  const content = payload || {};
  const customFields = content.custom_fields || {};
  const customPlan = String(customFields.plan || content.plan || '').trim().toLowerCase();
  if (customPlan === 'quick' || customPlan === 'full') return customPlan;

  const permalink = String(content.product_permalink || content.permalink || '').trim();
  if (cfg.productPermalinkQuick && permalink === cfg.productPermalinkQuick) return 'quick';
  if (cfg.productPermalinkFull && permalink === cfg.productPermalinkFull) return 'full';

  const productId = String(content.product_id || '').trim();
  if (cfg.productIdQuick && productId === cfg.productIdQuick) return 'quick';
  if (cfg.productIdFull && productId === cfg.productIdFull) return 'full';

  const productName = String(content.product_name || '').toLowerCase();
  if (productName.includes('quick')) return 'quick';
  return 'full';
}

module.exports = {
  createGumroadCheckoutUrl,
  verifyGumroadSignature,
  resolvePlanFromWebhook,
  summarizeGumroadReadiness
};

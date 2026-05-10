const crypto = require('crypto');

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

function getLemonConfig() {
  return {
    apiKey: String(process.env.LEMON_SQUEEZY_API_KEY || '').trim(),
    storeId: String(process.env.LEMON_SQUEEZY_STORE_ID || '').trim(),
    webhookSecret: String(process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '').trim(),
    variantQuick: String(process.env.LEMON_SQUEEZY_VARIANT_QUICK || '').trim(),
    variantFull: String(process.env.LEMON_SQUEEZY_VARIANT_FULL || '').trim(),
    successUrl: String(process.env.LEMON_SQUEEZY_SUCCESS_URL || '').trim(),
    cancelUrl: String(process.env.LEMON_SQUEEZY_CANCEL_URL || '').trim()
  };
}

function assertCheckoutConfig(config) {
  if (!config.apiKey || !config.storeId || !config.variantQuick || !config.variantFull) {
    const err = new Error('Lemon Squeezy is not configured. Missing API key/store/variant env vars.');
    err.code = 'LEMON_NOT_CONFIGURED';
    throw err;
  }
}

function variantIdForPlan(config, plan) {
  return String(plan || '').toLowerCase() === 'quick' ? config.variantQuick : config.variantFull;
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

async function createLemonCheckout({ email, plan, custom, successUrl, cancelUrl }) {
  const cfg = getLemonConfig();
  assertCheckoutConfig(cfg);

  const redirectUrl = normalizeHttpUrl(successUrl || cfg.successUrl);
  const cancelRedirectUrl = normalizeHttpUrl(cancelUrl || cfg.cancelUrl);
  const variantId = variantIdForPlan(cfg, plan);
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email,
          custom
        },
        ...((redirectUrl || cancelRedirectUrl)
          ? {
              checkout_options: {
                ...(cancelRedirectUrl ? { cancel_url: cancelRedirectUrl } : {})
              }
            }
          : {}),
        ...(redirectUrl ? { product_options: { redirect_url: redirectUrl } } : {})
      },
      relationships: {
        store: {
          data: { type: 'stores', id: cfg.storeId }
        },
        variant: {
          data: { type: 'variants', id: variantId }
        }
      }
    }
  };

  const response = await fetch(`${LEMON_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.errors?.[0]?.detail || 'Could not create Lemon checkout.');
    err.code = 'LEMON_CHECKOUT_CREATE_FAILED';
    err.details = payload;
    throw err;
  }

  const url = payload?.data?.attributes?.url;
  if (!url) {
    const err = new Error('Checkout URL missing from Lemon response.');
    err.code = 'LEMON_CHECKOUT_URL_MISSING';
    throw err;
  }
  return { url, raw: payload };
}

function verifyLemonSignature(rawBodyBuffer, signature) {
  const cfg = getLemonConfig();
  if (!cfg.webhookSecret) return false;
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', cfg.webhookSecret).update(rawBodyBuffer).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(String(signature));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  createLemonCheckout,
  verifyLemonSignature
};

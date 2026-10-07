const crypto = require('crypto');

/**
 * Fonepay "Checkout by Fonepay" (App Intent) client — direct merchant integration.
 * Ported from the Nivo AI codebase, which already runs this same merchant account
 * in production. Spec: F1Soft "Checkout Intent Flow V1.10" (Login, Bank List,
 * Generate Intent QR, Payment Status). Every request/response body must be signed:
 * Base64(SHA256withRSA(body)) in the `signature` header, using our PKCS8 private
 * key — Fonepay verifies it against our registered public key.
 */

function getPrivateKey() {
  const raw = process.env.FONEPAY_PRIVATE_KEY;
  if (!raw) throw new Error('FONEPAY_PRIVATE_KEY not configured');
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

function signPayload(payload) {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(payload, 'utf8');
  sign.end();
  return sign.sign(getPrivateKey()).toString('base64');
}

function baseUrl() {
  const url = String(process.env.FONEPAY_BASE_URL || '').trim();
  if (!url) throw new Error('FONEPAY_BASE_URL not configured');
  return url.replace(/\/$/, '');
}

function credentials() {
  const username = String(process.env.FONEPAY_USERNAME || '').trim();
  const password = String(process.env.FONEPAY_PASSWORD || '').trim();
  const terminalId = String(process.env.FONEPAY_TERMINAL_ID || '').trim();
  if (!username || !password || !terminalId) {
    throw new Error('Fonepay credentials not configured');
  }
  return { username, password, terminalId };
}

function isFonepayConfigured() {
  return Boolean(
    process.env.FONEPAY_USERNAME &&
      process.env.FONEPAY_PASSWORD &&
      process.env.FONEPAY_TERMINAL_ID &&
      process.env.FONEPAY_BASE_URL &&
      process.env.FONEPAY_PRIVATE_KEY
  );
}

let cachedToken = null;

async function fonepayLogin() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken;
  }

  const { username, password } = credentials();
  const payload = JSON.stringify({ username, password });
  const signature = signPayload(payload);
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(`${baseUrl()}/api/merchant/third-party/v2/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
      signature
    },
    body: payload,
    signal: AbortSignal.timeout(15_000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fonepay login failed ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text);
  const accessToken = data.accessToken.startsWith('Bearer ')
    ? data.accessToken.slice(7)
    : data.accessToken;

  cachedToken = {
    accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + data.expiresIn * 1000
  };
  return cachedToken;
}

async function authedPost(path, body) {
  const token = await fonepayLogin();
  const payload = JSON.stringify(body);
  const signature = signPayload(payload);

  const res = await fetch(`${baseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
      signature
    },
    body: payload,
    signal: AbortSignal.timeout(15_000)
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Fonepay ${path} returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`Fonepay ${path} failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

/** referenceLabel must be unique per transaction, alphanumeric only. */
async function generateFonepayIntentQr({ amount, billId, referenceLabel }) {
  const { terminalId } = credentials();
  return authedPost('/api/merchant/third-party/v2/generate-intent-qr', {
    amount,
    billId,
    terminalId,
    paymentMode: 'QR',
    referenceLabel,
    qrType: 'INTENT_QR'
  });
}

async function getFonepayPaymentStatus(referenceLabel) {
  const { terminalId } = credentials();
  return authedPost('/api/merchant/third-party/v2/thirdPartyDynamicQrGetStatus', {
    terminalId,
    referenceLabel
  });
}

module.exports = {
  isFonepayConfigured,
  generateFonepayIntentQr,
  getFonepayPaymentStatus
};

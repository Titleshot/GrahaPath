const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function getTurnstileConfig() {
  const siteKey = String(process.env.TURNSTILE_SITE_KEY || '').trim();
  const secretKey = String(process.env.TURNSTILE_SECRET_KEY || '').trim();
  return {
    siteKey,
    secretKey,
    enabled: Boolean(siteKey && secretKey)
  };
}

async function verifyTurnstileToken({ token, remoteIp }) {
  const cfg = getTurnstileConfig();
  if (!cfg.enabled) {
    return { ok: false, provider: 'turnstile', configured: false, siteKey: cfg.siteKey };
  }
  if (!token) {
    return { ok: false, provider: 'turnstile', configured: true, siteKey: cfg.siteKey, reason: 'missing_token' };
  }

  const body = new URLSearchParams();
  body.set('secret', cfg.secretKey);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', String(remoteIp));

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.success === true) {
      return { ok: true, provider: 'turnstile', configured: true, siteKey: cfg.siteKey };
    }
    const errCode = Array.isArray(data?.['error-codes']) ? data['error-codes'][0] : 'verification_failed';
    return {
      ok: false,
      provider: 'turnstile',
      configured: true,
      siteKey: cfg.siteKey,
      reason: String(errCode || 'verification_failed')
    };
  } catch {
    return {
      ok: false,
      provider: 'turnstile',
      configured: true,
      siteKey: cfg.siteKey,
      reason: 'verification_unreachable'
    };
  }
}

async function verifySecurityChallenge({ token, staticToken, remoteIp }) {
  const turnstile = getTurnstileConfig();
  if (turnstile.enabled) {
    return verifyTurnstileToken({ token, remoteIp });
  }

  const expectedStatic = String(process.env.SECURITY_CHALLENGE_TOKEN || '').trim();
  if (expectedStatic && staticToken && staticToken === expectedStatic) {
    return { ok: true, provider: 'static_token', configured: true };
  }
  return {
    ok: false,
    provider: expectedStatic ? 'static_token' : 'none',
    configured: Boolean(expectedStatic),
    reason: expectedStatic ? 'invalid_static_token' : 'no_challenge_provider_configured'
  };
}

module.exports = {
  getTurnstileConfig,
  verifySecurityChallenge
};

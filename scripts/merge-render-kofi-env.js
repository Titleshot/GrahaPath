#!/usr/bin/env node
/**
 * Pushes Ko-fi env vars to Render (one POST per key — same pattern as scripts/render-set-env.js).
 * Safe: does not wipe your other Render env vars.
 *
 * PowerShell:
 *   cd D:\GrahaPath
 *   $env:RENDER_API_KEY="rnd_..."
 *   $env:KOFI_VERIFICATION_TOKEN="(from Ko-fi → Webhooks → Advanced)"
 *   npm run render:merge-kofi-env
 *
 * Optional: RENDER_SERVICE_ID, FRONTEND_ORIGIN, KOFI_* overrides — see repo .env.example
 */

const token = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID || 'srv-d7vgt6jeo5us73enhbsg';
const kofiVerification = String(process.env.KOFI_VERIFICATION_TOKEN || '').trim();

if (!token) {
  console.error('Set RENDER_API_KEY (Render → Account → API Keys).');
  process.exit(1);
}
if (!kofiVerification) {
  console.error('Set KOFI_VERIFICATION_TOKEN from Ko-fi → Webhooks → Advanced.');
  process.exit(1);
}

const pairs = [
  ['KOFI_CHECKOUT_URL_QUICK', process.env.KOFI_CHECKOUT_URL_QUICK || 'https://ko-fi.com/s/56695dc75d'],
  ['KOFI_CHECKOUT_URL_FULL', process.env.KOFI_CHECKOUT_URL_FULL || 'https://ko-fi.com/s/cb8b7003ea'],
  ['KOFI_SHOP_LINK_CODE_QUICK', process.env.KOFI_SHOP_LINK_CODE_QUICK || '56695dc75d'],
  ['KOFI_SHOP_LINK_CODE_FULL', process.env.KOFI_SHOP_LINK_CODE_FULL || 'cb8b7003ea'],
  ['KOFI_VERIFICATION_TOKEN', kofiVerification],
  ['FRONTEND_ORIGIN', process.env.FRONTEND_ORIGIN || 'https://grahapath-web.vercel.app']
];

async function setEnvVar(key, value) {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key, value: String(value) })
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${key}: ${res.status} ${text}`);
  }
}

function pickServiceUrl(service) {
  if (!service || typeof service !== 'object') return '';
  const u =
    service.serviceDetails?.url ||
    service.serviceDetails?.serviceDetails?.url ||
    service.url;
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u.replace(/\/+$/, '') : '';
}

async function fetchService() {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET service: ${res.status} ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  for (const [key, value] of pairs) {
    await setEnvVar(key, value);
    console.log(`set ${key}`);
  }

  let base = '';
  try {
    const svc = await fetchService();
    base = pickServiceUrl(svc);
  } catch {
    /* ignore */
  }

  console.log('');
  console.log('Done. Trigger a deploy on Render if variables don’t apply until redeploy.');
  console.log('');
  base = String(process.env.RENDER_PUBLIC_URL || '').trim().replace(/\/+$/, '') || base;

  if (base) {
    console.log('Paste this into Ko-fi → Webhooks → Webhook URL, then Update:');
    console.log(`${base}/api/premium/webhook/kofi`);
    console.log('');
    console.log('Vercel → Environment → production:');
    console.log(`VITE_API_BASE_URL=${base}`);
  } else {
    console.log('Could not read your Render public URL from the API. Use your dashboard URL instead:');
    console.log('  Webhook: https://<your-service>.onrender.com/api/premium/webhook/kofi');
    console.log('  Vercel:  VITE_API_BASE_URL=https://<your-service>.onrender.com');
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

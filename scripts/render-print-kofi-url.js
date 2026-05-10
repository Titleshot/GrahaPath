#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
/**
 * Prints the exact GrahaPath Ko-fi webhook URL and Vercel env line (no secrets).
 *
 *   $env:RENDER_API_KEY="rnd_..."
 *   npm run render:print-kofi-url
 *
 * If Render’s API omits public URL:
 *   $env:RENDER_PUBLIC_URL="https://yourservice.onrender.com"
 */
const token = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID || 'srv-d7vgt6jeo5us73enhbsg';

function pickServiceUrl(service) {
  if (!service || typeof service !== 'object') return '';
  const u =
    service.serviceDetails?.url ||
    service.serviceDetails?.serviceDetails?.url ||
    service.url;
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u.replace(/\/+$/, '') : '';
}

async function main() {
  if (!token) {
    console.error('Set RENDER_API_KEY');
    process.exit(1);
  }
  let base =
    String(process.env.RENDER_PUBLIC_URL || '')
      .trim()
      .replace(/\/+$/, '') || '';

  if (!base) {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(text || res.status);
      process.exit(1);
    }
    base = pickServiceUrl(JSON.parse(text));
  }

  if (!base) {
    console.error(
      'Could not resolve public URL. Set RENDER_PUBLIC_URL=https://YOUR-SERVICE.onrender.com and run again.'
    );
    process.exit(1);
  }

  console.log('Ko-fi → Webhooks → Webhook URL → paste exactly:');
  console.log(`${base}/api/premium/webhook/kofi`);
  console.log('');
  console.log('Vercel (Production env, then redeploy):');
  console.log(`VITE_API_BASE_URL=${base}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

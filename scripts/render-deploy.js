#!/usr/bin/env node
/**
 * Trigger a Render Web Service deploy from your machine (no Git push required).
 *
 * Option A — deploy hook (recommended): Render Dashboard → Web Service → Settings → Deploy Hook
 *   RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv-...
 *
 * Option B — API: Account → API Keys
 *   RENDER_API_KEY=rnd_...
 *   RENDER_SERVICE_ID=srv-...   (optional; defaults to GrahaPath service id in repo scripts)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const hook = String(process.env.RENDER_DEPLOY_HOOK_URL || '').trim();
const token = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID || 'srv-d7vgt6jeo5us73enhbsg';

async function main() {
  if (hook) {
    const res = await fetch(hook, { method: 'POST' });
    const text = await res.text();
    if (!res.ok) {
      console.error('Deploy hook failed:', res.status, text);
      process.exit(1);
    }
    console.log('Render deploy triggered via RENDER_DEPLOY_HOOK_URL.');
    if (text) console.log(text);
    return;
  }

  if (!token) {
    console.error(
      'Missing RENDER_DEPLOY_HOOK_URL or RENDER_API_KEY.\n' +
        '  • Hook: Dashboard → Web Service → Settings → Deploy Hook → paste URL as RENDER_DEPLOY_HOOK_URL in .env\n' +
        '  • API: Account → API Keys → RENDER_API_KEY (and optional RENDER_SERVICE_ID)\n' +
        'Or use Dashboard → Manual Deploy → Deploy latest commit.'
    );
    process.exit(1);
  }

  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('Render API deploy failed:', res.status, text);
    process.exit(1);
  }
  console.log('Render deploy started via API.');
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

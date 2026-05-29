/**
 * Sets Render env vars one-by-one (POST /env-vars). No secrets belong in this file.
 *
 * Required in your shell before running:
 *   RENDER_API_KEY
 * Optional:
 *   RENDER_SERVICE_ID   (defaults to srv in this repo)
 *
 * Sensitive keys — set in environment only, e.g.
 *   OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, KOFI_VERIFICATION_TOKEN
 *
 * Run: node scripts/render-set-env.js
 */
const token = process.env.RENDER_API_KEY;
const service = process.env.RENDER_SERVICE_ID || 'srv-d7vgt6jeo5us73enhbsg';

if (!token) {
  console.error('RENDER_API_KEY is required');
  process.exit(1);
}

/** Only non-secret defaults; omit row if corresponding env unset. */
function buildVarsFromEnv() {
  const vars = [];

  const pushIf = (key, envName, fallback = '') => {
    const v = process.env[envName] ?? fallback;
    if (typeof v === 'string' && v.trim()) vars.push([key, v.trim()]);
  };

  pushIf('CHAT_PROVIDER', 'DEPLOY_CHAT_PROVIDER', '');
  pushIf('OPENAI_MODEL', 'DEPLOY_OPENAI_MODEL', '');
  pushIf('OPENAI_API_KEY', 'OPENAI_API_KEY', '');
  pushIf('SUPABASE_URL', 'SUPABASE_URL', '');
  pushIf('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', '');
  pushIf('SUPABASE_DB_URL', 'SUPABASE_DB_URL', '');
  pushIf('FEEDBACK_FORMSPREE_ENDPOINT', 'FEEDBACK_FORMSPREE_ENDPOINT', '');
  pushIf('FRONTEND_ORIGIN', 'FRONTEND_ORIGIN', 'https://grahapath-web.vercel.app');
  pushIf('NODE_VERSION', 'NODE_VERSION', '20');

  return vars;
}

async function setVar(key, value) {
  const response = await fetch(`https://api.render.com/v1/services/${service}/env-vars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key, value })
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${key}: ${response.status} ${text}`);
  }
  return text;
}

async function run() {
  const vars = buildVarsFromEnv();
  if (!vars.length) {
    console.error(
      'No vars to set. Export at least one of: OPENAI_API_KEY, SUPABASE_URL, FRONTEND_ORIGIN, or use merge-render-kofi-env.js for Ko-fi.'
    );
    process.exit(1);
  }
  for (const [key, value] of vars) {
    await setVar(key, value);
    console.log(`set ${key}`);
  }
}

run().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});

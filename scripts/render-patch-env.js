/**
 * @deprecated Prefer `npm run render:merge-kofi-env` or POST per-var via scripts/render-set-env.js.
 * This file previously contained real API keys (removed). Do not put secrets in git.
 *
 * For bulk env updates, use Render Dashboard or the API with env vars supplied from your machine only.
 */

const token = process.env.RENDER_API_KEY;
if (!token) {
  console.error(
    'This helper is disabled in-repo. Use: npm run render:merge-kofi-env (Ko-fi) or scripts/render-set-env.js with env vars set in your shell. RENDER_API_KEY required.'
  );
  process.exit(1);
}

console.error(
  'render-patch-env.js no longer PATCHes bundled secrets. See scripts/render-set-env.js or scripts/merge-render-kofi-env.js.'
);
process.exit(1);

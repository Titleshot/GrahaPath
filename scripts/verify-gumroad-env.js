#!/usr/bin/env node
/**
 * Validates Gumroad-related env vars (same rules as services/gumroadService.js).
 * Usage:
 *   node scripts/verify-gumroad-env.js           # exit 1 if checkout URLs invalid
 *   node scripts/verify-gumroad-env.js --strict  # exit 1 unless webhook secret + checkout OK
 *
 * Loads D:\GrahaPath\.env when present (local only; on Render env is already injected).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { summarizeGumroadReadiness } = require('../services/gumroadService');

const strict = process.argv.includes('--strict');
const r = summarizeGumroadReadiness();

console.log(
  [
    `checkoutReady: ${r.checkoutReady}`,
    `webhookSecretOk: ${r.webhookSecretOk}`,
    `planMappingRecommended: ${r.planMappingRecommended}`,
    strict ? `mode: strict (requires checkout + webhook secret)` : 'mode: lenient (checkout URLs only; use --strict for production)'
  ].join('\n')
);

if (!r.checkoutReady) {
  console.error('\nCheckout blocked — fix:');
  for (const line of r.blockingIssues.filter((x) => /PRODUCT_URL/i.test(x))) {
    console.error(` - ${line}`);
  }
  for (const line of r.blockingIssues.filter((x) => !/PRODUCT_URL/i.test(x) && !/WEBHOOK_SECRET/i.test(x))) {
    console.error(` - ${line}`);
  }
  process.exit(1);
}

if (strict) {
  if (!r.webhookSecretOk) {
    console.error('\nStrict mode: set GUMROAD_WEBHOOK_SECRET (Gumroad webhook signing secret).');
    process.exit(1);
  }
  console.log('\nStrict check passed (checkout + webhook).');
  process.exit(0);
}

if (!r.webhookSecretOk) {
  console.log('\nNote: GUMROAD_WEBHOOK_SECRET is unset — checkout URLs work locally, but Gumroad pings will not verify until you set it on the API host.');
}
if (r.recommendations?.length) {
  console.log('\nRecommended:');
  for (const line of r.recommendations) {
    console.log(` - ${line}`);
  }
}

console.log('\nGumroad env check passed (lenient).');
process.exit(0);

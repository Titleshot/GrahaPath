#!/usr/bin/env node
/**
 * Checks Ko-fi env for checkout + webhook.
 *   node scripts/verify-kofi-env.js
 *   node scripts/verify-kofi-env.js --strict   # require verification token too
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { summarizeKofiWebhookReadiness } = require('../services/kofiService');

const strict = process.argv.includes('--strict');
const r = summarizeKofiWebhookReadiness();

console.log(
  [
    `checkoutReady: ${r.checkoutReady}`,
    `webhookReady: ${r.webhookReady}`,
    strict ? `mode: strict (productionOk=${r.productionOk})` : 'mode: lenient (checkout URLs only)'
  ].join('\n')
);

if (r.blockingIssues?.length && !strict) {
  const urlOnly = r.blockingIssues.filter((x) => x.includes('CHECKOUT_URL'));
  const whOnly = r.blockingIssues.filter((x) => x.includes('VERIFICATION'));
  if (urlOnly.length) {
    console.log('\nBlocking checkout:');
    urlOnly.forEach((x) => console.log(` - ${x}`));
  }
  if (whOnly.length) {
    console.log('\nWebhook:');
    whOnly.forEach((x) => console.log(` - ${x}`));
  }
}

if (!r.checkoutReady) {
  console.error('\nSet KOFI_CHECKOUT_URL_QUICK and KOFI_CHECKOUT_URL_FULL.');
  process.exit(1);
}
if (strict && !r.productionOk) {
  console.error('\nStrict mode: configure KOFI_VERIFICATION_TOKEN and fix checkout URLs.');
  process.exit(1);
}
if (!strict && !r.webhookReady) {
  console.log('\nNote: KOFI_VERIFICATION_TOKEN missing — webhook will reject until set on the API.');
}
if (r.recommendations?.length) {
  console.log('\nRecommended:');
  r.recommendations.forEach((x) => console.log(` - ${x}`));
}
console.log('\nKo-fi env check passed.');
process.exit(0);

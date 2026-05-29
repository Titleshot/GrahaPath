#!/usr/bin/env node
/**
 * Ensures public.chart_access_profiles exists for durable magic links.
 *
 * 1. Checks via Supabase REST (service role)
 * 2. Applies scripts/supabase-chart-access-profiles.sql if SUPABASE_DB_URL is set
 *
 * Without SUPABASE_DB_URL: prints the SQL path and Supabase Dashboard steps.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const sqlPath = path.join(__dirname, 'supabase-chart-access-profiles.sql');

function resolveDbUrl() {
  const explicit = String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '').trim();
  if (explicit) return explicit;
  const password = String(process.env.SUPABASE_DB_PASSWORD || '').trim();
  if (!password || !SUPABASE_URL) return '';
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    if (!ref) return '';
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  } catch {
    return '';
  }
}

async function tableExistsViaRest() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { ok: false, reason: 'missing_supabase_env' };
  }
  const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/chart_access_profiles?select=id&limit=1`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`
    }
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  if (res.status === 404 || /does not exist|relation.*not found|PGRST205/i.test(body)) {
    return { ok: false, reason: 'table_missing' };
  }
  return { ok: false, reason: `http_${res.status}`, detail: body.slice(0, 200) };
}

async function applyViaPg() {
  const dbUrl = resolveDbUrl() || String(process.env.SUPABASE_DB_URL || '').trim();
  if (!dbUrl) return { ok: false, reason: 'no_db_url' };
  let pg;
  try {
    pg = require('pg');
  } catch {
    return { ok: false, reason: 'pg_not_installed' };
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(`select to_regclass('public.chart_access_profiles') as table_name`);
    return { ok: true, table: rows[0]?.table_name };
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('Checking chart_access_profiles table…');

  let check;
  try {
    check = await tableExistsViaRest();
  } catch (err) {
    console.warn('Could not reach Supabase REST:', err.message || err);
    check = { ok: false, reason: 'network_error' };
  }

  if (check.ok) {
    console.log('OK — chart_access_profiles already exists. Magic links can persist across devices.');
    return;
  }

  console.log('Table not found or not reachable. Applying migration…');

  const applied = await applyViaPg();
  if (applied.ok) {
    console.log('Migration applied. table:', applied.table || 'chart_access_profiles');
    return;
  }

  console.error('\nCould not create chart_access_profiles automatically.');
  console.error('Reason:', applied.reason || check.reason || 'unknown');

  console.error('\nDo this once in Supabase Dashboard:');
  console.error('  1. Open https://supabase.com/dashboard → your project → SQL Editor');
  console.error('  2. New query → paste contents of:');
  console.error(`     ${sqlPath}`);
  console.error('  3. Run');
  console.error('\nOptional (automated next time): add to .env');
  console.error('  SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@....pooler.supabase.com:6543/postgres');
  console.error('  (Supabase → Project Settings → Database → Connection string → URI)');
  console.error('Then run: npm run supabase:magic-links-table');
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

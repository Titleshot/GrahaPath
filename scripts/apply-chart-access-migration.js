#!/usr/bin/env node
/**
 * Applies scripts/supabase-chart-access-profiles.sql using SUPABASE_DB_URL or DATABASE_URL.
 * Example (Supabase → Settings → Database → Connection string → URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '').trim();
const sqlPath = path.join(__dirname, 'supabase-chart-access-profiles.sql');

async function main() {
  if (!dbUrl) {
    console.error(
      'Missing SUPABASE_DB_URL (or DATABASE_URL).\n' +
        'Supabase Dashboard → Project Settings → Database → Connection string → URI (pooler).\n' +
        'Add to .env as SUPABASE_DB_URL=postgresql://... then run: node scripts/apply-chart-access-migration.js'
    );
    process.exit(1);
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    console.error('Install pg first: npm install pg');
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(
      `select to_regclass('public.chart_access_profiles') as table_name`
    );
    console.log('Migration applied. table:', rows[0]?.table_name || 'chart_access_profiles');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

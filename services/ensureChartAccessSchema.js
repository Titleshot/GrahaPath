/**
 * Idempotent DDL for magic-link persistence (chart_access_profiles).
 * Runs on API startup when SUPABASE_DB_URL (or DATABASE_URL) is set.
 */
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', 'scripts', 'supabase-chart-access-profiles.sql');
let ran = false;

async function ensureChartAccessProfilesTable() {
  if (ran) return { skipped: true, reason: 'already_ran' };

  let dbUrl = String(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '').trim();
  if (!dbUrl) {
    const password = String(process.env.SUPABASE_DB_PASSWORD || '').trim();
    const base = String(process.env.SUPABASE_URL || '').trim();
    if (password && base) {
      try {
        const ref = new URL(base).hostname.split('.')[0];
        if (ref) {
          dbUrl = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (!dbUrl) {
    return { skipped: true, reason: 'no_db_url' };
  }

  let pg;
  try {
    pg = require('pg');
  } catch {
    return { skipped: true, reason: 'pg_not_installed' };
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(
      `select to_regclass('public.chart_access_profiles') as table_name`
    );
    ran = true;
    return { ok: true, table: rows[0]?.table_name || 'chart_access_profiles' };
  } finally {
    await client.end();
  }
}

module.exports = { ensureChartAccessProfilesTable };

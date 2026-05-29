-- Magic-link chart profiles (persistent across Render deploys)
-- Run in Supabase SQL editor after SUPABASE_URL is configured on the API.

create table if not exists public.chart_access_profiles (
  id text primary key,
  access_token text not null unique,
  client_name text null,
  chart_data jsonb not null,
  created_by text null,
  created_at timestamptz not null default now(),
  revoked boolean not null default false,
  expires_at timestamptz null,
  insights_used integer not null default 0,
  insights_limit integer not null default 55,
  legal_acceptances jsonb not null default '[]'::jsonb
);

create index if not exists chart_access_profiles_token_idx
  on public.chart_access_profiles (access_token);

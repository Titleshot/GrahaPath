-- GrahaPath MVP database schema (Supabase/PostgreSQL)
-- Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  plan text not null default 'full',
  remaining_insights integer not null default 0,
  premium_active boolean not null default false,
  chart_id text null,
  purchase_status text null,
  purchase_timestamp timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  birth_date text null,
  birth_time text null,
  birth_place text null,
  chart_data jsonb not null,
  dasha_data jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists charts_user_id_created_at_idx
  on public.charts(user_id, created_at desc);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  gumroad_order_id text null unique,
  amount numeric(10, 2) null,
  plan text not null,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_created_at_idx
  on public.payments(user_id, created_at desc);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text null,
  phone text null,
  note text null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  approved boolean not null default false,
  approved_at timestamptz null,
  approved_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Host accounts table for DoorDoor.games
-- Run this once against your Supabase project (SQL Editor or `supabase db push`)
-- before host signup/login will work.

create extension if not exists pgcrypto;

create table if not exists public.hosts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  password_hash text not null,
  phone_verified boolean not null default false,
  trial_used boolean not null default false,
  remaining_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists hosts_email_key on public.hosts (lower(email));
create unique index if not exists hosts_phone_key on public.hosts (phone);

-- The API server talks to this table using the Supabase service-role
-- (secret) key, which bypasses Row Level Security entirely. RLS is enabled
-- here anyway as defense in depth in case the anon/publishable key is ever
-- used against this table directly; no policies are defined, so all access
-- through the publishable key is denied by default.
alter table public.hosts enable row level security;

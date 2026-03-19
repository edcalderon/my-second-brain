-- =============================================================================
-- 001_create_app_users.sql
-- Vendor-independent user registry for projects using @edcalderon/auth.
--
-- WHY THIS EXISTS
-- ───────────────
-- Supabase Auth stores users in auth.users — a table owned and managed by the
-- Supabase platform. This couples your user identity data to the vendor. If you
-- ever need to migrate to a different auth provider (Firebase, Authentik, Clerk,
-- custom OIDC, …), you lose access to that table.
--
-- This migration creates public.users: your app's own copy of user identity.
-- It uses a (sub, iss) identity key compatible with the OIDC standard, so any
-- auth provider (Supabase Auth, Authentik, Auth0, Firebase, wallet-based, …)
-- can write to the same table without collisions.
--
-- IDENTITY KEY
-- ────────────
--   sub  – subject claim (OIDC) or auth.users.id for Supabase Auth users
--   iss  – issuer identifier:
--             'supabase'                           → Supabase Auth users
--             'https://sso.example.com/o/app/'    → Authentik OIDC users
--             'https://accounts.google.com'        → Google OIDC direct
--             … any stable issuer string
--
-- WRITE PATH
-- ──────────
--   • Supabase Auth users  → trigger in 002_sync_auth_users_to_app_users.sql
--   • OIDC / external OIDC → client calls upsert_oidc_user() RPC with anon key
--   • Authentik webhook    → server calls upsert_oidc_user() with service key
-- =============================================================================

create extension if not exists pgcrypto;

-- ─── Table ───────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id             uuid        primary key default gen_random_uuid(),
  sub            text        not null,
  iss            text        not null,
  email          text,
  email_verified boolean     not null default false,
  name           text,
  picture        text,
  -- Social provider that was brokered: 'email' | 'google' | 'discord' | …
  provider       text,
  -- Full raw claims from the OIDC token / Supabase user_metadata
  raw_claims     jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),

  constraint users_sub_iss_uq    unique (sub, iss),
  constraint users_sub_len_chk   check (char_length(sub) <= 256),
  constraint users_iss_len_chk   check (char_length(iss) <= 512),
  constraint users_email_len_chk check (email is null or char_length(email) <= 320)
);

create index if not exists users_email_idx
  on public.users (lower(email)) where email is not null;

create index if not exists users_provider_idx
  on public.users (provider) where provider is not null;

-- ─── Auto-bump updated_at ────────────────────────────────────────────────────

create or replace function public.users_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.users_set_updated_at();

-- ─── upsert_oidc_user ────────────────────────────────────────────────────────
-- Called from:
--   • Mobile / web client after a successful OIDC redirect (with anon key)
--   • Server-side webhook handler (Authentik, Auth0 events, …)
--
-- SECURITY DEFINER: the anon role can write to public.users without needing the
-- service-role key. The function enforces its own logic; RLS is still active for
-- direct table queries.

create or replace function public.upsert_oidc_user(
  p_sub            text,
  p_iss            text,
  p_email          text          default null,
  p_email_verified boolean       default false,
  p_name           text          default null,
  p_picture        text          default null,
  p_provider       text          default null,
  p_raw_claims     jsonb         default '{}'::jsonb
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users;
begin
  insert into public.users (
    sub, iss, email, email_verified, name, picture, provider, raw_claims
  )
  values (
    p_sub, p_iss, p_email, p_email_verified,
    p_name, p_picture, p_provider, p_raw_claims
  )
  on conflict (sub, iss) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        picture        = excluded.picture,
        provider       = excluded.provider,
        raw_claims     = excluded.raw_claims,
        updated_at     = timezone('utc', now())
  returning * into v_user;

  return v_user;
end;
$$;

-- Grant to both roles so the client can call it with anon key and authenticated
-- sessions both work (Supabase routes based on the JWT role claim).
grant execute
  on function public.upsert_oidc_user(text, text, text, boolean, text, text, text, jsonb)
  to anon, authenticated;

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Enable RLS. Writes go exclusively through upsert_oidc_user (DEFINER).
-- Add SELECT policies once your app has a JWT-based session strategy.
-- Example policy (uncomment when ready):
--
--   create policy users_select_own on public.users
--     for select to authenticated
--     using (sub = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

alter table public.users enable row level security;

-- ============================================================================
-- 001_create_app_users.sql
-- Vendor-independent user registry for projects using @edcalderon/auth.
--
-- This creates an application-owned public.users table keyed by (sub, iss)
-- and a secure upsert RPC intended for trusted server-side use.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.users (
  id             uuid        primary key default gen_random_uuid(),
  sub            text        not null,
  iss            text        not null,
  email          text,
  email_verified boolean     not null default false,
  name           text,
  picture        text,
  provider       text,
  raw_claims     jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),

  constraint users_sub_iss_uq unique (sub, iss),
  constraint users_sub_len_chk check (char_length(sub) <= 256),
  constraint users_iss_len_chk check (char_length(iss) <= 512),
  constraint users_email_len_chk check (
    email is null or char_length(email) <= 320
  )
);

create index if not exists users_email_idx
  on public.users (lower(email))
  where email is not null;

create index if not exists users_provider_idx
  on public.users (provider)
  where provider is not null;

create or replace function public.users_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;

create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.users_set_updated_at();

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
  v_claims jsonb := coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
  v_role text := coalesce(nullif(v_claims ->> 'role', ''), 'unknown');
  v_user public.users;
begin
  if v_role <> 'service_role' then
    raise exception 'upsert_oidc_user() requires a trusted server-side caller';
  end if;

  if nullif(trim(p_sub), '') is null or nullif(trim(p_iss), '') is null then
    raise exception 'upsert_oidc_user() requires non-empty p_sub and p_iss';
  end if;

  insert into public.users (
    sub,
    iss,
    email,
    email_verified,
    name,
    picture,
    provider,
    raw_claims
  )
  values (
    trim(p_sub),
    trim(p_iss),
    nullif(trim(p_email), ''),
    p_email_verified,
    nullif(trim(p_name), ''),
    nullif(trim(p_picture), ''),
    nullif(trim(p_provider), ''),
    coalesce(p_raw_claims, '{}'::jsonb)
  )
  on conflict (sub, iss) do update
    set email = coalesce(excluded.email, public.users.email),
        email_verified = public.users.email_verified or excluded.email_verified,
        name = coalesce(excluded.name, public.users.name),
        picture = coalesce(excluded.picture, public.users.picture),
        provider = coalesce(excluded.provider, public.users.provider),
        raw_claims = case
          when excluded.raw_claims = '{}'::jsonb then public.users.raw_claims
          else public.users.raw_claims || excluded.raw_claims
        end,
        updated_at = timezone('utc', now())
  returning * into v_user;

  return v_user;
end;
$$;

revoke all on function public.upsert_oidc_user(
  text,
  text,
  text,
  boolean,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.upsert_oidc_user(
  text,
  text,
  text,
  boolean,
  text,
  text,
  text,
  jsonb
) to service_role;

alter table public.users enable row level security;
-- =============================================================================
-- 002_sync_auth_users_to_app_users.sql
-- Trigger: keep auth.users → public.users in sync automatically.
--
-- Depends on: 001_create_app_users.sql
--
-- WHY A TRIGGER?
-- ──────────────
-- Without this, only users who authenticate through an explicit OIDC flow
-- (e.g. Authentik callback, Auth0 webhook) end up in public.users. Email
-- sign-ups and any OAuth provider brokered directly by Supabase Auth would
-- be silently missing from the vendor-independent table.
--
-- This trigger fires on every auth.users INSERT and on targeted UPDATEs so
-- that 100% of Supabase Auth users are always reflected in public.users —
-- regardless of how they signed up.
--
-- IDENTITY MAPPING
-- ────────────────
--   sub = auth.users.id::text   (the Supabase UUID, stable forever)
--   iss = 'supabase'            (distinguishes from external OIDC issuers)
--
-- EVENTS COVERED
-- ──────────────
--   INSERT                  → new sign-up (email or OAuth via Supabase)
--   UPDATE email_confirmed_at → user clicked the confirmation link
--                               → email_verified flips from false → true
--   UPDATE email            → user changed their email address
--   UPDATE raw_user_meta_data → profile updated (name, picture, …)
--   UPDATE raw_app_meta_data  → provider/role metadata updated
--
-- BACKFILL
-- ────────
-- The INSERT … SELECT at the bottom runs once during migration to sync all
-- existing auth.users rows that pre-date this migration.
-- =============================================================================

-- ─── Trigger function ────────────────────────────────────────────────────────

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip Supabase anonymous auth users (is_anonymous = true).
  -- They have no real identity to preserve in the vendor-independent table.
  if new.is_anonymous then
    return new;
  end if;

  -- Upsert into public.users using the Supabase user's UUID as sub and the
  -- literal string 'supabase' as iss. This key space is separate from any
  -- external OIDC issuer URLs, so both can coexist in the same table.
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
    new.id::text,
    'supabase',
    new.email,
    -- email_confirmed_at being non-null means the user clicked the magic link
    -- or entered the OTP — their email is verified.
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      -- Fallback: derive a display name from the email local-part
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    -- raw_app_meta_data->>'provider' is set by Supabase Auth:
    --   'email'   for email/password sign-ups
    --   'google'  for Google OAuth
    --   'github'  for GitHub OAuth  … etc.
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (sub, iss) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        name           = excluded.name,
        picture        = excluded.picture,
        provider       = excluded.provider,
        raw_claims     = excluded.raw_claims,
        updated_at     = timezone('utc', now());

  return new;
end;
$$;

-- ─── Trigger registration ─────────────────────────────────────────────────────
-- Scoped to the specific columns that carry meaningful identity changes to avoid
-- firing on every row-level write (e.g. last_sign_in_at updates).

drop trigger if exists trg_auth_users_sync_to_app_users on auth.users;

create trigger trg_auth_users_sync_to_app_users
after insert
  or update of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function public.sync_auth_user_to_app_users();

-- ─── Backfill ─────────────────────────────────────────────────────────────────
-- Sync all Supabase Auth users that existed before this migration was applied.
-- Safe to re-run: the ON CONFLICT clause makes it idempotent.

insert into public.users (
  sub, iss, email, email_verified, name, picture, provider, raw_claims
)
select
  u.id::text,
  'supabase',
  u.email,
  u.email_confirmed_at is not null,
  coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data->>'avatar_url',
  coalesce(u.raw_app_meta_data->>'provider', 'email'),
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
where not u.is_anonymous
on conflict (sub, iss) do update
  set email          = excluded.email,
      email_verified = excluded.email_verified,
      name           = excluded.name,
      picture        = excluded.picture,
      provider       = excluded.provider,
      raw_claims     = excluded.raw_claims,
      updated_at     = timezone('utc', now());

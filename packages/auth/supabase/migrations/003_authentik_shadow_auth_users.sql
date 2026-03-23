-- ============================================================================
-- 003_authentik_shadow_auth_users.sql
-- Optional migration for projects using the Authentik ↔ Supabase integrated
-- sync mode in @edcalderon/auth.
--
-- This migration adds app_metadata columns and an index to support the
-- shadow auth.users pattern where Authentik-authenticated users are mirrored
-- into Supabase auth.users with identity-first matching.
--
-- The public.users table is already created by 001_create_app_users.sql.
-- This migration adds columns to support the shadow-user linkage and
-- rollback-safe provisioning.
--
-- Reference: CIG apps/dashboard/lib/authSync.ts
-- ============================================================================

-- Add optional column to track the linked Supabase auth.users shadow ID
alter table public.users
  add column if not exists shadow_auth_user_id uuid;

-- Add optional column to record when the shadow link was established
alter table public.users
  add column if not exists shadow_linked_at timestamptz;

-- Index for quick lookup by shadow auth user ID
create index if not exists users_shadow_auth_user_id_idx
  on public.users (shadow_auth_user_id)
  where shadow_auth_user_id is not null;

-- ============================================================================
-- Helper RPC: link a public.users row to a Supabase auth.users shadow record.
-- Called by the SupabaseSyncAdapter after creating/finding the shadow user.
--
-- This is an additive helper — the core upsert_oidc_user RPC from migration
-- 001 continues to work unchanged.  The raw_claims payload can optionally
-- carry shadow_supabase_auth_user_id to record the linkage.
-- ============================================================================

create or replace function public.link_shadow_auth_user(
  p_sub               text,
  p_iss               text,
  p_shadow_auth_user_id uuid
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
    raise exception 'link_shadow_auth_user() requires a trusted server-side caller';
  end if;

  update public.users
    set shadow_auth_user_id = p_shadow_auth_user_id,
        shadow_linked_at    = timezone('utc', now()),
        updated_at          = timezone('utc', now())
  where sub = p_sub
    and iss = p_iss
  returning * into v_user;

  if not found then
    raise exception 'No public.users row found for sub=% iss=%', p_sub, p_iss;
  end if;

  return v_user;
end;
$$;

revoke all on function public.link_shadow_auth_user(text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.link_shadow_auth_user(text, text, uuid)
  to service_role;

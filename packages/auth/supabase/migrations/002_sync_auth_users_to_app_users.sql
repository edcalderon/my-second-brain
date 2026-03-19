-- ============================================================================
-- 002_sync_auth_users_to_app_users.sql
-- Optional trigger for projects that use Supabase Auth.
-- Keeps auth.users mirrored into public.users and backfills existing users.
-- ============================================================================

create or replace function public.sync_auth_user_to_app_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_anonymous then
    return new;
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
    new.id::text,
    'supabase',
    new.email,
    new.email_confirmed_at is not null,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
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
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists trg_auth_users_sync_to_app_users on auth.users;

create trigger trg_auth_users_sync_to_app_users
after insert or update of email_confirmed_at, email, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row
execute function public.sync_auth_user_to_app_users();

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
select
  u.id::text,
  'supabase',
  u.email,
  u.email_confirmed_at is not null,
  coalesce(
    u.raw_user_meta_data ->> 'name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url',
  coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
from auth.users u
where not u.is_anonymous
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
      updated_at = timezone('utc', now());
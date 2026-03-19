# @edcalderon/auth Supabase SQL Templates

Copy these files into your own Supabase project. They are reference migrations for projects using @edcalderon/auth, not runtime imports.

## Quick Setups

| Use case | Apply | Result |
| --- | --- | --- |
| Supabase Auth quick setup | `001` + `002` | Vendor-independent `public.users` plus automatic `auth.users -> public.users` sync |
| External OIDC only | `001` | Vendor-independent `public.users` plus a secure server-side upsert RPC |

## Files

| File | Purpose |
| --- | --- |
| `migrations/001_create_app_users.sql` | Creates `public.users`, timestamps trigger, and `upsert_oidc_user()` |
| `migrations/002_sync_auth_users_to_app_users.sql` | Optional trigger/backfill for projects that use Supabase Auth |

## What You Get

- A vendor-independent `public.users` table keyed by `(sub, iss)`.
- A clean migration path away from Supabase Auth later.
- An optional trigger that mirrors Supabase Auth users automatically.
- Safe default behavior for optional profile fields so missing claims do not erase stored data.

## Security Model

`upsert_oidc_user()` is intentionally not callable by the `anon` role.

- Supabase Auth users are synced automatically by migration `002`.
- External OIDC users should be written by a trusted server or Edge Function after token verification.
- Optional fields such as `email`, `name`, `picture`, and `provider` only overwrite stored values when a non-null value is provided.

## Apply

```bash
# Copy into your project
cp packages/auth/supabase/migrations/*.sql your-project/supabase/migrations/

# Apply them with the Supabase CLI
supabase db push
```

If you only want the vendor-independent table and are not using Supabase Auth as a provider, apply only `001_create_app_users.sql`.

## Suggested External OIDC Flow

1. Verify the provider token in your server or Edge Function.
2. Extract `sub`, `iss`, and optional claims.
3. Call `upsert_oidc_user()` with the service-role key.
4. Use the returned `public.users.id` as your application user identifier.

## Why `(sub, iss)`

The `(sub, iss)` pair follows the OIDC identity model and allows multiple providers to coexist safely:

| Provider | `sub` | `iss` |
| --- | --- | --- |
| Supabase Auth | `auth.users.id` | `supabase` |
| Authentik | provider UUID | issuer URL |
| Auth0 | provider user id | issuer URL |
| Firebase | provider uid | issuer URL |
| Custom OIDC | JWT `sub` | JWT `iss` |

That gives you a stable application-owned identity layer even if you later replace the auth provider.
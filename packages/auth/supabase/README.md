# `@edcalderon/auth` — Supabase Schema Reference

> **Copy, don't import.** These migrations are a reference skeleton, not a published package. Copy them into your project's `supabase/migrations/` folder and apply with `supabase db push`.

---

## The problem

When you use `@edcalderon/auth` with Supabase as the backend, your users live in `auth.users` — a table that Supabase owns and controls. This creates **vendor lock-in**: if you ever need to migrate to a different auth provider (Authentik, Firebase, Clerk, a custom OIDC server, …), your user identity data is stranded inside Supabase Auth.

## The solution

Two migrations that take ~5 minutes to apply and give you complete freedom to swap auth providers later:

| Migration | What it does |
|-----------|-------------|
| [`001_create_app_users.sql`](./migrations/001_create_app_users.sql) | Creates `public.users` — your app's vendor-independent user table — plus the `upsert_oidc_user()` RPC callable with the anon key |
| [`002_sync_auth_users_to_app_users.sql`](./migrations/002_sync_auth_users_to_app_users.sql) | Postgres trigger that keeps `auth.users → public.users` in sync automatically. Backfills existing users on first run |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Your application                       │
│                                                          │
│  @edcalderon/auth client                                 │
│       │                                                  │
│       ├─ email sign-up/in ──────────────────────┐        │
│       ├─ Google / GitHub OAuth (Supabase)  ─────┤        │
│       ├─ Authentik OIDC redirect ───────────────┤        │
│       └─ Wallet (SIWE/SIWS) ───────────────────┐│        │
│                                               ││        │
└───────────────────────────────────────────────┼┼────────┘
                                                ││
            Supabase Auth                       ││
         ┌──────────────┐                       ││
         │  auth.users  │                       ││
         └──────┬───────┘                       ││
                │ trigger (002)                 ││
                ▼                               ││
         ┌──────────────────────────────────────┼┼──┐
         │           public.users               ││  │
         │                                      ││  │
         │  (sub, iss) unique key               ││  │
         │   iss='supabase'  ←──────────────────┘│  │
         │   iss='https://sso.example.com/…' ←───┘  │
         │   iss='https://accounts.google.com'       │
         │   iss='your-custom-provider'              │
         └───────────────────────────────────────────┘
```

### Identity key: `(sub, iss)`

`public.users` uses the OIDC standard `(subject, issuer)` pair as its unique identity key. This means **multiple auth providers coexist in the same table without collisions**:

| Auth method | `sub` | `iss` |
|-------------|-------|-------|
| Supabase Auth (email, OAuth) | `auth.users.id` | `'supabase'` |
| Authentik OIDC | Authentik user UUID | `'https://sso.example.com/application/o/app/'` |
| Auth0 | Auth0 user ID | `'https://your-tenant.auth0.com/'` |
| Firebase Auth | Firebase UID | `'https://securetoken.google.com/<project>'` |
| Custom OIDC | JWT `sub` | JWT `iss` |

---

## Write paths

### 1. Supabase Auth users (email + OAuth brokered by Supabase)

**Automatic** — handled by the trigger in `002`. No app code changes needed.

```
User signs up with email
       ↓
auth.users INSERT
       ↓
trg_auth_users_sync_to_app_users fires
       ↓
public.users upserted  ✓
```

Email confirmation is also handled: when the user clicks the magic link,
`email_confirmed_at` is set → trigger fires again → `email_verified` flips to `true`.

### 2. External OIDC providers (Authentik, Auth0, custom)

Call `upsert_oidc_user()` from the client after a successful OIDC redirect.
The function is `SECURITY DEFINER` so it works with the **anon key** — no service-role credential needed on the client.

```typescript
// After exchanging the OIDC code for tokens and fetching userinfo:
const { data } = await supabase.rpc('upsert_oidc_user', {
  p_sub:            claims.sub,
  p_iss:            claims.iss,          // OIDC issuer URL
  p_email:          claims.email,
  p_email_verified: claims.email_verified ?? false,
  p_name:           claims.name,
  p_picture:        claims.picture,
  p_provider:       'google',            // which social provider was brokered
  p_raw_claims:     claims,
});
const appUserId = data.id;               // your app's own UUID
```

### 3. Server-side webhooks (Authentik model_created/updated events)

Call `upsert_oidc_user()` from your API with the service-role key.
Useful for syncing users created via the Authentik admin UI or email flow.

```typescript
// NestJS / Express webhook handler:
await supabase.rpc('upsert_oidc_user', {
  p_sub:   event.body.sub,
  p_iss:   AUTHENTIK_ISSUER,
  p_email: event.body.email,
  // …
});
```

---

## How to apply

```bash
# Copy into your project
cp packages/auth/supabase/migrations/*.sql your-project/supabase/migrations/

# Apply to remote Supabase project
supabase db push
```

Or apply directly via psql:

```bash
psql "$DATABASE_URL" -f 001_create_app_users.sql
psql "$DATABASE_URL" -f 002_sync_auth_users_to_app_users.sql
```

---

## Migration path away from Supabase Auth

When you're ready to drop Supabase Auth:

1. `public.users` already has every user (trigger + backfill)
2. Point your new auth provider at `public.users` using the `(sub, iss)` key from that provider's tokens
3. Drop the `002` trigger once Supabase Auth is no longer the write path
4. Remove `auth.users` FK references from your schema

Your user data survives intact. No data migration needed.

---

## Compatibility

- Supabase (all plans)
- PostgreSQL ≥ 14
- `@edcalderon/auth` ≥ 1.0.0
- Works alongside `auth.users` — does not replace or modify it

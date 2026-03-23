# Provisioning Model

> **Package:** `@edcalderon/auth/authentik` (v1.4.0+)
> **Runtime:** Server-side only (requires `service_role` key)

This document describes the Authentik-to-Supabase user provisioning model — a first-class path for ensuring every Authentik-authenticated user exists in your application's local user store before they can access protected resources.

---

## Table of Contents

1. [Overview](#overview)
2. [Three-Layer Identity Model](#three-layer-identity-model)
3. [Identity-First Match Strategy](#identity-first-match-strategy)
4. [Provisioning Adapter Interface](#provisioning-adapter-interface)
5. [SupabaseSyncAdapter](#supabasesyncadapter)
6. [Rollback Behavior](#rollback-behavior)
7. [SQL Migrations](#sql-migrations)
8. [Runtime Requirements](#runtime-requirements)
9. [Startup Validation](#startup-validation)

---

## Overview

The provisioning model is **fail-closed**: if user sync fails, the callback handler does not redirect the user into the protected app. This ensures no user can access the application without a corresponding local user record.

The `SupabaseSyncAdapter` is the production-grade adapter that implements the full CIG-proven sync flow:

1. Normalize the OIDC payload (lowercase email, resolve name from claims)
2. Ensure a shadow `auth.users` record exists (identity-first matching)
3. Call `upsert_oidc_user()` RPC to sync into `public.users`
4. Link the shadow auth user via `link_shadow_auth_user()` RPC
5. Roll back on failure (delete newly created shadow records)

---

## Three-Layer Identity Model

The provisioning system uses a three-layer identity architecture:

```
┌──────────────────────────────────────────────────────────┐
│                    Layer 1: Authentik                      │
│                                                            │
│  The upstream OIDC identity provider. Users authenticate   │
│  here via social login (Google, GitHub, Discord, etc.)     │
│  or direct Authentik credentials.                          │
│                                                            │
│  Identity key: (sub, iss)                                  │
│  ┌─────────────────────────────────────────────────┐       │
│  │ sub: "google-oauth2|12345"                      │       │
│  │ iss: "https://auth.example.com/application/o/…" │       │
│  │ email: "user@example.com"                       │       │
│  │ name: "Jane Doe"                                │       │
│  └─────────────────────────────────────────────────┘       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                 Layer 2: public.users                      │
│                                                            │
│  Application-owned user table. This is the canonical       │
│  user record for your app's business logic, RLS            │
│  policies, and authorization.                              │
│                                                            │
│  Primary key: id (uuid)                                    │
│  Unique key: (sub, iss)                                    │
│  ┌─────────────────────────────────────────────────┐       │
│  │ id: "uuid-abc-123"                              │       │
│  │ sub: "google-oauth2|12345"                      │       │
│  │ iss: "https://auth.example.com/application/o/…" │       │
│  │ email: "user@example.com"                       │       │
│  │ shadow_auth_user_id: "uuid-def-456" (optional)  │       │
│  └─────────────────────────────────────────────────┘       │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│          Layer 3: auth.users (Shadow — Optional)          │
│                                                            │
│  Supabase's built-in auth.users table. A "shadow"          │
│  record mirrors the Authentik identity so that Supabase    │
│  RLS policies, storage rules, and realtime subscriptions   │
│  work out of the box.                                      │
│                                                            │
│  ┌─────────────────────────────────────────────────┐       │
│  │ id: "uuid-def-456"                              │       │
│  │ email: "user@example.com"                       │       │
│  │ app_metadata: {                                 │       │
│  │   provider: "authentik",                        │       │
│  │   oidc_sub: "google-oauth2|12345",              │       │
│  │   oidc_issuer: "https://auth.example.com/…"     │       │
│  │ }                                               │       │
│  └─────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

**Why three layers?**

- **Layer 1 (Authentik)** handles authentication — "who are you?"
- **Layer 2 (`public.users`)** is your app's source of truth — "what can you do?"
- **Layer 3 (`auth.users` shadow)** enables Supabase-native features (RLS, storage, realtime) without requiring users to sign up through Supabase Auth directly.

The shadow layer is **optional** (controlled by `createShadowAuthUser` config, default: `true`). If your app does not use Supabase RLS or storage features, you can disable it.

---

## Identity-First Match Strategy

The adapter uses a two-tier matching strategy when looking for existing user records:

### Priority 1: OIDC Identity Match (sub + iss)

```
app_metadata.auth_source === "authentik"
  AND app_metadata.oidc_sub === payload.sub
  AND app_metadata.oidc_issuer === payload.iss
```

This is the **primary** and **safest** match. The OIDC `sub` claim is immutable for a given user at a given issuer. It cannot be changed by the user.

### Priority 2: Email Fallback

If no identity match is found, the adapter falls back to matching by email address:

```
user.email.toLowerCase() === payload.email.toLowerCase()
```

This handles the case where a shadow `auth.users` record already exists (e.g. from a previous Supabase Auth signup) but hasn't been linked to an Authentik identity yet. When matched by email, the adapter **updates** the record to include the OIDC identity markers.

### Why Identity-First?

Email-based matching alone is risky:
- Users can change their email at the upstream provider
- Different providers might have different emails for the same person
- Email conflicts could lead to unauthorized access

By matching on `(oidc_sub, oidc_issuer)` first, the adapter prevents these scenarios. Email fallback exists only as a migration path for pre-existing records.

### Pagination

The adapter paginates through **all** `auth.users` pages (1000 users per page) to ensure matches beyond the first page are not missed. This is critical for larger Supabase projects.

---

## Provisioning Adapter Interface

All provisioning adapters implement the `ProvisioningAdapter` interface:

```ts
interface ProvisioningAdapter {
  sync(payload: ProvisioningPayload): Promise<ProvisioningResult>;
}
```

### ProvisioningPayload

The input to every adapter:

```ts
interface ProvisioningPayload {
  /** OIDC subject identifier. */
  sub: string;
  /** OIDC issuer URL. */
  iss: string;
  /** User email (normalised to lowercase). */
  email: string;
  /** Whether the email is verified by the OIDC provider. */
  emailVerified?: boolean;
  /** Display name. */
  name?: string;
  /** Avatar / profile picture URL. */
  picture?: string;
  /** Upstream social provider slug (e.g. "google", "github"). */
  provider?: string;
  /** The full set of OIDC claims as received from Authentik. */
  rawClaims?: Record<string, unknown>;
}
```

### ProvisioningResult

The output from every adapter:

```ts
interface ProvisioningResult {
  /** Must be true for the callback to proceed with redirect. */
  synced: boolean;
  /** The app-level user ID (from public.users or equivalent). */
  appUserId?: string;
  /** Supabase auth.users ID when shadow-user mode is used. */
  authUserId?: string;
  /** Whether a new shadow auth.users row was created. */
  authUserCreated?: boolean;
  /** Whether an existing shadow auth.users row was updated. */
  authUserUpdated?: boolean;
  /** Human-readable diagnostic on failure. */
  error?: string;
  /** Machine-readable error code. */
  errorCode?: string;
}
```

The `synced` flag is the gating condition: the callback handler will **not** redirect the user unless `synced === true`.

### Built-in Adapters

| Adapter | Use Case |
|---------|----------|
| `NoopProvisioningAdapter` | No user sync needed — always returns `{ synced: true }` |
| `createProvisioningAdapter(fn)` | Custom sync logic via a plain function |
| `SupabaseSyncAdapter` | Full Authentik ↔ Supabase integrated sync |

---

## SupabaseSyncAdapter

The `SupabaseSyncAdapter` is the production-grade adapter for Authentik ↔ Supabase integration:

```ts
import { createClient } from "@supabase/supabase-js";
import { createSupabaseSyncAdapter } from "@edcalderon/auth/authentik";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const adapter = createSupabaseSyncAdapter(supabase, {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // Optional overrides:
  createShadowAuthUser: true,      // default: true
  rollbackOnFailure: true,          // default: true
  upsertRpcName: "upsert_oidc_user",       // default
  linkShadowRpcName: "link_shadow_auth_user", // default
});
```

### Configuration (SupabaseSyncConfig)

```ts
interface SupabaseSyncConfig {
  /** Supabase project URL. */
  supabaseUrl: string;
  /** Supabase service_role key (server-side only). */
  supabaseServiceRoleKey: string;
  /** RPC name for upserting into public.users. Default: "upsert_oidc_user". */
  upsertRpcName?: string;
  /** RPC name for linking shadow auth user. Default: "link_shadow_auth_user". */
  linkShadowRpcName?: string;
  /** Whether to create a shadow auth.users record. Default: true. */
  createShadowAuthUser?: boolean;
  /** Default OIDC issuer when payload.iss is not provided. */
  defaultIssuer?: string;
  /** Whether to rollback on failure. Default: true. */
  rollbackOnFailure?: boolean;
}
```

### Sync Flow

1. **Normalize payload** — Lowercase email, resolve display name from multiple claim fields (`name`, `preferred_username`, email prefix), apply default issuer.

2. **Ensure shadow `auth.users`** (when `createShadowAuthUser: true`):
   - Search for existing record using identity-first matching
   - If found and metadata needs updating (e.g. email matched but OIDC identity not set), update the record
   - If not found, create a new shadow user with `role: "authenticated"`

3. **Upsert `public.users`** via `upsert_oidc_user()` RPC:
   - Inserts or updates the application user record keyed by `(sub, iss)`
   - Merges `raw_claims` JSONB (additive, never destructive)
   - `email_verified` flag ORs (once verified, stays verified)

4. **Link shadow** via `link_shadow_auth_user()` RPC:
   - Updates `public.users` to set `shadow_auth_user_id` and `shadow_linked_at`
   - Enables cross-table joins between `public.users` and `auth.users`

---

## Rollback Behavior

The adapter includes automatic rollback for newly created shadow `auth.users` rows when downstream sync fails:

```
Shadow auth.users created → upsert_oidc_user() RPC fails → Shadow deleted
Shadow auth.users created → link_shadow_auth_user() RPC fails → Shadow deleted
```

**Key details:**

- Rollback only applies to **newly created** shadow records (`authUserCreated: true`)
- Pre-existing shadow records matched by identity or email are **never** deleted on failure
- Rollback is **best-effort** — if the delete fails, the original error is still returned
- Controlled by `rollbackOnFailure` config (default: `true`)

This prevents orphaned `auth.users` records from accumulating when the downstream `public.users` sync fails.

---

## SQL Migrations

The provisioning model requires two SQL migrations applied to your Supabase project:

### Migration 001: `001_create_app_users.sql`

Creates the `public.users` table and `upsert_oidc_user()` RPC:

- Table keyed by `(sub, iss)` unique constraint
- `upsert_oidc_user()` — security-definer RPC restricted to `service_role`
- Indexes on `email` (lowercase) and `provider`
- Auto-updating `updated_at` trigger

### Migration 003: `003_authentik_shadow_auth_users.sql`

Adds shadow auth user support:

- `shadow_auth_user_id` (uuid) column on `public.users`
- `shadow_linked_at` (timestamptz) column on `public.users`
- Index on `shadow_auth_user_id` for lookup
- `link_shadow_auth_user()` RPC — links a `public.users` row to its shadow `auth.users` record

**Applying migrations:**

```bash
# Copy migrations to your Supabase project
cp packages/auth/supabase/migrations/001_create_app_users.sql \
   supabase/migrations/

cp packages/auth/supabase/migrations/003_authentik_shadow_auth_users.sql \
   supabase/migrations/

# Apply
supabase db push
```

### `link_shadow_auth_user()` RPC

This RPC is called by `SupabaseSyncAdapter` after creating or finding the shadow `auth.users` record:

```sql
function link_shadow_auth_user(
  p_sub                text,    -- OIDC subject identifier
  p_iss                text,    -- OIDC issuer URL
  p_shadow_auth_user_id uuid    -- Supabase auth.users ID
) returns public.users
```

- **Security:** `SECURITY DEFINER` — requires `service_role` caller
- **Behavior:** Updates `shadow_auth_user_id` and `shadow_linked_at` on the `public.users` row matching `(p_sub, p_iss)`
- **Error:** Raises exception if no matching `public.users` row is found

---

## Runtime Requirements

Server-side provisioning requires these environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role JWT key |

The `service_role` key grants admin access to the Supabase Admin API, which is needed to:
- List, create, update, and delete `auth.users` records
- Call security-definer RPCs that check for `service_role` in JWT claims

> ⚠️ **Security:** The `service_role` key must never be exposed to the client. Provisioning must run exclusively in server-side code (API routes, server components, edge functions).

---

## Startup Validation

Use `validateFullConfig()` at application startup to detect misconfigurations before users attempt to log in:

```ts
import { validateFullConfig } from "@edcalderon/auth/authentik";

const result = validateFullConfig(
  {
    issuer: process.env.AUTHENTIK_ISSUER,
    clientId: process.env.AUTHENTIK_CLIENT_ID,
    redirectUri: process.env.AUTHENTIK_REDIRECT_URI,
    tokenEndpoint: endpoints.token,
    userinfoEndpoint: endpoints.userinfo,
  },
  {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
);

if (!result.valid) {
  for (const check of result.checks.filter(c => !c.passed)) {
    console.error(`[config] ${check.name}: ${check.message}`);
  }
  // In production, fail fast:
  throw new Error("Configuration validation failed — check environment variables");
}
```

### The `supabase_not_configured` Error

When Supabase URL or service role key is missing, the validation emits the `supabase_not_configured` error signature:

```
supabase_not_configured: Supabase URL is required for sync
supabase_not_configured: Supabase service_role key is required for sync
```

This matches the CIG convention for detecting unconfigured Supabase environments. Use this error code to:
- Gate provisioning routes at deploy time
- Show a clear diagnostic in health-check endpoints
- Prevent partial deployments where OIDC is configured but Supabase is not

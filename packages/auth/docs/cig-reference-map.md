# CIG Reference Implementation Map

> **Package:** `@edcalderon/auth/authentik` (v1.4.0+)

This document maps each module in `@edcalderon/auth/authentik` back to its origin in the [ComputeIntelligenceGraph (CIG)](https://github.com/edwardcalderon/ComputeIntelligenceGraph) codebase. Use these links to trace design decisions and understand the production context that shaped each module.

---

## Architecture Reference

| Document | Link | Description |
|----------|------|-------------|
| CIG Auth Architecture | [docs/authentication/README.md](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/docs/authentication/README.md) | Top-level auth architecture document covering the federated OAuth strategy, provider model, and session management design |
| CIG Auth Package | [packages/auth/](https://github.com/edwardcalderon/ComputeIntelligenceGraph/tree/main/packages/auth) | The original monorepo auth package that `@edcalderon/auth` generalizes |

---

## Module-to-CIG Origin Map

### Relay (`relay.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `createRelayPageHtml()` | [`apps/dashboard/app/auth/login/[provider]/route.ts`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/auth/login/%5Bprovider%5D/route.ts) |
| `parseRelayParams()` | Same route — query parameter parsing logic |
| `readRelayStorage()` | [`apps/dashboard/app/auth/callback/page.tsx`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/auth/callback/page.tsx) — sessionStorage read on callback |
| `clearRelayStorage()` | Same callback page — cleanup after successful exchange |

**Design context:** The CIG dashboard lives on a different origin than the CIG landing page. The relay pattern was created to bridge PKCE sessionStorage across origins without requiring a shared backend session.

### Callback (`callback.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `exchangeCode()` | [`apps/dashboard/app/auth/callback/page.tsx`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/auth/callback/page.tsx) — token exchange logic |
| `fetchClaims()` | Same callback page — userinfo fetch after token exchange |
| `processCallback()` | Combines callback + [`apps/dashboard/app/api/auth/sync/route.ts`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/api/auth/sync/route.ts) — the full exchange + sync pipeline |

**Design context:** In CIG, the callback page exchanges the code client-side, then calls the sync API route server-side. The package's `processCallback()` unifies this into a single server-safe function with an optional provisioning gate.

### Logout (`logout.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `revokeToken()` | [`apps/landing/components/AuthProvider.tsx`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/landing/components/AuthProvider.tsx) — `signOut()` method, token revocation step |
| `buildEndSessionUrl()` | Same AuthProvider — end-session URL construction |
| `orchestrateLogout()` | Same AuthProvider — the combined revoke + redirect sequence |

**Design context:** The CIG landing page handles logout for users who authenticated via Authentik. The package extracts this into a framework-agnostic orchestrator that works in any server or client context.

### Provisioning (`provisioning.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `SupabaseSyncAdapter` | [`apps/dashboard/app/api/auth/sync/route.ts`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/api/auth/sync/route.ts) + [`apps/dashboard/lib/authSync.ts`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/lib/authSync.ts) |
| `normalizePayload()` | `authSync.ts` — payload normalization before Supabase upsert |
| `findShadowAuthUser()` (internal) | `authSync.ts` — paginated identity-first user search |
| `ensureShadowAuthUser()` (internal) | `authSync.ts` — shadow auth.users create/update logic |
| `NoopProvisioningAdapter` | New in package — no CIG equivalent (CIG always syncs) |
| `createProvisioningAdapter()` | New in package — factory pattern for custom adapters |
| `createSupabaseSyncAdapter()` | New in package — convenience wrapper around `SupabaseSyncAdapter` |

**Design context:** The CIG sync route is the most battle-tested part of the auth system. It handles the identity-first matching strategy, shadow auth.users creation, rollback on failure, and the `link_shadow_auth_user()` RPC call. The package preserves all these behaviors.

### Config Validation (`config.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `validateAuthentikConfig()` | CIG startup checks (distributed across components) |
| `validateSupabaseSyncConfig()` | [`apps/dashboard/app/api/auth/sync/route.ts`](https://github.com/edwardcalderon/ComputeIntelligenceGraph/blob/main/apps/dashboard/app/api/auth/sync/route.ts) — `supabase_not_configured` error handling |
| `validateFullConfig()` | New in package — combines both validations |
| `discoverEndpoints()` | CIG deployment scripts — `.well-known/openid-configuration` fetching |

**Design context:** The `supabase_not_configured` error code comes directly from CIG's sync route, where a missing Supabase configuration causes the sync to fail immediately with a clear diagnostic.

### Safe Redirect (`redirect.ts`)

| Package Module | CIG Origin |
|---------------|------------|
| `resolveSafeRedirect()` | CIG callback + logout redirect patterns — origin allowlist validation |

**Design context:** Both the CIG callback page and logout flow validate redirect targets against an allowlist to prevent open-redirect attacks. The package extracts this into a reusable utility.

### Types (`types.ts`)

| Package Type | CIG Origin |
|-------------|------------|
| `AuthentikProvider` | CIG provider slug constants |
| `AuthentikEndpoints` | CIG OIDC endpoint configuration |
| `AuthentikRelayConfig` | CIG relay route configuration |
| `AuthentikCallbackConfig` | CIG callback page configuration |
| `AuthentikLogoutConfig` | CIG AuthProvider logout configuration |
| `ProvisioningPayload` | CIG `OidcSyncPayload` from `authSync.ts` |
| `ProvisioningResult` | CIG sync response shape |
| `SupabaseSyncConfig` | CIG sync route environment configuration |

### SQL Migrations

| Migration | CIG Origin |
|-----------|------------|
| `001_create_app_users.sql` | CIG Supabase migration — `public.users` table + `upsert_oidc_user()` RPC |
| `002_sync_auth_users_to_app_users.sql` | CIG Supabase migration — `auth.users` → `public.users` sync trigger |
| `003_authentik_shadow_auth_users.sql` | CIG `authSync.ts` — shadow linkage columns + `link_shadow_auth_user()` RPC |

---

## Summary

The `@edcalderon/auth/authentik` package is a direct generalization of the CIG production Authentik integration. Every module preserves the battle-tested behavior from CIG while making it configurable and reusable across projects.

Key design decisions traced back to CIG:

1. **Fail-closed provisioning** — users cannot access the app until sync succeeds (CIG sync route)
2. **Identity-first matching** — prevents email-based account takeover (CIG `authSync.ts`)
3. **Shadow auth.users** — enables Supabase RLS without Supabase Auth signup (CIG sync route)
4. **Rollback on failure** — prevents orphaned shadow records (CIG sync route)
5. **Cross-origin PKCE relay** — bridges sessionStorage across origins (CIG landing → dashboard)
6. **Direct social login** — one button per provider via Authentik Sources (CIG landing page)

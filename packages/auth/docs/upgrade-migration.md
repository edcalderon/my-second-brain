# Upgrade & Migration Guide

> **Package:** `@edcalderon/auth` v1.3.0 → v1.4.0

This document covers the upgrade path from v1.3.0 to v1.4.0 and provides migration notes for teams adopting the new Authentik integration kit.

---

## Table of Contents

1. [Upgrade Summary](#upgrade-summary)
2. [What Changed in v1.4.0](#what-changed-in-v140)
3. [Upgrade Steps](#upgrade-steps)
4. [Impact on Existing Imports](#impact-on-existing-imports)
5. [Migrating Custom Relay/Callback/Logout Code](#migrating-custom-relaycallbacklogout-code)
6. [SQL Migration Path](#sql-migration-path)

---

## Upgrade Summary

**v1.4.0 is fully additive.** There are no breaking changes to existing `@edcalderon/auth` exports. All existing imports, types, and behavior remain unchanged.

| Aspect | Impact |
|--------|--------|
| Existing `@edcalderon/auth` imports | ✅ No changes required |
| Existing `@edcalderon/auth/supabase` imports | ✅ No changes required |
| Existing `@edcalderon/auth/firebase-*` imports | ✅ No changes required |
| Existing `@edcalderon/auth/hybrid-*` imports | ✅ No changes required |
| New subpath `@edcalderon/auth/authentik` | 🆕 Opt-in only |
| SQL migrations 001-002 | ✅ Unchanged |
| SQL migration 003 | 🆕 Optional, only needed for shadow auth user support |

---

## What Changed in v1.4.0

### New Subpath Export: `@edcalderon/auth/authentik`

v1.4.0 adds a new subpath export that provides a complete Authentik flow and provisioning kit:

```ts
import {
  // Relay (cross-origin PKCE)
  createRelayPageHtml, parseRelayParams, readRelayStorage, clearRelayStorage,
  // Callback (token exchange + provisioning gate)
  exchangeCode, fetchClaims, processCallback,
  // Logout (token revocation + RP-initiated logout)
  revokeToken, buildEndSessionUrl, orchestrateLogout,
  // Provisioning adapters
  NoopProvisioningAdapter, createProvisioningAdapter,
  SupabaseSyncAdapter, createSupabaseSyncAdapter,
  // Config validation
  validateAuthentikConfig, validateSupabaseSyncConfig, validateFullConfig,
  discoverEndpoints,
  // Safe redirect
  resolveSafeRedirect,
} from "@edcalderon/auth/authentik";
```

This subpath is completely independent — importing from `@edcalderon/auth/authentik` does not affect any other subpath exports.

### New SQL Migration

`003_authentik_shadow_auth_users.sql` adds shadow auth user columns and the `link_shadow_auth_user()` RPC to `public.users`. This migration is **optional** and only needed if you use the `SupabaseSyncAdapter` with shadow auth users enabled (the default).

### New Tests

96 tests across 6 test suites covering all new functionality.

---

## Upgrade Steps

### 1. Update the Package

```bash
npm install @edcalderon/auth@1.4.0
# or
pnpm add @edcalderon/auth@1.4.0
```

### 2. Verify Existing Functionality

Your existing code should work exactly as before. No changes to existing imports or configuration are required.

### 3. (Optional) Adopt the Authentik Kit

If you want to use the new Authentik integration:

1. Set up your Authentik resources — see the [Authentik Integration Guide](./authentik-integration-guide.md)
2. Apply SQL migration 003 if using Supabase provisioning — see [SQL Migration Path](#sql-migration-path)
3. Create your relay, callback, and logout routes — see [Next.js Examples](./nextjs-examples.md)

---

## Impact on Existing Imports

### Unaffected Imports

All of these continue to work without any changes:

```ts
// Core (unchanged)
import { AuthProvider, useAuth } from "@edcalderon/auth";
import type { AuthClient, User, SignInOptions } from "@edcalderon/auth";

// Supabase adapter (unchanged)
import { SupabaseClient } from "@edcalderon/auth/supabase";

// Firebase adapters (unchanged)
import { FirebaseWebClient } from "@edcalderon/auth/firebase-web";
import { FirebaseNativeClient } from "@edcalderon/auth/firebase-native";

// Hybrid adapters (unchanged)
import { HybridWebClient } from "@edcalderon/auth/hybrid-web";
import { HybridNativeClient } from "@edcalderon/auth/hybrid-native";
```

### New Import (Opt-in)

The Authentik kit is available via a new subpath:

```ts
import { processCallback, orchestrateLogout } from "@edcalderon/auth/authentik";
```

This import is independent of all other subpaths. You can use it alongside any existing adapter configuration.

---

## Migrating Custom Relay/Callback/Logout Code

If your app already has custom Authentik relay, callback, or logout code (e.g. copied from CIG), you can migrate it to use the package's standardized implementations.

### Relay Migration

**Before** (custom implementation):

```ts
// app/auth/login/[provider]/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  // ... custom PKCE generation, sessionStorage manipulation, redirect logic
}
```

**After** (using the package):

```ts
// app/auth/login/[provider]/route.ts
import { parseRelayParams, createRelayPageHtml } from "@edcalderon/auth/authentik";

export async function GET(request: Request) {
  const params = parseRelayParams(new URL(request.url).searchParams);
  if (!params) return new Response("Missing relay params", { status: 400 });

  const { html } = createRelayPageHtml(relayConfig, params);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

### Callback Migration

**Before** (custom implementation):

```ts
// Manual token exchange, userinfo fetch, state validation, provisioning
const tokens = await customExchangeCode(code, verifier);
const claims = await customFetchUserInfo(tokens.access_token);
await customSyncUser(claims);
```

**After** (using the package):

```ts
import { processCallback } from "@edcalderon/auth/authentik";

const result = await processCallback({
  config: callbackConfig,
  code,
  codeVerifier: verifier,
  state,
  expectedState,
  provider,
  provisioningAdapter: adapter, // optional
});

if (!result.success) {
  // Structured error handling
  console.error(result.errorCode, result.error);
}
```

### Logout Migration

**Before** (custom implementation):

```ts
// Manual token revocation, end-session URL construction
await fetch(revocationEndpoint, { method: "POST", body: new URLSearchParams({ token }) });
const logoutUrl = `${endSessionEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${redirectUri}`;
window.location.href = logoutUrl;
```

**After** (using the package):

```ts
import { orchestrateLogout } from "@edcalderon/auth/authentik";

const { endSessionUrl, tokenRevoked } = await orchestrateLogout(logoutConfig, {
  accessToken,
  idToken,
});

// Navigate to Authentik to clear the session
window.location.href = endSessionUrl;
```

---

## SQL Migration Path

### If you already have migrations 001-002 applied

Migration 003 is **additive** — it adds new columns to `public.users` without modifying existing ones:

```bash
cp packages/auth/supabase/migrations/003_authentik_shadow_auth_users.sql \
   supabase/migrations/

supabase db push
```

### If you are starting fresh

Apply all migrations in order:

```bash
cp packages/auth/supabase/migrations/001_create_app_users.sql \
   packages/auth/supabase/migrations/003_authentik_shadow_auth_users.sql \
   supabase/migrations/

# Optionally also copy 002 if you want the auth.users → public.users trigger
cp packages/auth/supabase/migrations/002_sync_auth_users_to_app_users.sql \
   supabase/migrations/

supabase db push
```

### If you do not use Supabase provisioning

You do not need migration 003. The Authentik kit works without Supabase — use `NoopProvisioningAdapter` or a custom adapter for your backend.

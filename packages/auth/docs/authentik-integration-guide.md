# Authentik Integration Guide

> **Package:** `@edcalderon/auth/authentik` (v1.4.0+)
> **Runtime:** Server-side (Next.js App Router, Node.js)

This guide walks through setting up Authentik as your OIDC identity provider with the `@edcalderon/auth/authentik` package. By the end you will have a working social-login flow (e.g. Google, GitHub, Discord) that authenticates via Authentik and optionally provisions users into a Supabase-backed user store.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentik Resource Setup](#authentik-resource-setup)
   - [OIDC Application & Provider](#1-oidc-application--provider)
   - [Social Login Sources](#2-social-login-sources)
   - [Invalidation / Logout Flow](#3-invalidation--logout-flow)
3. [Direct Social Login (Default Pattern)](#direct-social-login-default-pattern)
4. [Source Configuration: Identifier-Based Matching](#source-configuration-identifier-based-matching)
5. [Slug and Redirect URI Contract](#slug-and-redirect-uri-contract)
6. [Environment Variables](#environment-variables)
7. [Endpoint Discovery](#endpoint-discovery)
8. [Config Validation](#config-validation)

---

## Prerequisites

- An Authentik instance (self-hosted or managed) running **2024.x** or later.
- A registered OIDC Application in Authentik.
- At least one social-login Source (Google, GitHub, Discord, etc.) configured in Authentik.
- `@edcalderon/auth` v1.4.0 or later installed in your project.

```bash
npm install @edcalderon/auth
# or
pnpm add @edcalderon/auth
```

---

## Authentik Resource Setup

### 1. OIDC Application & Provider

Create an **OAuth2/OIDC Provider** and link it to an **Application** in Authentik:

| Setting | Value | Notes |
|---------|-------|-------|
| **Provider type** | OAuth2/OIDC | Required for PKCE support |
| **Client type** | Public | SPA/Next.js apps cannot keep client secrets |
| **Client ID** | (auto-generated) | Copy this — used in package config |
| **Redirect URIs** | `https://app.example.com/auth/callback` | Must exactly match `redirectUri` in package config |
| **Signing key** | Select a signing key | Required for ID token validation |
| **Scopes** | `openid profile email` | Default scopes for the package |
| **PKCE** | Enabled | The package always uses S256 PKCE |

**Application settings:**
- **Slug**: e.g. `my-app` — this determines your issuer URL
- **Launch URL**: your application's landing page

Your issuer URL follows the pattern:

```
https://<authentik-host>/application/o/<app-slug>/
```

> **Important:** Authentik places most OIDC endpoints (token, userinfo, authorize, revocation) at the `/application/o/` level, _not_ under the per-app issuer path. For example:
> - Issuer: `https://auth.example.com/application/o/my-app/`
> - Token endpoint: `https://auth.example.com/application/o/token/`
>
> Always use [`discoverEndpoints()`](#endpoint-discovery) or supply explicit URLs — do not guess from the issuer.

### 2. Social Login Sources

For each social provider (Google, GitHub, Discord, etc.), create a **Source** in Authentik:

1. Navigate to **Directory → Federation & Social Login → Sources**
2. Create a new **OAuth Source** for your provider (e.g. Google)
3. Configure the upstream OAuth credentials (Client ID/Secret from the provider's developer console)
4. Set the **Slug** — e.g. `google`, `github`, `discord`

The slug determines the social login URL pattern:

```
https://<authentik-host>/source/oauth/login/<source-slug>/
```

This is the **direct social login** pattern — the default and recommended approach (see below).

### 3. Invalidation / Logout Flow

For RP-initiated logout to work, your Authentik Provider needs an **invalidation flow**:

1. Navigate to **Flows & Stages → Flows**
2. Create a new flow with designation **Invalidation**
3. Add a **User Logout** stage — this clears the Authentik browser session
4. Add a **Redirect** stage after the logout stage — configure it to redirect to your `postLogoutRedirectUri`
5. Bind this flow as the **Invalidation Flow** on your OAuth2/OIDC Provider

Without this flow, `orchestrateLogout()` will be unable to clear the Authentik session, and users will remain logged in on the Authentik side.

**Example flow structure:**

```
Invalidation Flow: "my-app-logout"
  ├── Stage 1: User Logout
  └── Stage 2: Redirect → https://app.example.com/
```

---

## Direct Social Login (Default Pattern)

The package defaults to **direct social login** — one button per provider, each button triggers a provider-specific Source flow. This is the recommended approach.

**How it works:**

1. User clicks "Sign in with Google" in your app
2. The relay handler redirects to Authentik's source-based login URL:
   ```
   https://auth.example.com/source/oauth/login/google/?next=<authorize-url>
   ```
3. Authentik handles the upstream OAuth flow (Google consent screen, etc.)
4. Authentik redirects back to your OIDC authorize endpoint with an authorization code
5. Your callback handler exchanges the code for tokens

**In code** (relay configuration):

```ts
import { createRelayPageHtml, parseRelayParams } from "@edcalderon/auth/authentik";

// The relay config — no providerFlowSlugs means direct social login
const relayConfig = {
  issuer: "https://auth.example.com/application/o/my-app/",
  clientId: "your-client-id",
  redirectUri: "https://app.example.com/auth/callback",
  authorizePath: "https://auth.example.com/application/o/authorize/",
};
```

When `providerFlowSlugs` is **not** provided, the relay automatically uses the source-based login URL (`/source/oauth/login/{provider}/`). This is the simplest and most common setup.

**Custom flow slugs** (advanced): If you need custom authentication flows per provider (e.g. flows with additional stages like MFA), map provider names to flow slugs:

```ts
const relayConfig = {
  // ...base config
  providerFlowSlugs: {
    google: "my-app-google-mfa-flow",
    github: "my-app-github-flow",
  },
};
```

This routes through `/if/flow/{flowSlug}/` instead of `/source/oauth/login/{provider}/`.

---

## Source Configuration: Identifier-Based Matching

When configuring Sources in Authentik, use **identifier-based matching** as the safe default:

| Setting | Recommended Value | Why |
|---------|-------------------|-----|
| **User matching mode** | `identifier` | Prevents account takeover via email changes |
| **User path** | Leave as default | Standard user directory |

**Why identifier-based matching?**

- **Email-based matching** is risky: if an upstream provider allows users to change their email, a different person could receive tokens for an existing account.
- **Identifier-based matching** uses the stable OIDC `sub` claim from the upstream provider — this never changes for a given user.
- The package's `SupabaseSyncAdapter` mirrors this safety by using identity-first matching (see [Provisioning Model](./provisioning-model.md)).

---

## Slug and Redirect URI Contract

The package relies on a strict contract between your Authentik tenant configuration and your package config:

| Package Config | Authentik Resource | Must Match |
|---------------|-------------------|------------|
| `issuer` | Application slug | `https://<host>/application/o/<app-slug>/` |
| `clientId` | Provider Client ID | Exact string match |
| `redirectUri` | Provider Redirect URIs | Exact URL match (including path, no trailing slash difference) |
| `authorizePath` | Discovered or manual | `https://<host>/application/o/authorize/` |
| `tokenEndpoint` | Discovered or manual | `https://<host>/application/o/token/` |
| `userinfoEndpoint` | Discovered or manual | `https://<host>/application/o/userinfo/` |
| `endSessionEndpoint` | Discovered or manual | `https://<host>/application/o/<app-slug>/end-session/` |
| `revocationEndpoint` | Discovered or manual | `https://<host>/application/o/<app-slug>/revoke/` |
| Provider slug in relay | Source slug | e.g. `google` maps to Source with slug `google` |

> **Tip:** Use `discoverEndpoints()` to automatically resolve all endpoint URLs from the `.well-known/openid-configuration` document. This avoids manual URL construction errors.

---

## Environment Variables

The package reads configuration from environment variables or direct config objects. Here are the required variables for server-side usage:

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTHENTIK_ISSUER` | Authentik issuer URL | `https://auth.example.com/application/o/my-app/` |
| `AUTHENTIK_CLIENT_ID` | OAuth2 provider Client ID | `abc123def456` |
| `AUTHENTIK_REDIRECT_URI` | Callback URL registered in Authentik | `https://app.example.com/auth/callback` |

For Supabase provisioning (server-side only):

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | `eyJ...` (long JWT) |

> ⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.** Provisioning must run server-side only.

---

## Endpoint Discovery

Use `discoverEndpoints()` to automatically fetch all OIDC endpoints from Authentik:

```ts
import { discoverEndpoints } from "@edcalderon/auth/authentik";

const endpoints = await discoverEndpoints(
  "https://auth.example.com/application/o/my-app/"
);

// endpoints.authorization → "https://auth.example.com/application/o/authorize/"
// endpoints.token         → "https://auth.example.com/application/o/token/"
// endpoints.userinfo      → "https://auth.example.com/application/o/userinfo/"
// endpoints.revocation    → "https://auth.example.com/application/o/<app>/revoke/"
// endpoints.endSession    → "https://auth.example.com/application/o/<app>/end-session/"
```

This fetches the `.well-known/openid-configuration` document from the issuer and extracts the endpoint URLs. It is recommended to call this once at startup and cache the result.

---

## Config Validation

Run config validation at startup to catch misconfigurations before the first user attempts to log in:

```ts
import {
  validateAuthentikConfig,
  validateSupabaseSyncConfig,
  validateFullConfig,
} from "@edcalderon/auth/authentik";

// Validate Authentik OIDC config only
const authentikResult = validateAuthentikConfig({
  issuer: process.env.AUTHENTIK_ISSUER,
  clientId: process.env.AUTHENTIK_CLIENT_ID,
  redirectUri: process.env.AUTHENTIK_REDIRECT_URI,
  tokenEndpoint: endpoints.token,
  userinfoEndpoint: endpoints.userinfo,
});

if (!authentikResult.valid) {
  console.error("Authentik config errors:", authentikResult.checks.filter(c => !c.passed));
  process.exit(1);
}

// Validate both Authentik + Supabase config together
const fullResult = validateFullConfig(
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

if (!fullResult.valid) {
  // Checks will include "supabase_not_configured" error code when
  // Supabase URL or service role key is missing
  console.error("Config validation failed:", fullResult.checks.filter(c => !c.passed));
}
```

The `supabase_not_configured` error code is emitted when Supabase URL or service role key is missing — this matches the CIG convention for detecting unconfigured environments at deploy time.

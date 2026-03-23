# Next.js Reference Examples

> **Package:** `@edcalderon/auth/authentik` (v1.4.0+)
> **Framework:** Next.js 14/15 App Router

This document provides complete, copy-paste-ready Next.js examples for every common Authentik integration pattern. Each example builds on the previous one.

---

## Table of Contents

1. [Shared Configuration](#shared-configuration)
2. [Example 1: Same-Origin Login + Callback](#example-1-same-origin-login--callback)
3. [Example 2: Cross-Origin Login via Relay](#example-2-cross-origin-login-via-relay)
4. [Example 3: Supabase Provisioning Adapter](#example-3-supabase-provisioning-adapter)
5. [Example 4: Full Integrated Flow (Authentik + Supabase + Sync)](#example-4-full-integrated-flow-authentik--supabase--sync)
6. [Example 5: Logout with Authentik Invalidation](#example-5-logout-with-authentik-invalidation)

---

## Shared Configuration

All examples use this shared configuration module:

```ts
// lib/authentik-config.ts
import {
  discoverEndpoints,
  validateFullConfig,
  type AuthentikEndpoints,
} from "@edcalderon/auth/authentik";

// Cache endpoints at module level (resolved once at startup)
let _endpoints: AuthentikEndpoints | null = null;

export async function getEndpoints(): Promise<AuthentikEndpoints> {
  if (!_endpoints) {
    _endpoints = await discoverEndpoints(process.env.AUTHENTIK_ISSUER!);
  }
  return _endpoints;
}

export function getAuthentikConfig() {
  return {
    issuer: process.env.AUTHENTIK_ISSUER!,
    clientId: process.env.AUTHENTIK_CLIENT_ID!,
    redirectUri: process.env.AUTHENTIK_REDIRECT_URI!,
  };
}

// Run at app startup (e.g. in instrumentation.ts)
export async function validateConfig() {
  const endpoints = await getEndpoints();
  const result = validateFullConfig(
    {
      ...getAuthentikConfig(),
      tokenEndpoint: endpoints.token,
      userinfoEndpoint: endpoints.userinfo,
    },
    {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  );

  if (!result.valid) {
    const errors = result.checks.filter((c) => !c.passed);
    console.error("[authentik] Config validation failed:", errors);
    throw new Error("Authentik configuration is invalid");
  }
}
```

**Required `.env.local`:**

```env
AUTHENTIK_ISSUER=https://auth.example.com/application/o/my-app/
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_REDIRECT_URI=https://app.example.com/auth/callback

# For Supabase provisioning (Examples 3-5)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Example 1: Same-Origin Login + Callback

The simplest pattern: login page and callback handler on the same Next.js app.

### Login Page

```tsx
// app/login/page.tsx
"use client";

import { useState } from "react";

/**
 * Generate PKCE parameters client-side, store in sessionStorage,
 * and redirect to Authentik.
 */
async function startLogin(provider: string) {
  // Generate PKCE
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const state = crypto.randomUUID();

  // Store in sessionStorage for the callback
  sessionStorage.setItem("authentik_relay:verifier", codeVerifier);
  sessionStorage.setItem("authentik_relay:state", state);
  sessionStorage.setItem("authentik_relay:provider", provider);

  // Build authorize URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_AUTHENTIK_REDIRECT_URI!,
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  // Redirect to Authentik social login source
  const issuerOrigin = new URL(process.env.NEXT_PUBLIC_AUTHENTIK_ISSUER!).origin;
  const authorizeUrl = `${issuerOrigin}/application/o/authorize/?${params}`;
  const loginUrl = `${issuerOrigin}/source/oauth/login/${provider}/?next=${encodeURIComponent(authorizeUrl)}`;

  window.location.href = loginUrl;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <h1>Sign In</h1>
      <button
        disabled={loading}
        onClick={() => { setLoading(true); startLogin("google"); }}
      >
        Sign in with Google
      </button>
      <button
        disabled={loading}
        onClick={() => { setLoading(true); startLogin("github"); }}
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
```

### Callback Page

```tsx
// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { readRelayStorage, clearRelayStorage } from "@edcalderon/auth/authentik";

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code || !state) {
        setError("Missing code or state in callback URL");
        return;
      }

      // Read PKCE params from sessionStorage
      const relay = readRelayStorage(sessionStorage);
      if (!relay) {
        setError("Missing relay data in sessionStorage — did the login flow complete?");
        return;
      }

      // Validate state
      if (state !== relay.state) {
        setError("State mismatch — possible CSRF attack");
        return;
      }

      // Exchange code for tokens via server-side API route
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          codeVerifier: relay.codeVerifier,
          state,
          provider: relay.provider,
        }),
      });

      const result = await response.json();

      // Clean up relay storage
      clearRelayStorage(sessionStorage);

      if (!result.success) {
        setError(result.error || "Authentication failed");
        return;
      }

      // Redirect to the app
      router.push(relay.next || "/dashboard");
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return <div><h1>Authentication Error</h1><p>{error}</p></div>;
  }

  return <div><p>Completing sign-in…</p></div>;
}
```

### Server-Side API Route

```ts
// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { processCallback } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";

export async function POST(request: Request) {
  const { code, codeVerifier, state, provider } = await request.json();

  const endpoints = await getEndpoints();
  const config = getAuthentikConfig();

  const result = await processCallback({
    config: {
      ...config,
      tokenEndpoint: endpoints.token,
      userinfoEndpoint: endpoints.userinfo,
    },
    code,
    codeVerifier,
    state,
    expectedState: state, // In same-origin, client validates state
    provider,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, errorCode: result.errorCode },
      { status: 400 },
    );
  }

  // Set session cookie, store tokens, etc.
  // ... your session management logic here ...

  return NextResponse.json({ success: true });
}
```

---

## Example 2: Cross-Origin Login via Relay

When your landing page (login) and dashboard (callback) are on different origins — e.g. `https://landing.example.com` and `https://app.example.com`.

### Login Page (Landing Origin)

```tsx
// On landing.example.com
// app/login/page.tsx
"use client";

/**
 * Generate PKCE and redirect to the relay on the dashboard origin.
 * The relay stores PKCE params in the dashboard's sessionStorage.
 */
async function startCrossOriginLogin(provider: string) {
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const state = crypto.randomUUID();

  // Redirect to the relay route on the dashboard origin
  const relayUrl = new URL("https://app.example.com/auth/relay");
  relayUrl.searchParams.set("provider", provider);
  relayUrl.searchParams.set("code_verifier", codeVerifier);
  relayUrl.searchParams.set("code_challenge", codeChallenge);
  relayUrl.searchParams.set("state", state);
  relayUrl.searchParams.set("next", "/dashboard");

  window.location.href = relayUrl.toString();
}

export default function LoginPage() {
  return (
    <div>
      <h1>Welcome</h1>
      <button onClick={() => startCrossOriginLogin("google")}>
        Sign in with Google
      </button>
    </div>
  );
}
```

### Relay Route (Dashboard Origin)

```ts
// On app.example.com
// app/auth/relay/route.ts
import { parseRelayParams, createRelayPageHtml } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseRelayParams(url.searchParams);

  if (!params) {
    return new Response("Missing required relay parameters", { status: 400 });
  }

  const config = getAuthentikConfig();
  const endpoints = await getEndpoints();

  const { html } = createRelayPageHtml(
    {
      issuer: config.issuer,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      authorizePath: endpoints.authorization,
      // No providerFlowSlugs → uses direct social login by default
    },
    params,
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

### Callback Page (Dashboard Origin)

The callback page is identical to [Example 1's callback page](#callback-page) — it reads PKCE params from `sessionStorage` (which was populated by the relay page) and exchanges the code for tokens.

---

## Example 3: Supabase Provisioning Adapter

Adding user provisioning so that every authenticated user gets a `public.users` record and a shadow `auth.users` record.

### Server-Side Adapter Setup

```ts
// lib/provisioning.ts
import { createClient } from "@supabase/supabase-js";
import { createSupabaseSyncAdapter } from "@edcalderon/auth/authentik";

// Create a Supabase client with service_role key (server-side only)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const provisioningAdapter = createSupabaseSyncAdapter(supabaseAdmin, {
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  createShadowAuthUser: true,
  rollbackOnFailure: true,
});
```

### API Route with Provisioning

```ts
// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import { processCallback } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";
import { provisioningAdapter } from "@/lib/provisioning";

export async function POST(request: Request) {
  const { code, codeVerifier, state, provider } = await request.json();

  const endpoints = await getEndpoints();
  const config = getAuthentikConfig();

  const result = await processCallback({
    config: {
      ...config,
      tokenEndpoint: endpoints.token,
      userinfoEndpoint: endpoints.userinfo,
    },
    code,
    codeVerifier,
    state,
    expectedState: state,
    provider,
    // The provisioning adapter blocks until sync completes
    provisioningAdapter,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, errorCode: result.errorCode },
      { status: 400 },
    );
  }

  // At this point, the user is guaranteed to exist in:
  // - public.users (with their OIDC identity)
  // - auth.users (shadow record, if enabled)
  const { authUserId, authUserCreated } = result.provisioningResult || {};

  return NextResponse.json({
    success: true,
    authUserId,
    isNewUser: authUserCreated,
  });
}
```

---

## Example 4: Full Integrated Flow (Authentik + Supabase + Sync)

A complete example combining cross-origin relay, Supabase provisioning, and mandatory sync before redirect.

### File Structure

```
app/
├── auth/
│   ├── relay/route.ts          # Cross-origin relay handler
│   ├── callback/page.tsx       # Client callback page
│   └── error/page.tsx          # Error display page
├── api/auth/
│   ├── callback/route.ts       # Server-side token exchange + provisioning
│   └── validate/route.ts       # Health check endpoint
├── dashboard/page.tsx          # Protected page
└── layout.tsx
lib/
├── authentik-config.ts         # Shared config (from above)
└── provisioning.ts             # Supabase adapter (from above)
```

### Relay Route

```ts
// app/auth/relay/route.ts
import { parseRelayParams, createRelayPageHtml } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseRelayParams(url.searchParams);

  if (!params) {
    return new Response("Missing required relay parameters", { status: 400 });
  }

  const config = getAuthentikConfig();
  const endpoints = await getEndpoints();

  const { html } = createRelayPageHtml(
    {
      issuer: config.issuer,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      authorizePath: endpoints.authorization,
    },
    params,
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
```

### Server-Side Callback with Mandatory Sync

```ts
// app/api/auth/callback/route.ts
import { NextResponse } from "next/server";
import {
  processCallback,
  resolveSafeRedirect,
} from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";
import { provisioningAdapter } from "@/lib/provisioning";

export async function POST(request: Request) {
  const body = await request.json();
  const { code, codeVerifier, state, provider, next } = body;

  const endpoints = await getEndpoints();
  const config = getAuthentikConfig();

  // Process callback with mandatory provisioning
  const result = await processCallback({
    config: {
      ...config,
      tokenEndpoint: endpoints.token,
      userinfoEndpoint: endpoints.userinfo,
    },
    code,
    codeVerifier,
    state,
    expectedState: state,
    provider,
    provisioningAdapter, // Sync is mandatory — blocks until complete
  });

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status: 400 },
    );
  }

  // Resolve safe redirect (prevents open redirect attacks)
  const redirectTo = resolveSafeRedirect(next, {
    allowedOrigins: [
      process.env.NEXT_PUBLIC_APP_URL!,
    ],
    fallbackUrl: "/dashboard",
  });

  return NextResponse.json({
    success: true,
    redirectTo,
    claims: result.callbackResult?.claims,
    isNewUser: result.provisioningResult?.authUserCreated,
  });
}
```

### Client Callback Page

```tsx
// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { readRelayStorage, clearRelayStorage } from "@edcalderon/auth/authentik";

export default function CallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      if (!code || !state) {
        setError("Missing authorization code or state");
        return;
      }

      const relay = readRelayStorage(sessionStorage);
      if (!relay) {
        setError("Session expired — please sign in again");
        return;
      }

      if (state !== relay.state) {
        setError("Invalid session state — please sign in again");
        return;
      }

      setStatus("Syncing your account…");

      // Exchange code and run provisioning on the server
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          codeVerifier: relay.codeVerifier,
          state,
          provider: relay.provider,
          next: relay.next,
        }),
      });

      const result = await response.json();
      clearRelayStorage(sessionStorage);

      if (!result.success) {
        setError(result.error || "Authentication failed");
        return;
      }

      setStatus(result.isNewUser ? "Account created! Redirecting…" : "Redirecting…");
      router.push(result.redirectTo || "/dashboard");
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div>
        <h1>Sign-In Error</h1>
        <p>{error}</p>
        <a href="/login">Try again</a>
      </div>
    );
  }

  return <div><p>{status}</p></div>;
}
```

### Config Validation Health Check

```ts
// app/api/auth/validate/route.ts
import { NextResponse } from "next/server";
import { validateFullConfig } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";

export async function GET() {
  const endpoints = await getEndpoints();
  const config = getAuthentikConfig();

  const result = validateFullConfig(
    {
      ...config,
      tokenEndpoint: endpoints.token,
      userinfoEndpoint: endpoints.userinfo,
    },
    {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  );

  return NextResponse.json({
    valid: result.valid,
    checks: result.checks.map((c) => ({
      name: c.name,
      passed: c.passed,
      message: c.passed ? "OK" : c.message,
    })),
  });
}
```

---

## Example 5: Logout with Authentik Invalidation

Complete logout flow including token revocation and Authentik session clearing.

### Logout API Route

```ts
// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { orchestrateLogout } from "@edcalderon/auth/authentik";
import { getAuthentikConfig, getEndpoints } from "@/lib/authentik-config";

export async function POST(request: Request) {
  const { accessToken, idToken } = await request.json();

  const config = getAuthentikConfig();
  const endpoints = await getEndpoints();

  const result = await orchestrateLogout(
    {
      issuer: config.issuer,
      postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_URI || "/",
      endSessionEndpoint: endpoints.endSession!,
      revocationEndpoint: endpoints.revocation,
      clientId: config.clientId,
    },
    {
      accessToken,
      idToken,
    },
  );

  return NextResponse.json({
    endSessionUrl: result.endSessionUrl,
    tokenRevoked: result.tokenRevoked,
  });
}
```

### Logout Button Component

```tsx
// components/LogoutButton.tsx
"use client";

import { useState } from "react";

interface Props {
  accessToken?: string;
  idToken?: string;
}

export function LogoutButton({ accessToken, idToken }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    try {
      // 1. Clear app-local state BEFORE calling the logout API
      localStorage.removeItem("session");
      sessionStorage.clear();

      // 2. Call the server-side logout orchestrator
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, idToken }),
      });

      const { endSessionUrl } = await response.json();

      // 3. Navigate to Authentik to clear the SSO session
      // The invalidation flow will redirect back to postLogoutRedirectUri
      window.location.href = endSessionUrl;
    } catch {
      // Fallback: redirect to home even if logout API fails
      window.location.href = "/";
    }
  }

  return (
    <button onClick={handleLogout} disabled={loading}>
      {loading ? "Signing out…" : "Sign Out"}
    </button>
  );
}
```

### Authentik Invalidation Flow Requirements

For the logout flow to work correctly, your Authentik Provider must have an **invalidation flow** configured:

1. **Flow designation:** Invalidation
2. **Stage 1:** User Logout — clears the Authentik browser session
3. **Stage 2:** Redirect — sends the browser to your `postLogoutRedirectUri`

Without this flow, the `endSessionUrl` will fail to clear the Authentik session, leaving the user authenticated on the Authentik side. See the [Authentik Integration Guide](./authentik-integration-guide.md#3-invalidation--logout-flow) for setup details.

The `postLogoutRedirectUri` must be registered in your Authentik Provider's redirect URI configuration.

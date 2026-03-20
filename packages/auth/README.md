![Auth](https://img.shields.io/badge/%40edcalderon%2Fauth-Universal%20Auth%20Orchestrator-C8A84E?style=for-the-badge&labelColor=0d1117&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzRhZTBhMCI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDIgMC04LTMuNTgtOC04czMuNTgtOCA4LTggOCAzLjU4IDggOC0zLjU4IDgtOCA4eiIvPjwvc3ZnPg==)

[![npm version](https://img.shields.io/npm/v/@edcalderon/auth?style=for-the-badge&logo=npm&logoColor=white&labelColor=0d1117&color=C8A84E)](https://www.npmjs.com/package/@edcalderon/auth)
[![npm downloads](https://img.shields.io/npm/dm/@edcalderon/auth?style=for-the-badge&logo=npm&logoColor=white&labelColor=0d1117&color=10b981)](https://www.npmjs.com/package/@edcalderon/auth)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-C8A84E?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117)](https://github.com/edcalderon/my-second-brain/tree/main/packages/auth)
[![Web3](https://img.shields.io/badge/Web3-SIWE%20%7C%20SIWS-C8A84E?style=for-the-badge&logo=ethereum&logoColor=white&labelColor=0d1117)](https://supabase.com/docs/guides/auth/auth-web3)

A universal, **provider-agnostic** authentication orchestration package designed for absolute runtime portability. One abstraction that works flawlessly across React Web `(18.x/19.x)`, Next.js `(14/15)`, and React Native/Expo `(SDK 50+)`. 

Swap between Supabase, Firebase, Hybrid, or any custom provider without changing a single line of your UX component code.

---

## 📋 Latest Changes (v1.3.0)

### Added

- Added canonical `AuthentikOidcClient` browser helpers with PKCE-only OAuth flow utilities (`isAuthentikConfigured`, `startAuthentikOAuthFlow`, `handleAuthentikCallback`, `readOidcSession`, `clearOidcSession`, `hasPendingAuthentikCallback`, `OIDC_INITIAL_SEARCH`).
- Added exported Authentik OIDC types: `OidcClaims`, `OidcSession`, `OidcProvider`.
- Added README guidance for Authentik setup and the known Authentik `2026.2.1` social re-link bug workaround.

For full version history, see [CHANGELOG.md](./CHANGELOG.md) and [GitHub releases](https://github.com/edcalderon/my-second-brain/releases)

---

## 🚀 Runtime Support Matrix

| Target Runtime | Engine / Framework | Notes | Supported Flow Semantics |
|----------------|--------------------|-------|-----------------|
| **Web**        | React, Vite, SPA   | Standard web APIs available (`window`) | `popup`, `redirect` |
| **Server**     | Next.js Client     | Compatible with App Router Contexts | `redirect`, `popup` |
| **Native**     | Expo/React Native  | Clean native bundles, strictly no web assumptions | `native` |

---

## 🏗️ Architecture

The package follows a **Single Source of Truth** model with a **Federated OAuth Strategy**:
- **Principal Database (Source of Truth)**: Supabase anchors user identities, metadata, roles, and RLS policies in PostgreSQL.
- **The Orchestrator (`@edcalderon/auth`)**: A thin bridge layer exposing a generic interface (`User`, `AuthClient`).

The UI consumes a **unified context** disconnected entirely from provider implementations.

---

## Installation

```bash
npm install @edcalderon/auth
# or
pnpm add @edcalderon/auth
```

### Peer Dependencies

Install peers depending on what adapters you use. (The NPM module avoids forcing packages you won't ship to Native vs Web via strict subpath exports).

```bash
# Core requirements
pnpm add react react-dom

# Supabase (Adapter peers)
pnpm add @supabase/supabase-js

# Firebase (Hybrid/Pure peers)
pnpm add firebase

# Expo/Native Only
pnpm add react-native
```

### Supabase SQL Templates

If you want an application-owned user table instead of coupling your identity model to `auth.users`, copy the reference SQL templates in `packages/auth/supabase/` into your Supabase project and apply them with `supabase db push`.

- `001_create_app_users.sql`: vendor-independent `public.users` table plus secure server-side OIDC upsert RPC
- `002_sync_auth_users_to_app_users.sql`: optional trigger and backfill for projects using Supabase Auth

### Authentik OIDC Client (Canonical)

`@edcalderon/auth` exports a browser-first Authentik OIDC helper that is decoupled from Supabase and can be used with any backend session strategy.

```ts
import {
    isAuthentikConfigured,
    startAuthentikOAuthFlow,
    handleAuthentikCallback,
    readOidcSession,
    clearOidcSession,
    hasPendingAuthentikCallback,
} from "@edcalderon/auth";

if (isAuthentikConfigured()) {
    await startAuthentikOAuthFlow("google", {
        providerSourceSlugs: {
            google: "google",
            discord: "discord",
        },
    });
}

if (hasPendingAuthentikCallback(window.location.search)) {
    const session = await handleAuthentikCallback(window.location.search, {
        onSessionReady: async (claims, tokens) => {
            // Optional hook for API upsert/session handoff.
            console.log(claims.sub, tokens.accessToken);
        },
    });

    console.log("OIDC session", session);
}

const existing = readOidcSession();
if (!existing) {
    clearOidcSession();
}
```

Required env vars (defaults):

| Var | Description |
| --- | --- |
| `EXPO_PUBLIC_AUTHENTIK_ISSUER` | `https://<host>/application/o/<app-slug>/` |
| `EXPO_PUBLIC_AUTHENTIK_CLIENT_ID` | OAuth2 provider client ID |
| `EXPO_PUBLIC_AUTHENTIK_REDIRECT_URI` | App redirect URI registered in Authentik |

You can override env key names with `envKeys` and pass direct values with `issuer`, `clientId`, and `redirectUri`.

Authentik setup checklist:

1. Configure an OAuth2/OIDC provider in Authentik with PKCE enabled.
2. Ensure redirect URIs match your app origin/path exactly.
3. Configure source login slugs (`providerSourceSlugs`) for each social provider.
4. Use `onSessionReady` to hand off claims/tokens to your backend session flow.

Known Authentik `2026.2.1` bug workaround:

- A production hot-patch may be needed in Authentik `flow_manager.py` around `handle_existing_link` to avoid duplicate `(user_id, source_id)` writes when re-linking existing social identities.
- Track the upstream Authentik issue and re-apply the patch after container upgrades until a fixed release is available.

---

## Subpath Exports (Crucial for RN/Next.js compatibility)

The package avoids bleeding `window` or `document` objects into Expo bundles or bleeding heavy native dependencies into web implementations via strict environment exports:

- `@edcalderon/auth` (Shared Core interfaces + Contexts)
- `@edcalderon/auth/supabase`
- `@edcalderon/auth/firebase-web`
- `@edcalderon/auth/firebase-native`
- `@edcalderon/auth/hybrid-web`
- `@edcalderon/auth/hybrid-native`

---

## Quick Start (Web & Next.js)

### 1. Unified React Component UI (Usage)

Your component code is 100% blind to what provider or environment you are using. The `signIn` orchestration handles translating standard intent into provider actions seamlessly.

```tsx
"use client";
import { useAuth } from "@edcalderon/auth";

export default function Dashboard() {
    const { user, loading, error, signIn, signOutUser } = useAuth();

    if (loading) return <Spinner />;
    if (error) return <p>Error: {error}</p>;

    if (!user) {
        return (
            <button onClick={() => signIn({ provider: "google", flow: "popup" })}>
                Sign In with Google
            </button>
        );
    }

    return (
        <div>
            <p>Welcome, {user.email}</p>
            <button onClick={signOutUser}>Sign Out</button>
        </div>
    );
}
```

### 2. Web3 Crypto Wallets (Wagmi / Solana)

Because the orchestration is provider-blind, you can easily pair it with libraries like `wagmi` or `@solana/wallet-adapter-react`.

```tsx
"use client";
import { useAuth } from "@edcalderon/auth";
import { useWallet } from "@solana/wallet-adapter-react";

export function SolanaLogin() {
    const { signIn } = useAuth();
    const wallet = useWallet();

    const handleWeb3SignIn = () => {
        if (!wallet.connected) return;
        
        signIn({ 
            provider: "web3", 
            web3: { 
                chain: "solana", 
                wallet: wallet.wallet?.adapter // Pass the raw wallet adapter
            } 
        });
    }

    return <button onClick={handleWeb3SignIn}>Sign In with Solana</button>;
}
```

### 3. Provider Top-Level App Injectors

Wire the environment appropriate class up at your app root.

#### Supabase (Web/Native Universal)

```tsx
"use client";
import { AuthProvider } from "@edcalderon/auth";
import { SupabaseClient } from "@edcalderon/auth/supabase";
import { supabase } from "@/lib/supabase";

export function AppProviders({ children }) {
    // Works perfectly in both web and Next.js out of the box
    const client = new SupabaseClient({ supabase });
    return <AuthProvider client={client}>{children}</AuthProvider>;
}
```

#### Hybrid (Firebase UI → Supabase Database Session Bridging for Web)

Perfect if you want Firebase to handle the Google popup, but want to automatically consume the ID Token into Supabase to maintain your DB as the source of truth! 

```tsx
"use client";
import { AuthProvider } from "@edcalderon/auth";
import { HybridWebClient } from "@edcalderon/auth/hybrid-web";
import { supabase } from "@/lib/supabase";
import { auth, signInWithPopup, signOut, GoogleAuthProvider } from "@/lib/firebase";

export function AppProviders({ children }) {
    const client = new HybridWebClient({
        supabase,
        firebaseAuth: auth,
        firebaseMethods: { signInWithPopup, signOut, credentialFromResult: GoogleAuthProvider.credentialFromResult },
        googleProvider: new GoogleAuthProvider(),
    });

    return <AuthProvider client={client}>{children}</AuthProvider>;
}
```

---

## Quick Start (Expo & React Native)

React Native apps cannot safely utilize Web's window or popup assumptions. Because of the unified typings, your components never have to change, you just wire up the specific native adapters.

### Hybrid Strategy Native (`expo-auth-session`)

Instead of trying to pop up Firebase Web via polyfills, explicitly hand over native execution capabilities down to the adapter utilizing React Native Expo equivalents. 

```tsx
import { AuthProvider } from "@edcalderon/auth";
import { HybridNativeClient } from "@edcalderon/auth/hybrid-native";
import { supabase } from "@/lib/supabase";
import { auth, signInWithCredential } from "firebase/auth"; 
import * as Google from 'expo-auth-session/providers/google'; // Or react-native-google-signin

export function ExpoProviders({ children }) {
    // 1. You provide strictly native capability functions out of your Expo ecosystem
    const nativeGoogleHandler = async (options) => {
        // e.g promptAsync()
        // Exchange credential response for Firebase Native Credentials 
        // Return { credential, idToken }
    };

    const client = new HybridNativeClient({
        supabase,
        firebaseAuth: auth,
        firebaseMethods: { signInWithCredential, signOut },
        oauthHandlers: {
            "google": nativeGoogleHandler
        }
    });

    return <AuthProvider client={client}>{children}</AuthProvider>;
}
```

Now, clicking `signIn({ provider: "google", flow: "native" })` from anywhere inside your Expo app safely triggers `nativeGoogleHandler` and orchestrates Firebase translation down to Supabase seamlessly behind the scenes!

---

## 🔌 API Reference - Extensibility

### The `AuthClient` Interface

The core strength of `@edcalderon/auth` is that **any authentication service** can be mapped directly onto the `AuthClient` type, exposing typed portability out-of-the-box.

```typescript
type AuthRuntime = "web" | "native" | "server";
type OAuthFlow = "popup" | "redirect" | "native";

export interface Web3SignInOptions {
    chain: "ethereum" | "solana" | "bitcoin";
    wallet?: any;
    message?: string;
    signature?: string;
}

export interface SignInOptions {
    provider?: "google" | "apple" | "github" | "web3" | string;
    flow?: OAuthFlow;
    redirectUri?: string;
    web3?: Web3SignInOptions;
}

export interface AuthClient {
    runtime: AuthRuntime;
    capabilities(): { runtime: AuthRuntime; supportedFlows: OAuthFlow[] };
    
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signIn(options: SignInOptions): Promise<void>;
    signOut(): Promise<void>;
    
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    getSessionToken(): Promise<string | null>;
}
```

### The `User` Type

```typescript
export interface User {
    id: string;
    email?: string;
    avatarUrl?: string;
    provider?: string;
    providerUserId?: string;
    roles?: string[];
    metadata?: Record<string, any>;
}
```

---

## License

MIT © Edward

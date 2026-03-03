# @edcalderon/auth

[![npm version](https://img.shields.io/npm/v/@edcalderon/auth?style=flat-square&color=0ea5e9)](https://www.npmjs.com/package/@edcalderon/auth)
[![npm downloads](https://img.shields.io/npm/dm/@edcalderon/auth?style=flat-square&color=10b981)](https://www.npmjs.com/package/@edcalderon/auth)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/edcalderon/my-second-brain/tree/main/packages/auth)

A universal, **provider-agnostic** authentication orchestration package designed for absolute runtime portability. One abstraction that works flawlessly across React Web `(18.x/19.x)`, Next.js `(14/15)`, and React Native/Expo `(SDK 50+)`. 

Swap between Supabase, Firebase, Hybrid, or any custom provider without changing a single line of your UX component code.

---

## 📋 Latest Changes (v1.2.0)

### Added

- 🔗 Added agnostic Web3 support to the core `SignInOptions` (`options.provider === 'web3'`).
- 🔗 Upgraded `SupabaseClient` and `HybridClient` adapters to natively call Supabase's `signInWithWeb3` standard.
- 📝 Documented Wagmi and `@solana/wallet-adapter` implementation examples in README.

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

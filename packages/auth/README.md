# @ed/auth

A universal, provider-agnostic authentication orchestration package designed for the Edward monorepo ecosystem. 

## 🏗️ Architecture Design

Our authentication structure follows a **Single Source of Truth** model overlaid with a **Federated OAuth Strategy**:

- **Principal Database (Source of Truth)**: **Supabase** acts as the central hub. User identities, metadata, trading operation scopes, and roles are ultimately anchored in our Supabase PostgreSQL schemas (`auth.users`, `auth.identities`). All secure server-side logic and RLS (Row Level Security) operates based off this database.
- **OAuth / Identity Providers**: External services like **Firebase**, **Directus**, or native **Google OAuth** handle frontend login bridges or specific federated SSO flows.
- **The Orchestrator (`@ed/auth`)**: This package acts as the bridge layer. It strips out vendor-lock by exposing generic interfaces (`User`, `AuthClient`). Applications use the unified context without worrying if the underlying session comes directly from Supabase or was federated through Firebase.

```mermaid
graph TD
    UI[Frontend Applications] -->|useAuth| EdAuth[@ed/auth Package]
    EdAuth -->|Direct Session| Supabase(Supabase)
    EdAuth -->|Federated Bridge| Firebase(Firebase OAuth)
    EdAuth -->|Future Adapter| Directus(Directus SSO)
    
    Firebase -->|Sync Session| Supabase
    Directus -->|Sync Session| Supabase
    
    Supabase -->|Roles & Scopes| DB[(PostgreSQL)]
```

## 🚀 Setup & Usage

### 1. Installation
The package is internal to the monorepo workspace.
```bash
pnpm --filter <your-app> add @ed/auth@workspace:*
```

### 2. Provider Instantiation
Initialize the client for your target infrastructure. For standard flows, construct the `SupabaseClient`.

```tsx
// components/auth/AuthProvider.tsx
"use client";

import { AuthProvider as UniversalAuthProvider, SupabaseClient, useAuth as useUniversalAuth } from "@ed/auth";
import { supabase } from "@/lib/supabase"; // Your app's initialized client
import { useMemo } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
    const client = useMemo(() => new SupabaseClient(supabase), []);
    return <UniversalAuthProvider client={client}>{children}</UniversalAuthProvider>;
}

export const useAuth = useUniversalAuth;
```

### 3. Usage inside Components
Every component consumes identical signatures regardless of the active provider.

```tsx
import { useAuth } from "@/components/auth/AuthProvider";

export default function MyComponent() {
    const { user, loading, signInWithGoogle, signOutUser } = useAuth();
    
    if (loading) return <Spinner />;
    if (!user) return <button onClick={() => signInWithGoogle()}>Sign In</button>;
    
    return <div>Welcome {user.email} (Provider: {user.provider})</div>;
}
```

## 🛠️ Modularity and Extension

By implementing the `AuthClient` interface, new adapters (e.g., Directus, Auth0) can be added seamlessly:

```typescript
export interface AuthClient {
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    signOut(): Promise<void>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
}
```

If replacing Supabase entirely for an application, you just swap the dependency injected into `<UniversalAuthProvider client={...} />`. The rest of your React structure remains functionally unaware of the change.

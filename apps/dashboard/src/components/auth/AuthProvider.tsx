"use client";

import { AuthProvider as UniversalAuthProvider, HybridClient, useAuth as useUniversalAuth } from "@ed/auth";
import { supabase } from "@/lib/supabase";
import { auth as firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { useMemo, ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
    const client = useMemo(() => new HybridClient({
        supabase,
        firebaseAuth,
        googleProvider,
        firebaseMethods: {
            signInWithPopup,
            signOut,
            credentialFromResult: GoogleAuthProvider.credentialFromResult
        }
    }), []);

    return <UniversalAuthProvider client={client}>{children}</UniversalAuthProvider>;
}

export const useAuth = useUniversalAuth;

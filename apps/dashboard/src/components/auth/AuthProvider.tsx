"use client";

import { AuthProvider as UniversalAuthProvider, FirebaseClient, HybridClient, useAuth as useUniversalAuth } from "@edcalderon/auth";
import { supabase } from "@/lib/supabase";
import { auth as firebaseAuth, googleProvider } from "@/lib/firebase-client";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import type { AuthClient } from "@edcalderon/auth";
import { ReactNode } from "react";

function createAuthClient(): AuthClient {
    if (firebaseAuth && googleProvider) {
        return new FirebaseClient(firebaseAuth, {
            signInWithEmailAndPassword,
            signInWithPopup,
            signOut,
            onAuthStateChanged,
        }, googleProvider);
    }

    return new HybridClient({
        supabase,
        firebaseAuth,
        googleProvider,
        firebaseMethods: {
            signInWithPopup,
            signOut,
            credentialFromResult: GoogleAuthProvider.credentialFromResult,
        },
    });
}

export const authClient = createAuthClient();

export function AuthProvider({ children }: { children: ReactNode }) {
    return <UniversalAuthProvider client={authClient}>{children}</UniversalAuthProvider>;
}

export const useAuth = useUniversalAuth;

"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";
import { AuthClient, User } from "./types";

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    error: string | null;
    client: AuthClient;
    signInWithEmail: (email: string, password: string) => Promise<User>;
    signInWithGoogle: (redirectTo?: string) => Promise<void>;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initializeAuth() {
            try {
                const u = await client.getUser();
                if (mounted) {
                    setUser(u);
                    setLoading(false);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.message || "Failed to initialize auth");
                    setLoading(false);
                }
            }
        }

        initializeAuth();

        const unsubscribe = client.onAuthStateChange((newUser) => {
            if (mounted) {
                setUser(newUser);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [client]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            loading,
            error,
            client,
            signInWithEmail: async (email: string, password: string) => {
                setError(null);
                try {
                    return await client.signInWithEmail(email, password);
                } catch (err: any) {
                    setError(err.message);
                    throw err;
                }
            },
            signInWithGoogle: async (redirectTo?: string) => {
                setError(null);
                try {
                    await client.signInWithGoogle(redirectTo);
                } catch (err: any) {
                    setError(err.message);
                    throw err;
                }
            },
            signOutUser: async () => {
                setError(null);
                try {
                    await client.signOut();
                } catch (err: any) {
                    setError(err.message);
                    throw err;
                }
            },
        }),
        [user, loading, error, client]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

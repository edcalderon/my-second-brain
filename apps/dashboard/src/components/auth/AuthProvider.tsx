"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from "react";
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    error: string | null;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!auth) {
            setError("Firebase auth is not configured");
            setLoading(false);
            return undefined;
        }

        const unsubscribe = onAuthStateChanged(
            auth,
            (nextUser) => {
                setUser(nextUser);
                setLoading(false);
            },
            (err) => {
                setError(err.message || "Authentication error");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            loading,
            error,
            signInWithEmail: async (email, password) => {
                if (!auth) {
                    throw new Error("Firebase auth is not configured");
                }
                setError(null);
                await signInWithEmailAndPassword(auth, email, password);
            },
            signInWithGoogle: async () => {
                if (!auth || !googleProvider) {
                    throw new Error("Firebase auth is not configured");
                }
                setError(null);
                await signInWithPopup(auth, googleProvider);
            },
            signOutUser: async () => {
                if (!auth) {
                    throw new Error("Firebase auth is not configured");
                }
                setError(null);
                await signOut(auth);
            },
        }),
        [user, loading, error]
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

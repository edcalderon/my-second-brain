import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { Auth, User as FirebaseUser } from "firebase/auth";
import type { GoogleAuthProvider as GoogleAuthProviderType } from "firebase/auth";
import { AuthClient, User } from "../types";

export interface HybridFirebaseMethods {
    signInWithPopup: any;
    signOut: any;
    credentialFromResult: any;
}

export interface HybridClientOptions {
    supabase: SupabaseClientType;
    firebaseAuth: Auth | null;
    firebaseMethods: HybridFirebaseMethods | null;
    googleProvider: GoogleAuthProviderType | null;
}

export class HybridClient implements AuthClient {
    private supabase: SupabaseClientType;
    private firebaseAuth: Auth | null;
    private methods: HybridFirebaseMethods | null;
    private googleProvider: GoogleAuthProviderType | null;

    constructor(options: HybridClientOptions) {
        this.supabase = options.supabase;
        this.firebaseAuth = options.firebaseAuth;
        this.methods = options.firebaseMethods;
        this.googleProvider = options.googleProvider;
    }

    private mapUser(user: any): User | null {
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            provider: user.app_metadata?.provider || 'supabase',
            metadata: user.user_metadata,
        };
    }

    async getUser(): Promise<User | null> {
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (error && error.message.includes("session")) return null; // Safe fallback for unauthenticated
        if (error) throw error;
        return this.mapUser(user);
    }

    async signInWithEmail(email: string, password: string): Promise<User> {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("No user returned");
        return this.mapUser(data.user)!;
    }

    async signInWithGoogle(redirectTo?: string): Promise<void> {
        if (!this.firebaseAuth || !this.methods || !this.googleProvider) {
            console.warn("Firebase not configured, falling back to Supabase native OAuth");
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectTo || (typeof window !== "undefined" ? window.location.origin : undefined),
                },
            });
            if (error) throw error;
            return;
        }

        try {
            // Firebase Google Popup
            const userCredential = await this.methods.signInWithPopup(this.firebaseAuth, this.googleProvider);

            // Generate Google OIDC ID token
            const credential = this.methods.credentialFromResult(userCredential);
            const idToken = credential?.idToken;

            if (!idToken) throw new Error("No Google ID Token found in credential");

            // Pass parallel ID Token directly into Supabase
            const { error: supaError } = await this.supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (supaError) throw supaError;
        } catch (error) {
            // Ensure if anything fails, we clean up the floating firebase session
            if (this.firebaseAuth && this.methods) {
                await this.methods.signOut(this.firebaseAuth).catch(() => { });
            }
            throw error;
        }
    }

    async signOut(): Promise<void> {
        // Break both sessions parallel safely
        if (this.firebaseAuth && this.methods) {
            try {
                await this.methods.signOut(this.firebaseAuth);
            } catch (e) {
                console.error("Firebase signout error:", e);
            }
        }

        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    onAuthStateChange(callback: (user: User | null) => void): () => void {
        const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
            (_event, session) => {
                callback(this.mapUser(session?.user));
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }
}

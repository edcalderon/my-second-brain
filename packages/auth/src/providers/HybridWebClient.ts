import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { Auth, User as FirebaseUser } from "firebase/auth";
import type { GoogleAuthProvider as GoogleAuthProviderType } from "firebase/auth";
import { AuthClient, User, AuthRuntime, SignInOptions, AuthCapabilities } from "../types";

export interface HybridWebFirebaseMethods {
    signInWithPopup: any;
    signInWithRedirect?: any;
    signOut: any;
    credentialFromResult: any;
}

export interface HybridWebClientOptions {
    supabase: SupabaseClientType;
    firebaseAuth: Auth | null;
    firebaseMethods: HybridWebFirebaseMethods | null;
    googleProvider: GoogleAuthProviderType | null;
}

export class HybridWebClient implements AuthClient {
    public runtime: AuthRuntime = "web";
    private supabase: SupabaseClientType;
    private firebaseAuth: Auth | null;
    private methods: HybridWebFirebaseMethods | null;
    private googleProvider: GoogleAuthProviderType | null;

    constructor(options: HybridWebClientOptions) {
        this.supabase = options.supabase;
        this.firebaseAuth = options.firebaseAuth;
        this.methods = options.firebaseMethods;
        this.googleProvider = options.googleProvider;
    }

    capabilities(): AuthCapabilities {
        return {
            runtime: this.runtime,
            supportedFlows: ["popup", "redirect"],
        };
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
        if (error && error.message.includes("session")) return null;
        if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
        return this.mapUser(user);
    }

    async signInWithEmail(email: string, password: string): Promise<User> {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
        if (!data.user) throw new Error("SESSION_ERROR: No user returned");
        return this.mapUser(data.user)!;
    }

    async signIn(options: SignInOptions): Promise<void> {
        const provider = options.provider || "google";

        if (provider === "web3") {
            if (!options.web3) throw new Error("CONFIG_ERROR: options.web3 is required when provider is 'web3'");
            const { error } = await this.supabase.auth.signInWithWeb3({
                // @ts-ignore - Supabase TS types might be strict (e.g. 0x${string}), bypass for agnostic adapter
                chain: options.web3.chain as any,
                message: options.web3.message as any,
                signature: options.web3.signature as any,
                wallet: options.web3.wallet,
            });
            if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
            return;
        }

        if (!this.firebaseAuth || !this.methods || !this.googleProvider) {
            console.warn("Firebase not configured on Hybrid fallback, using Supabase pure auth");
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: provider as any,
                options: {
                    redirectTo: options.redirectUri || (typeof window !== "undefined" ? window.location.origin : undefined),
                },
            });
            if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
            return;
        }

        try {
            let userCredential;
            if (options.flow === "redirect") {
                await this.methods.signInWithRedirect(this.firebaseAuth, this.googleProvider);
                // In redirect flow, this acts differently (callback needs handling). Assuming popup for main.
                return;
            } else {
                userCredential = await this.methods.signInWithPopup(this.firebaseAuth, this.googleProvider);
            }

            const credential = this.methods.credentialFromResult(userCredential);
            const idToken = credential?.idToken;

            if (!idToken) throw new Error("SESSION_ERROR: No Google ID Token found in credential");

            const { error: supaError } = await this.supabase.auth.signInWithIdToken({
                provider: provider as any,
                token: idToken,
            });

            if (supaError) throw new Error(`PROVIDER_ERROR: ${supaError.message}`);
        } catch (error: any) {
            if (this.firebaseAuth && this.methods) {
                await this.methods.signOut(this.firebaseAuth).catch(() => { });
            }
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
    }

    /**
     * @deprecated Use `signIn({ provider: "google", flow: "popup" })` instead
     */
    async signInWithGoogle(redirectTo?: string): Promise<void> {
        console.warn("signInWithGoogle is deprecated in favor of the unified signIn(...) API.");
        return this.signIn({ provider: "google", flow: redirectTo ? "redirect" : "popup", redirectUri: redirectTo });
    }

    async signOut(): Promise<void> {
        if (this.firebaseAuth && this.methods) {
            try {
                await this.methods.signOut(this.firebaseAuth);
            } catch (e) {
                console.error("Firebase signout error:", e);
            }
        }

        const { error } = await this.supabase.auth.signOut();
        if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
    }

    onAuthStateChange(callback: (user: User | null) => void): () => void {
        const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
            (_event, session) => {
                callback(this.mapUser(session?.user));
            }
        );

        return () => subscription.unsubscribe();
    }

    async getSessionToken(): Promise<string | null> {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error || !session) return null;
        return session.access_token;
    }
}

import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { Auth, User as FirebaseUser, AuthCredential } from "firebase/auth";
import { AuthClient, User, AuthRuntime, SignInOptions, AuthCapabilities } from "../types";

export interface HybridNativeFirebaseMethods {
    signInWithCredential: any;
    signOut: any;
}

export interface HybridNativeClientOptions {
    supabase: SupabaseClientType;
    firebaseAuth: Auth | null;
    firebaseMethods: HybridNativeFirebaseMethods | null;
    /**
     * Handlers for launching native OAuth flows using expo-auth-session or similar.
     * Takes SignInOptions and returns a Firebase AuthCredential AND the raw idToken
     */
    oauthHandlers?: Record<string, (options: SignInOptions) => Promise<{ credential: AuthCredential, idToken: string }>>;
}

export class HybridNativeClient implements AuthClient {
    public runtime: AuthRuntime = "native";
    private supabase: SupabaseClientType;
    private firebaseAuth: Auth | null;
    private methods: HybridNativeFirebaseMethods | null;
    private oauthHandlers: NonNullable<HybridNativeClientOptions["oauthHandlers"]>;

    constructor(options: HybridNativeClientOptions) {
        this.supabase = options.supabase;
        this.firebaseAuth = options.firebaseAuth;
        this.methods = options.firebaseMethods;
        this.oauthHandlers = options.oauthHandlers || {};
    }

    capabilities(): AuthCapabilities {
        return {
            runtime: this.runtime,
            supportedFlows: ["native"],
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

        // Pure Supabase route
        if (!this.firebaseAuth || !this.methods || !this.oauthHandlers[provider]) {
            console.warn(`Native OAuth via Hybrid fallback for '${provider}' targeting Supabase purely`);
            const { error } = await this.supabase.auth.signInWithOAuth({
                provider: provider as any,
                options: {
                    redirectTo: options.redirectUri,
                    skipBrowserRedirect: options.flow === "native",
                },
            });
            if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
            return;
        }

        try {
            // Firebase route for generation -> Sync to Supabase
            const { credential, idToken } = await this.oauthHandlers[provider](options);

            // Setup Firebase
            await this.methods.signInWithCredential(this.firebaseAuth, credential);

            if (!idToken) throw new Error("SESSION_ERROR: No ID Token found to sync to Supabase");

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
     * @deprecated Config driven approach overrides this natively
     */
    async signInWithGoogle(redirectTo?: string): Promise<void> {
        console.warn("signInWithGoogle is deprecated in favor of the unified signIn(...) API.");
        return this.signIn({ provider: "google", flow: "native", redirectUri: redirectTo });
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

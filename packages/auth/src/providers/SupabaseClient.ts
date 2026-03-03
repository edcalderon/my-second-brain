import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import { AuthClient, User, AuthRuntime, SignInOptions, AuthCapabilities } from "../types";

export interface SupabaseClientOptions {
    supabase: SupabaseClientType;
    runtime?: AuthRuntime;
}

export class SupabaseClient implements AuthClient {
    public runtime: AuthRuntime;
    private supabase: SupabaseClientType;

    constructor(options: SupabaseClientOptions | SupabaseClientType) {
        // Handle backwards compatibility where just the client was passed
        if ('auth' in options && !('supabase' in options)) {
            this.supabase = options as SupabaseClientType;
            this.runtime = typeof window !== "undefined" ? "web" : "native"; // Best guess
        } else {
            const opts = options as SupabaseClientOptions;
            this.supabase = opts.supabase;
            this.runtime = opts.runtime || (typeof window !== "undefined" ? "web" : "native");
        }
    }

    capabilities(): AuthCapabilities {
        return {
            runtime: this.runtime,
            supportedFlows: this.runtime === "web" ? ["redirect"] : ["native", "redirect"],
        };
    }

    private mapUser(user: any): User | null {
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider,
            providerUserId: user.app_metadata?.provider_id || user.user_metadata?.provider_id,
            metadata: user.user_metadata,
        };
    }

    async getUser(): Promise<User | null> {
        const { data: { user }, error } = await this.supabase.auth.getUser();
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
        if (!options.provider) {
            throw new Error("CONFIG_ERROR: options.provider is required for Supabase OAuth or Web3");
        }

        if (options.provider === "web3") {
            if (!options.web3) {
                throw new Error("CONFIG_ERROR: options.web3 is required when provider is 'web3'");
            }
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

        let redirectTo = options.redirectUri;
        // Apply web assumption ONLY if strictly web
        if (!redirectTo && this.runtime === "web" && typeof window !== "undefined") {
            redirectTo = window.location.origin;
        }

        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: options.provider as any,
            options: {
                redirectTo,
                skipBrowserRedirect: options.flow === "native",
            },
        });

        if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);

        // Return native callback URLs if strictly native flow without skipBrowserRedirect etc...
        // For Expo users relying on deep-links, `skipBrowserRedirect` makes it return the URL to launch instead of redirecting the page.
    }

    /**
     * @deprecated Use `signIn({ provider: "google", flow: "redirect", redirectUri })` instead
     */
    async signInWithGoogle(redirectTo?: string): Promise<void> {
        console.warn("signInWithGoogle is deprecated in favor of the unified signIn(...) API.");
        return this.signIn({ provider: "google", flow: "redirect", redirectUri: redirectTo });
    }

    async signOut(): Promise<void> {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw new Error(`PROVIDER_ERROR: ${error.message}`);
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

    async getSessionToken(): Promise<string | null> {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error || !session) return null;
        return session.access_token;
    }
}

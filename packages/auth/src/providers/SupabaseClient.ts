import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import { AuthClient, User } from "../types";

export class SupabaseClient implements AuthClient {
    constructor(private supabase: SupabaseClientType) { }

    private mapUser(user: any): User | null {
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            avatarUrl: user.user_metadata?.avatar_url,
            provider: user.app_metadata?.provider,
            metadata: user.user_metadata,
        };
    }

    async getUser(): Promise<User | null> {
        const { data: { user }, error } = await this.supabase.auth.getUser();
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
        const { error } = await this.supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectTo || (typeof window !== "undefined" ? window.location.origin : undefined),
            },
        });
        if (error) throw error;
    }

    async signOut(): Promise<void> {
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

    async getSessionToken(): Promise<string | null> {
        const { data: { session }, error } = await this.supabase.auth.getSession();
        if (error || !session) return null;
        return session.access_token;
    }
}

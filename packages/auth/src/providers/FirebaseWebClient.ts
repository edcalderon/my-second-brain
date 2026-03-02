import type { Auth, User as FirebaseUser } from "firebase/auth";
import type { GoogleAuthProvider as GoogleAuthProviderType } from "firebase/auth";
import { AuthClient, User, AuthRuntime, SignInOptions, AuthCapabilities } from "../types";

export interface FirebaseWebMethods {
    signInWithEmailAndPassword: any;
    signInWithPopup: any;
    signInWithRedirect?: any;
    signOut: any;
    onAuthStateChanged: any;
}

export class FirebaseWebClient implements AuthClient {
    public runtime: AuthRuntime = "web";

    constructor(
        private auth: Auth,
        private methods: FirebaseWebMethods,
        private googleProvider: GoogleAuthProviderType,
    ) { }

    capabilities(): AuthCapabilities {
        return {
            runtime: this.runtime,
            supportedFlows: ["popup", "redirect"],
        };
    }

    private mapUser(user: FirebaseUser | null): User | null {
        if (!user) return null;
        return {
            id: user.uid,
            email: user.email || undefined,
            avatarUrl: user.photoURL || undefined,
            providerUserId: user.uid,
            metadata: { displayName: user.displayName },
        };
    }

    async getUser(): Promise<User | null> {
        if (this.auth.currentUser) return this.mapUser(this.auth.currentUser);

        return new Promise((resolve) => {
            const unsubscribe = this.methods.onAuthStateChanged(this.auth, (user: FirebaseUser | null) => {
                unsubscribe();
                resolve(this.mapUser(user));
            });
        });
    }

    async signInWithEmail(email: string, password: string): Promise<User> {
        try {
            const userCredential = await this.methods.signInWithEmailAndPassword(this.auth, email, password);
            return this.mapUser(userCredential.user)!;
        } catch (error: any) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
    }

    async signIn(options: SignInOptions): Promise<void> {
        if (options.provider !== "google") {
            throw new Error("CONFIG_ERROR: Currently only Google is implemented natively in this web adapter example");
        }

        try {
            if (options.flow === "redirect") {
                await this.methods.signInWithRedirect(this.auth, this.googleProvider);
            } else {
                await this.methods.signInWithPopup(this.auth, this.googleProvider);
            }
        } catch (error: any) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
    }

    /**
     * @deprecated Use `signIn({ provider: "google", flow: "popup" })` instead
     */
    async signInWithGoogle(redirectTo?: string): Promise<void> {
        console.warn("signInWithGoogle is deprecated in favor of the unified signIn(...) API.");
        return this.signIn({ provider: "google", flow: redirectTo ? "redirect" : "popup" });
    }

    async signOut(): Promise<void> {
        await this.methods.signOut(this.auth);
    }

    onAuthStateChange(callback: (user: User | null) => void): () => void {
        const unsubscribe = this.methods.onAuthStateChanged(this.auth, (user: FirebaseUser | null) => {
            callback(this.mapUser(user));
        });
        return () => unsubscribe();
    }

    async getSessionToken(): Promise<string | null> {
        if (!this.auth.currentUser) return null;
        try {
            return await this.auth.currentUser.getIdToken();
        } catch {
            return null;
        }
    }
}

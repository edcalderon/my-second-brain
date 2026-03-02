import type { Auth, User as FirebaseUser, AuthCredential } from "firebase/auth";
import { AuthClient, User, AuthRuntime, SignInOptions, AuthCapabilities } from "../types";

export interface FirebaseNativeMethods {
    signInWithEmailAndPassword: any;
    signInWithCredential: any;
    signOut: any;
    onAuthStateChanged: any;
}

export interface FirebaseNativeClientOptions {
    auth: Auth;
    methods: FirebaseNativeMethods;
    /**
     * Callbacks that resolve an AuthCredential natively from a provider like Google or Apple
     * e.g {"google": async (opts) => GoogleAuthProvider.credential(idToken)}
     */
    oauthHandlers?: Record<string, (options: SignInOptions) => Promise<AuthCredential>>;
}

export class FirebaseNativeClient implements AuthClient {
    public runtime: AuthRuntime = "native";
    private auth: Auth;
    private methods: FirebaseNativeMethods;
    private oauthHandlers: NonNullable<FirebaseNativeClientOptions["oauthHandlers"]>;

    constructor(options: FirebaseNativeClientOptions) {
        this.auth = options.auth;
        this.methods = options.methods;
        this.oauthHandlers = options.oauthHandlers || {};
    }

    capabilities(): AuthCapabilities {
        return {
            runtime: this.runtime,
            supportedFlows: ["native"],
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
        const provider = options.provider || "google";
        if (!this.oauthHandlers[provider]) {
            throw new Error(`CONFIG_ERROR: No oauthHandler defined for provider '${provider}' on FirebaseNativeClient`);
        }

        try {
            // Native specific handling
            const credential = await this.oauthHandlers[provider](options);
            await this.methods.signInWithCredential(this.auth, credential);
        } catch (error: any) {
            throw new Error(`PROVIDER_ERROR: ${error.message}`);
        }
    }

    /**
     * @deprecated Config driven approach overrides this natively
     */
    async signInWithGoogle(redirectTo?: string): Promise<void> {
        console.warn("signInWithGoogle is deprecated in favor of the unified signIn(...) API.");
        return this.signIn({ provider: "google", flow: "native" });
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

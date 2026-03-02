export type AuthRuntime = "web" | "native" | "server";
export type OAuthFlow = "popup" | "redirect" | "native";

export interface SignInOptions {
    provider?: "google" | "apple" | "github" | string;
    flow?: OAuthFlow;
    redirectUri?: string;
}

export type AuthErrorCode =
    | "CONFIG_ERROR"
    | "UNSUPPORTED_FLOW"
    | "NETWORK_ERROR"
    | "PROVIDER_ERROR"
    | "SESSION_ERROR";

export interface User {
    id: string;
    email?: string;
    avatarUrl?: string;
    provider?: string;
    providerUserId?: string;
    roles?: string[];
    metadata?: Record<string, any>;
}

export interface AuthCapabilities {
    runtime: AuthRuntime;
    supportedFlows: OAuthFlow[];
}

export interface AuthClient {
    runtime: AuthRuntime;
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;

    /**
     * @deprecated Use `signIn({ provider: "google", flow: "popup" | "redirect" })` instead
     */
    signInWithGoogle(redirectTo?: string): Promise<void>;

    signIn(options: SignInOptions): Promise<void>;
    signOut(): Promise<void>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
    getSessionToken(): Promise<string | null>;
    capabilities(): AuthCapabilities;
}

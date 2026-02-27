export interface User {
    id: string;
    email?: string;
    avatarUrl?: string;
    provider?: string;
    metadata?: Record<string, any>;
}

export interface AuthClient {
    getUser(): Promise<User | null>;
    signInWithEmail(email: string, password: string): Promise<User>;
    signInWithGoogle(redirectTo?: string): Promise<void>;
    signOut(): Promise<void>;
    onAuthStateChange(callback: (user: User | null) => void): () => void;
}

import type { Auth, User as FirebaseUser } from "firebase/auth";
import type { GoogleAuthProvider as GoogleAuthProviderType } from "firebase/auth";
import { AuthClient, User } from "../types";

export interface FirebaseMethods {
    signInWithEmailAndPassword: any;
    signInWithPopup: any;
    signOut: any;
    onAuthStateChanged: any;
}

export class FirebaseClient implements AuthClient {
    constructor(
        private auth: Auth,
        private methods: FirebaseMethods,
        private googleProvider: GoogleAuthProviderType,
    ) { }

    private mapUser(user: FirebaseUser | null): User | null {
        if (!user) return null;
        return {
            id: user.uid,
            email: user.email || undefined,
            avatarUrl: user.photoURL || undefined,
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
        const userCredential = await this.methods.signInWithEmailAndPassword(this.auth, email, password);
        return this.mapUser(userCredential.user)!;
    }

    async signInWithGoogle(redirectTo?: string): Promise<void> {
        await this.methods.signInWithPopup(this.auth, this.googleProvider);
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
}

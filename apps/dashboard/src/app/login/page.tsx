"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
    const { signInWithEmail, signInWithGoogle, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            router.replace("/");
        }
    }, [user, router]);

    const handleEmailSignIn = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await signInWithEmail(email, password);
            router.replace("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);
        try {
            await signInWithGoogle();
            router.replace("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">A-Quant Ops</h1>
                        <p className="text-sm text-gray-600">Secure access required</p>
                    </div>
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <label className="block text-xs font-semibold text-gray-600">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="trader@a-quant.ai"
                        />
                    </div>

                    <label className="block text-xs font-semibold text-gray-600">Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="••••••••"
                    />

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
                    >
                        <span className="inline-flex items-center justify-center space-x-2">
                            <LogIn className="h-4 w-4" />
                            <span>{loading ? "Signing in..." : "Sign in"}</span>
                        </span>
                    </button>
                </form>

                <div className="my-6 flex items-center space-x-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-gray-400">or</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-white py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-accent/40"
                >
                    Continue with Google
                </button>
            </div>
        </div>
    );
}

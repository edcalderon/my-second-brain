"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LoginPage() {
    const { signInWithEmail, signInWithGoogle, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-300">
            <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">A-Quant Ops</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Secure access required</p>
                    </div>
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-10 py-2 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                            placeholder="trader@a-quant.ai"
                        />
                    </div>

                    <label className="block text-xs font-semibold text-gray-900 dark:text-gray-300">Password</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 pr-10 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-2 text-xs text-red-600 dark:text-red-400 transition-colors">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-accent dark:bg-[#1f9e89] py-2 text-sm font-semibold text-white transition-all hover:bg-accent/90 dark:hover:bg-[#1f9e89]/90 disabled:opacity-60 duration-300"
                    >
                        <span className="inline-flex items-center justify-center space-x-2">
                            <LogIn className="h-4 w-4" />
                            <span>{loading ? "Signing in..." : "Sign in"}</span>
                        </span>
                    </button>
                </form>

                <div className="my-6 flex items-center space-x-3">
                    <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700 transition-colors" />
                    <span className="text-xs text-gray-500 dark:text-gray-500">or</span>
                    <div className="h-px flex-1 bg-gray-300 dark:bg-gray-700 transition-colors" />
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:border-accent/40 dark:hover:border-accent/40 hover:bg-gray-50 dark:hover:bg-gray-750 duration-300"
                >
                    Continue with Google
                </button>
            </div>
        </div>
    );
}

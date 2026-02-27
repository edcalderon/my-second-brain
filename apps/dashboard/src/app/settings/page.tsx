"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SettingsPage() {
    const { user } = useAuth();

    const apiBase = useMemo(() => {
        return process.env.NEXT_PUBLIC_DASHBOARD_API_BASE || "(not set)";
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Settings</p>
                <h1 className="text-3xl font-semibold text-gray-900">Dashboard configuration</h1>
                <p className="text-sm text-gray-600">Read-only settings for the public operations console.</p>
            </header>

            <section className="glass-panel rounded-3xl p-8 space-y-6">
                <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Authenticated user</p>
                        <p className="text-xl font-semibold text-gray-900">{user?.email || "Unknown"}</p>
                    </div>
                </div>

                <div className="grid gap-3 text-sm text-gray-700">
                    <DataRow label="Auth provider" value={user?.provider || "supabase"} />
                    <DataRow label="API base" value={apiBase} />
                    <DataRow label="UI scope" value="Read-only" />
                </div>

                <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                    To switch projects, use `scripts/set-gcloud-project.sh` in the Edward repo.
                </div>
            </section>
        </div>
    );
}

function DataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
    );
}

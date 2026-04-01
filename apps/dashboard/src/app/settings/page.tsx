"use client";

import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";

export default function SettingsPage() {
    const { user } = useAuth();

    const hummingbotApiBase = getHummingbotApiBase();
    const siteOrigin =
        process.env.NEXT_PUBLIC_SITE_ORIGIN ||
        (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://edcalderon.io");

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Settings</p>
                <h1 className="text-3xl font-semibold text-gray-900">Dashboard configuration</h1>
                <p className="text-sm text-gray-600">Environment settings for the knowledge hub and paper-trading desk.</p>
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
                    <DataRow label="Hummingbot API base" value={hummingbotApiBase} />
                    <DataRow label="Site origin" value={siteOrigin} />
                    <DataRow label="UI scope" value="Paper trading + knowledge base" />
                </div>

                <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                    Set `NEXT_PUBLIC_HUMMINGBOT_API_BASE` to `https://api.a-quant.xyz` for the paper-trading desk. The dashboard
                    base should stay on the knowledge-site origin.
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

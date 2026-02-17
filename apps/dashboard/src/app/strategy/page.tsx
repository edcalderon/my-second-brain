"use client";

import { useEffect, useState } from "react";
import { Activity, Sparkles } from "lucide-react";
import { fetchStrategy, StrategyResponse } from "@/lib/dashboard-api";

export default function StrategyPage() {
    const [data, setData] = useState<StrategyResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const payload = await fetchStrategy();
                if (!isMounted) {
                    return;
                }
                setData(payload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load strategy feed");
            }
        }

        load();
        const interval = setInterval(load, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const intent = data?.intent;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Strategy</p>
                <h1 className="text-3xl font-semibold text-gray-900">Latest trading intent</h1>
                <p className="text-sm text-gray-600">Read-only snapshot of the most recent strategy output.</p>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="glass-panel rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-emerald-700" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Intent action</p>
                            <p className="text-2xl font-semibold text-gray-900">{intent?.action || "No intent"}</p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        {intent?.symbol || "--"}
                    </span>
                </div>

                <div className="grid gap-3 text-sm text-gray-700">
                    <DataRow label="Intent ID" value={intent?.intent_id || "--"} />
                    <DataRow label="Confidence" value={intent ? `${(intent.confidence * 100).toFixed(1)}%` : "--"} />
                    <DataRow label="Expected edge (bps)" value={intent ? `${intent.expected_edge_bps}` : "--"} />
                    <DataRow label="Created" value={intent?.created_at || "--"} />
                </div>

                <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2 text-emerald-700">
                        <Activity className="h-4 w-4" />
                        <span className="font-semibold">Strategy mode is read-only.</span>
                    </div>
                    <p className="mt-2">
                        Execution requires downstream risk approval and does not occur from the public UI.
                    </p>
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

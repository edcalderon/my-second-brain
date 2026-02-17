"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { fetchRisk, RiskResponse } from "@/lib/dashboard-api";

export default function RiskPage() {
    const [data, setData] = useState<RiskResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const payload = await fetchRisk();
                if (!isMounted) {
                    return;
                }
                setData(payload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load risk decision");
            }
        }

        load();
        const interval = setInterval(load, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const decision = data?.decision;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Risk</p>
                <h1 className="text-3xl font-semibold text-gray-900">Risk decision</h1>
                <p className="text-sm text-gray-600">Latest risk engine evaluation for the current intent.</p>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="glass-panel rounded-3xl p-8 space-y-5">
                <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Decision</p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {decision ? (decision.approved ? "Approved" : "Rejected") : "No decision"}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 text-sm text-gray-700">
                    <DataRow label="Intent" value={decision?.intent_id || "--"} />
                    <DataRow label="Reason" value={decision?.reason || "--"} />
                    <DataRow label="Bankroll" value={decision ? `${decision.bankroll}` : "--"} />
                    <DataRow label="Notional" value={decision ? `${decision.notional}` : "--"} />
                    <DataRow label="Requires revalidation" value={decision ? (decision.requires_revalidation ? "Yes" : "No") : "--"} />
                </div>

                <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                    Risk decisions are enforced server-side. The public dashboard cannot override approvals.
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

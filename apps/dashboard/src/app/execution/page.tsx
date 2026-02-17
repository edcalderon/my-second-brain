"use client";

import { useEffect, useState } from "react";
import { Gauge, ShieldCheck } from "lucide-react";
import { ExecutionResponse, fetchExecution } from "@/lib/dashboard-api";

export default function ExecutionPage() {
    const [data, setData] = useState<ExecutionResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const payload = await fetchExecution();
                if (!isMounted) {
                    return;
                }
                setData(payload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load execution feed");
            }
        }

        load();
        const interval = setInterval(load, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const reconciliation = data?.reconciliation;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Execution</p>
                <h1 className="text-3xl font-semibold text-gray-900">Execution feed</h1>
                <p className="text-sm text-gray-600">Latest fill status from the executor service.</p>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="glass-panel rounded-3xl p-8 space-y-5">
                <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                        <Gauge className="h-6 w-6 text-emerald-700" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">Last status</p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {reconciliation?.status || "No execution"}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 text-sm text-gray-700">
                    <DataRow label="Order ID" value={reconciliation?.order_id || "--"} />
                    <DataRow label="Client Order" value={reconciliation?.client_order_id || "--"} />
                    <DataRow label="Filled qty" value={reconciliation ? `${reconciliation.filled_qty}` : "--"} />
                    <DataRow label="Avg fill price" value={reconciliation ? `${reconciliation.avg_fill_price}` : "--"} />
                    <DataRow label="Drift detected" value={reconciliation ? (reconciliation.drift_detected ? "Yes" : "No") : "--"} />
                </div>

                <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2 text-emerald-700">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="font-semibold">Execution is isolated from the public UI.</span>
                    </div>
                    <p className="mt-2">Orders are placed only by the executor service after risk approval.</p>
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

"use client";

import { useEffect, useState } from "react";
import { Gauge, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchTradingStatus, HummingbotStatus } from "@/lib/hummingbot-api";
import { formatJson, formatNumber, normalizePosition } from "@/lib/hummingbot-format";

export default function ExecutionPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const payload = await fetchTradingStatus();
                if (!isMounted) {
                    return;
                }
                setStatus(payload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load execution feed");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        load();
        const interval = setInterval(load, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [refreshCounter]);

    const positions = (status?.open_positions || []).map(normalizePosition);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Execution</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Execution monitor</h1>
                        <p className="text-sm text-gray-600">
                            Review the positions Hummingbot is carrying for the paper desk and confirm nothing is drifting.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshCounter((value) => value + 1)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh feed
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Backend status</h2>
                            <p className="text-sm text-gray-500">The connector and account currently used by the desk.</p>
                        </div>
                        <Gauge className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700">
                        <DataRow label="Paper mode" value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"} />
                        <DataRow label="Connector" value={status?.default_connector || "--"} />
                        <DataRow label="Account" value={status?.default_account || "--"} />
                        <DataRow label="Open positions" value={`${positions.length}`} />
                        <DataRow label="API base" value={status?.api_url || "--"} />
                    </div>

                    <div className="rounded-xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-semibold">{loading ? "Loading execution feed" : "Execution feed connected"}</span>
                        </div>
                        <p className="mt-2">
                            No orders are placed from this page. It is a monitor for what the strategy desk submitted.
                        </p>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Portfolio snapshot</h2>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{positions.length} open</span>
                    </div>

                    <details className="rounded-xl border border-border bg-white px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-800">Raw backend portfolio</summary>
                        <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(status?.portfolio_state)}</pre>
                    </details>

                    <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                        <DataRow label="Connector count" value={status ? `${status.connector_count}` : "--"} />
                        <DataRow label="Open positions count" value={status ? `${status.open_positions_count}` : "--"} />
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Open positions</h2>
                        <p className="text-sm text-gray-500">What the strategy desk currently has on the book.</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{positions.length} active</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Pair</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Side</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Entry</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">PnL</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Leverage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {positions.map((position) => (
                                <tr key={`${position.tradingPair ?? "pair"}-${position.side ?? "side"}-${position.entryPrice ?? "entry"}-${position.amount ?? "amount"}`}>
                                    <td className="px-4 py-3 text-gray-900">{position.tradingPair}</td>
                                    <td className="px-4 py-3 text-gray-700">{position.side}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.amount)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.entryPrice)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.unrealizedPnl)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatNumber(position.leverage, 0)}x</td>
                                </tr>
                            ))}
                            {!positions.length && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                        No positions are open right now.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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

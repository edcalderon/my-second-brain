"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { fetchTradingStatus, previewTrade, HummingbotPreview, HummingbotStatus } from "@/lib/hummingbot-api";
import { formatJson, formatNumber, formatPercent, normalizePosition } from "@/lib/hummingbot-format";

const DEFAULT_PAIR = "ETH-USD";
const DEFAULT_INTERVAL = "1h";
const DEFAULT_FAST_EMA = 21;
const DEFAULT_SLOW_EMA = 55;
const DEFAULT_RSI = 14;

export default function RiskPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [preview, setPreview] = useState<HummingbotPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const statusPayload = await fetchTradingStatus();
                if (!isMounted) {
                    return;
                }

                setStatus(statusPayload);

                const previewPayload = await previewTrade({
                    trading_pair: DEFAULT_PAIR,
                    connector_name: statusPayload.default_connector,
                    interval: DEFAULT_INTERVAL,
                    fast_ema: DEFAULT_FAST_EMA,
                    slow_ema: DEFAULT_SLOW_EMA,
                    rsi_period: DEFAULT_RSI,
                });

                if (!isMounted) {
                    return;
                }

                setPreview(previewPayload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load risk view");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        load();
        const intervalId = setInterval(load, 15000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [refreshCounter]);

    const positions = status?.open_positions ?? [];
    const normalizedPositions = positions.map(normalizePosition);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Risk</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Paper risk view</h1>
                        <p className="text-sm text-gray-600">
                            Track the same guardrails the strategy desk uses before a paper order reaches Hummingbot.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshCounter((value) => value + 1)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Refresh risk view
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Risk summary</h2>
                            <p className="text-sm text-gray-500">The backend state that feeds the paper-trading guardrails.</p>
                        </div>
                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <DataRow label="Paper mode" value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"} />
                        <DataRow label="Connector" value={status?.default_connector || "--"} />
                        <DataRow label="Account" value={status?.default_account || "--"} />
                        <DataRow label="Open positions" value={`${positions.length}`} />
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-semibold">{loading ? "Loading risk data" : "Backend risk state loaded"}</span>
                        </div>
                        <p className="mt-2">
                            {status?.api_url || "Waiting for the Hummingbot backend."}
                        </p>
                    </div>

                    <details className="rounded-2xl border border-border bg-white px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-800">Portfolio snapshot</summary>
                        <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(status?.portfolio_state)}</pre>
                    </details>
                </div>

                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Signal pressure</h2>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                            {preview?.signal || "Pending"}
                        </span>
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700">
                        <DataRow label="Confidence" value={preview ? formatPercent(preview.confidence * 100, 1) : "--"} />
                        <DataRow label="Expected edge" value={preview ? `${formatNumber(preview.expected_edge_bps, 2)} bps` : "--"} />
                        <DataRow label="Latest close" value={preview ? formatNumber(preview.latest_close) : "--"} />
                        <DataRow label="RSI" value={preview ? formatNumber(preview.rsi, 2) : "--"} />
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <p className="font-semibold text-gray-800">Guardrail note</p>
                        <p className="mt-2">
                            This page does not override anything. It simply shows the current preview so you can confirm the desk still matches the live risk posture.
                        </p>
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Open positions</h2>
                        <p className="text-sm text-gray-500">Risk should stay boring here. Use the strategy desk to close a position.</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{normalizedPositions.length} open</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border bg-white">
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
                            {normalizedPositions.map((position, index) => (
                                <tr key={`${position.tradingPair}-${index}`}>
                                    <td className="px-4 py-3 text-gray-900">{position.tradingPair}</td>
                                    <td className="px-4 py-3 text-gray-700">{position.side}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.amount)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.entryPrice)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.unrealizedPnl)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatNumber(position.leverage, 0)}x</td>
                                </tr>
                            ))}
                            {!normalizedPositions.length && (
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

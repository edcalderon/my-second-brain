"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CandlestickChart, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import {
    fetchPortfolioTracker,
    fetchTradingStatus,
    HummingbotPortfolioTracker,
    HummingbotStatus,
} from "@/lib/hummingbot-api";
import { formatJson, formatNumber, formatTime, normalizePosition } from "@/lib/hummingbot-format";

export default function PortfolioPage() {
    const { portfolio, portfolioHistory, loading: portfolioLoading, error: portfolioError } = useSupabaseData();
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [tracker, setTracker] = useState<HummingbotPortfolioTracker | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setRefreshing(true);
            try {
                const [statusPayload, trackerPayload] = await Promise.all([
                    fetchTradingStatus(),
                    fetchPortfolioTracker(),
                ]);

                if (!isMounted) {
                    return;
                }

                setStatus(statusPayload);
                setTracker(trackerPayload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load portfolio tracker");
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setRefreshing(false);
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

    const liveWallet = tracker?.wallet_address || status?.wallet_address || "--";
    const liveAccount = tracker?.account_name || status?.default_account || "--";
    const liveConnector = tracker?.connector_name || status?.default_connector || "--";
    const liveSnapshot = tracker?.summary ?? status?.portfolio_summary ?? null;
    const livePositions = (tracker?.open_positions || status?.open_positions || []).map(normalizePosition);
    const history = portfolioHistory.slice(0, 12);
    const latestStoredSnapshot = portfolio || history[0] || null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <header className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Portfolio</p>
                        <h1 className="text-3xl font-semibold text-gray-900">Hyperliquid tracker</h1>
                        <p className="text-sm text-gray-600 max-w-3xl">
                            This page follows the main Hyperliquid account, mirrors the live Hummingbot portfolio summary, and keeps the Supabase snapshot trail visible for testing.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshCounter((value) => value + 1)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh tracker
                    </button>
                </div>

                <div className="flex flex-wrap gap-3">
                    <QuickLink href="/strategy" label="Strategy Desk" />
                    <QuickLink href="/market" label="Market Feed" />
                    <QuickLink href="/risk" label="Risk View" />
                    <QuickLink href="/execution" label="Execution" />
                </div>
            </header>

            {(error || portfolioError) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error || portfolioError}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="glass-panel rounded-3xl p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Live tracker</h2>
                            <p className="text-sm text-gray-500">
                                Hummingbot backend, Hyperliquid wallet, and account identity.
                            </p>
                        </div>
                        <Wallet className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DataRow label="Wallet" value={liveWallet} mono />
                        <DataRow label="Account" value={String(liveAccount)} />
                        <DataRow label="Connector" value={String(liveConnector)} />
                        <DataRow label="Paper mode" value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"} />
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2 xl:grid-cols-4">
                        <DataRow label="Open positions" value={`${livePositions.length}`} />
                        <DataRow label="Connector count" value={status ? `${status.connector_count}` : "--"} />
                        <DataRow label="API base" value={status?.api_url || "--"} />
                        <DataRow label="Last sync" value={liveSnapshot?.snapshot_time ? formatTime(liveSnapshot.snapshot_time) : (tracker?.snapshot_time ? formatTime(tracker.snapshot_time) : "--")} />
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-semibold">
                                {loading || portfolioLoading ? "Loading portfolio tracker" : "Portfolio tracker connected"}
                            </span>
                        </div>
                        <p className="mt-2">
                            The live backend pushes snapshots into Supabase every minute, so this tracker should line up with the stored feed below.
                        </p>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Capital summary</h2>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            {liveSnapshot ? "Live" : "Pending"}
                        </span>
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                        <DataRow label="Total USD" value={liveSnapshot ? formatNumber(liveSnapshot.total_value_usd, 2) : "--"} />
                        <DataRow label="Total ETH" value={liveSnapshot ? formatNumber(liveSnapshot.total_value_eth, 4) : "--"} />
                        <DataRow label="Unrealized PnL" value={liveSnapshot ? formatNumber(liveSnapshot.unrealized_pnl, 2) : "--"} />
                        <DataRow label="Realized PnL" value={liveSnapshot ? formatNumber(liveSnapshot.realized_pnl, 2) : "--"} />
                        <DataRow label="Aave HF" value={liveSnapshot ? formatNumber(liveSnapshot.aave_hf, 2) : "--"} />
                        <DataRow label="Reserve ETH" value={liveSnapshot ? formatNumber(liveSnapshot.reserve, 4) : "--"} />
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <p className="font-semibold text-gray-800">Snapshot source</p>
                        <p className="mt-2">
                            Latest stored snapshot: {latestStoredSnapshot ? formatTime(latestStoredSnapshot.time) : "waiting for the first write"}.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Recent snapshots</h2>
                            <p className="text-sm text-gray-500">Supabase history from the tracker feed.</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{history.length} stored</span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">USD</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Unrealized</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Realized</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Aave HF</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {history.map((snapshot) => (
                                    <tr key={snapshot.time}>
                                        <td className="px-4 py-3 text-gray-600">{formatTime(snapshot.time)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(snapshot.total_value_usd, 2)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(snapshot.unrealized_pnl, 2)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(snapshot.realized_pnl, 2)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatNumber(snapshot.aave_health_factor, 2)}</td>
                                    </tr>
                                ))}
                                {!history.length && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                                            Waiting for the first portfolio snapshot.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Open positions</h2>
                            <p className="text-sm text-gray-500">Positions currently exposed by the tracker.</p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{livePositions.length} active</span>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {livePositions.map((position, index) => (
                                    <tr key={`${position.tradingPair}-${index}`}>
                                        <td className="px-4 py-3 text-gray-900">{position.tradingPair}</td>
                                        <td className="px-4 py-3 text-gray-700">{position.side}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.amount)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.entryPrice)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.unrealizedPnl)}</td>
                                    </tr>
                                ))}
                                {!livePositions.length && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                                            No positions are open right now.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <details className="rounded-2xl border border-border bg-white px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-800">Raw tracker state</summary>
                        <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(tracker?.portfolio_state || status?.portfolio_state)}</pre>
                    </details>
                </div>
            </section>
        </div>
    );
}

function QuickLink({ href, label }: { href: string; label: string }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
        >
            <CandlestickChart className="h-4 w-4" />
            <span>{label}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
    );
}

function DataRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-border bg-white px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
        </div>
    );
}

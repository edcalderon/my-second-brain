"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ExternalLink,
    Gauge,
    Loader2,
    RefreshCw,
    Signal,
    TrendingDown,
    TrendingUp,
    Zap,
} from "lucide-react";
import {
    buildTradingOutageNotice,
    fetchAgentStatus,
    fetchJournalEntries,
    fetchMonitorStatus,
    fetchTradingStatus,
    getTradingErrorPayload,
    triggerConnectivityCheckNow,
    triggerReconcileNow,
    type AgentStatusResponse,
    type ConnectivityState,
    type HummingbotStatus,
    type JournalEntry,
    type MonitorStatusResponse,
} from "@/lib/hummingbot-api";
import { formatCurrency, formatJson, formatNumber, normalizePosition } from "@/lib/hummingbot-format";
import { TradingOutageBanner } from "@/components/trading/TradingOutageBanner";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import { AgentStatusChip } from "@/components/shared/AgentStatusChip";
import { MonitorLogFeed } from "@/components/execution/MonitorLogFeed";

// "BTC-USDT" / "BTCUSDT" / "btcusdt" -> "BTCUSDT" -- lets a Hummingbot pair,
// a raw Bybit symbol, and a journal entry's instrument all be compared.
function normalizeSymbol(value: string | null | undefined): string {
    return (value ?? "").replace(/[-_]/g, "").toUpperCase();
}

function matchJournalEntry(
    trades: JournalEntry[],
    symbol: string | null | undefined,
    side: "long" | "short" | null | undefined,
): JournalEntry | null {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return null;
    return (
        trades.find(
            (t) => normalizeSymbol(t.instrument) === normalized && (!side || t.side === side),
        ) ?? null
    );
}

function JournalLink({ entry }: { entry: JournalEntry | null }) {
    if (!entry) return <span className="text-gray-300">—</span>;
    return (
        <Link
            href={`/journal?id=${entry.id}`}
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline"
        >
            Journal <ExternalLink className="h-3 w-3" />
        </Link>
    );
}

const CONNECTIVITY_STYLE: Record<ConnectivityState, { dot: string; text: string; label: string }> = {
    healthy: { dot: "bg-emerald-500", text: "text-emerald-700", label: "Connected" },
    degraded: { dot: "bg-amber-500 animate-pulse", text: "text-amber-700", label: "Degraded" },
    offline: { dot: "bg-red-500 animate-pulse", text: "text-red-700", label: "Offline" },
    unknown: { dot: "bg-gray-300", text: "text-gray-500", label: "Unknown" },
};

// mm:ss until `targetIso`, ticked by the caller passing a fresh `now`.
// Never fabricates a countdown -- returns "--" until a real next-run
// timestamp is available, "due now" once it's passed.
function formatCountdown(targetIso: string | null, now: Date): string {
    if (!targetIso) return "--";
    const diffMs = new Date(targetIso).getTime() - now.getTime();
    if (diffMs <= 0) return "due now";
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export default function ExecutionPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [openTrades, setOpenTrades] = useState<JournalEntry[]>([]);
    const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
    const [monitorStatus, setMonitorStatus] = useState<MonitorStatusResponse | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [loading, setLoading] = useState(true);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [now, setNow] = useState(() => new Date());

    const { notifications } = useSupabaseData();

    const [reconcileBusy, setReconcileBusy] = useState(false);
    const [reconcileResult, setReconcileResult] = useState<string | null>(null);
    const [connectivityBusy, setConnectivityBusy] = useState(false);
    const [connectivityResult, setConnectivityResult] = useState<string | null>(null);

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
                const payload = getTradingErrorPayload<HummingbotStatus>(err);
                if (payload) {
                    setStatus(payload);
                }
                setError(err);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        async function loadOpenTrades() {
            try {
                const result = await fetchJournalEntries({ entry_type: "trade", status: "open", limit: 50 });
                if (isMounted) setOpenTrades(result.entries);
            } catch {
                // Journal cross-reference is secondary -- positions still render without it.
            }
        }

        async function loadAgentStatus() {
            try {
                const result = await fetchAgentStatus();
                if (isMounted) setAgentStatus(result);
            } catch {
                // Agent activity is a supplementary panel -- the rest of the page still works.
            }
        }

        async function loadMonitorStatus() {
            try {
                const result = await fetchMonitorStatus();
                if (isMounted) setMonitorStatus(result);
            } catch {
                // Same -- countdown/connectivity card just shows "--" until this recovers.
            }
        }

        load();
        loadOpenTrades();
        loadAgentStatus();
        loadMonitorStatus();
        const interval = setInterval(() => {
            load();
            loadOpenTrades();
            loadAgentStatus();
            loadMonitorStatus();
        }, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [refreshCounter]);

    // Local 1s tick purely to animate the reconcile countdown -- doesn't
    // touch the network, just re-renders against the real next_reconcile_at
    // already fetched above.
    useEffect(() => {
        const tick = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    async function handleReconcileNow() {
        setReconcileBusy(true);
        setReconcileResult(null);
        try {
            const result = await triggerReconcileNow();
            if (result.skipped) {
                setReconcileResult("Close guard is disabled -- nothing to check.");
            } else {
                const checked = typeof result.checked === "number" ? result.checked : "?";
                setReconcileResult(`Checked ${checked} open trade(s), closed ${result.closed ?? 0}.`);
            }
            setRefreshCounter((v) => v + 1);
        } catch {
            setReconcileResult("Reconcile request failed -- see server logs.");
        } finally {
            setReconcileBusy(false);
        }
    }

    async function handleConnectivityCheckNow() {
        setConnectivityBusy(true);
        setConnectivityResult(null);
        try {
            const result = await triggerConnectivityCheckNow();
            const style = CONNECTIVITY_STYLE[result.connectivity_state] ?? CONNECTIVITY_STYLE.unknown;
            setConnectivityResult(`Bybit reachability: ${style.label}.`);
            setRefreshCounter((v) => v + 1);
        } catch {
            setConnectivityResult("Connectivity check failed -- see server logs.");
        } finally {
            setConnectivityBusy(false);
        }
    }

    const positions = (status?.open_positions || []).map(normalizePosition);
    // Positions read directly from Bybit, bypassing Hummingbot -- the only
    // place a live position placed via Trigger Setup actually shows up for
    // markets Hummingbot's connector doesn't track. Rendering only
    // `positions` above undercounts to zero even while a real position is
    // open (see command-center/page.tsx for the same caveat).
    const bybitDirectPositions = status?.bybit_direct_positions ?? [];
    const outageNotice = buildTradingOutageNotice({
        status: status?.service_health ?? null,
        error,
        endpoint: "/trading/status",
    });

    const connectivityState = monitorStatus?.connectivity_state ?? "unknown";
    const connectivityStyle = CONNECTIVITY_STYLE[connectivityState];

    // Position-defender chips scoped to whichever symbols are actually
    // open right now, rather than dumping every agent_status key.
    const openSymbols = new Set([
        ...positions.map((p) => normalizeSymbol(p.tradingPair)),
        ...bybitDirectPositions.map((p) => normalizeSymbol(String(p.symbol))),
    ]);
    const positionDefenderKeys = Object.keys(agentStatus ?? {}).filter((key) => {
        if (!key.startsWith("position_defender:")) return false;
        const symbol = key.slice("position_defender:".length).split(":")[0];
        return openSymbols.has(normalizeSymbol(symbol));
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Execution</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Execution monitor</h1>
                        <p className="text-sm text-gray-600">
                            Review the positions the desk is carrying and what the monitoring backend is doing about them.
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

            <TradingOutageBanner notice={outageNotice} />

            <section className="@container grid gap-6 @3xl:grid-cols-[1fr_1.1fr]">
                {/* Backend status -- redesigned: one status line up top (real
                    connectivity state + real reconcile countdown), a compact
                    key/value grid below, manual "check now" controls. */}
                <div className="glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${connectivityStyle.dot}`} />
                            <span className={`text-sm font-semibold ${connectivityStyle.text}`}>
                                {loading ? "Loading" : connectivityStyle.label}
                            </span>
                        </div>
                        <Gauge className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">Next reconcile check</p>
                            <p className="mt-0.5 text-sm font-semibold text-gray-900 tabular-nums">
                                {monitorStatus?.reconcile_enabled === false
                                    ? "Disabled"
                                    : formatCountdown(monitorStatus?.next_reconcile_at ?? null, now)}
                            </p>
                        </div>
                        <span className="text-[11px] text-gray-400">
                            every {monitorStatus?.reconcile_interval_minutes ?? "--"}m
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                        <MiniStat label="Live trading" value={status ? (status.live_trading_enabled ? "Enabled" : "Dry-run") : "--"} />
                        <MiniStat label="Connector" value={status?.default_connector || "--"} />
                        <MiniStat label="Account" value={status?.default_account || "--"} />
                        <MiniStat label="Open positions" value={`${positions.length}`} />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="button"
                            onClick={handleConnectivityCheckNow}
                            disabled={connectivityBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                            {connectivityBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Signal className="h-3.5 w-3.5" />}
                            Check connectivity now
                        </button>
                        <button
                            type="button"
                            onClick={handleReconcileNow}
                            disabled={reconcileBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                            {reconcileBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            Run reconcile now
                        </button>
                    </div>
                    {(connectivityResult || reconcileResult) && (
                        <p className="text-xs text-gray-500">{connectivityResult || reconcileResult}</p>
                    )}
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Portfolio snapshot</h2>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{positions.length} open</span>
                    </div>

                    <details className="rounded-xl border border-border bg-white px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-800">Raw backend portfolio</summary>
                        <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(status?.portfolio_state)}</pre>
                    </details>

                    <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
                        <MiniStat label="Connector count" value={status ? `${status.connector_count}` : "--"} />
                        <MiniStat label="Open positions count" value={status ? `${status.open_positions_count}` : "--"} />
                    </div>
                </div>
            </section>

            {/* Agent activity -- real state from GET /agents/status, scoped to
                the agents relevant to execution (risk_guard + any position
                defenders currently watching an open position). */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">Agent activity</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <AgentStatusChip label="Risk Guard" entry={agentStatus?.risk_guard ?? null} />
                    <AgentStatusChip label="Thesis Monitor" entry={agentStatus?.thesis_monitor ?? null} />
                    {positionDefenderKeys.map((key) => {
                        const symbol = key.slice("position_defender:".length).split(":")[0];
                        return (
                            <AgentStatusChip
                                key={key}
                                label={symbol ? `Position Defender (${symbol})` : "Position Defender"}
                                entry={agentStatus?.[key] ?? null}
                            />
                        );
                    })}
                    {positionDefenderKeys.length === 0 && (
                        <AgentStatusChip
                            label="Position Defender"
                            entry={null}
                            detailOverride="No position currently being defended."
                        />
                    )}
                </div>
            </section>

            <MonitorLogFeed notifications={notifications} />

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
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Reasoning</th>
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
                                    <td className="px-4 py-3 text-right">
                                        <JournalLink
                                            entry={matchJournalEntry(
                                                openTrades,
                                                position.tradingPair,
                                                position.side === "BUY" ? "long" : position.side === "SELL" ? "short" : null,
                                            )}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {!positions.length && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                                        No positions are open right now.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Positions read directly from Bybit -- e.g. one opened via
                Trigger Setup on the Strategy Desk -- which Hummingbot's own
                connector may never see. See bybitDirectPositions comment above. */}
            {bybitDirectPositions.length > 0 && (
                <section className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Bybit direct positions</h2>
                            <p className="text-sm text-gray-500">
                                Read straight from Bybit — includes positions Hummingbot&apos;s connector doesn&apos;t
                                track (e.g. USDC-margined perps), and anything placed via Trigger Setup.
                            </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                            {bybitDirectPositions.length} open
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Symbol</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Side</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Size</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Avg entry</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Mark</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">PnL</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Leverage</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Reasoning</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bybitDirectPositions.map((position, index) => {
                                    const pnl = Number(position.unrealisedPnl ?? 0);
                                    const side = position.side === "Buy" ? "long" : position.side === "Sell" ? "short" : null;
                                    return (
                                        <tr key={`${String(position.symbol)}-${index}`}>
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{String(position.symbol)}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                        position.side === "Buy"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-rose-50 text-rose-700"
                                                    }`}
                                                >
                                                    {position.side === "Buy" ? (
                                                        <TrendingUp className="h-3 w-3" />
                                                    ) : (
                                                        <TrendingDown className="h-3 w-3" />
                                                    )}
                                                    {String(position.side)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.size, 4)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.avgPrice, 2)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.markPrice, 2)}</td>
                                            <td
                                                className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold ${
                                                    pnl > 0 ? "text-emerald-700" : pnl < 0 ? "text-rose-700" : "text-gray-900"
                                                }`}
                                            >
                                                {formatCurrency(pnl)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">{String(position.leverage)}x</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <JournalLink entry={matchJournalEntry(openTrades, String(position.symbol), side)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

function MiniStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-white px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{value}</p>
        </div>
    );
}

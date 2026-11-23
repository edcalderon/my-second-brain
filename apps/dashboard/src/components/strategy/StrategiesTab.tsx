"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Play,
    Square,
    RotateCcw,
    Settings2,
    Loader2,
    Award,
    ShieldCheck,
    Monitor,
    Info,
    ChevronDown,
    ChevronUp,
    Clock,
    ExternalLink,
    AlertTriangle,
    Ban,
    XCircle,
} from "lucide-react";
import {
    type StrategyListItem,
    type StrategyPerformance,
    type StrategyRiskParams,
    type StrategyEntryFilters,
    type BacktestRunSummary,
    fetchStrategies,
    activateStrategy,
    deactivateStrategy,
    updateStrategySettings,
    cancelStrategyBacktest,
    fetchBacktestTrades,
} from "@/lib/hummingbot-api";
import { formatJson, formatRelativeTime } from "@/lib/hummingbot-format";
import { BacktestConfigModal } from "./BacktestConfigModal";

type StrategiesTabProps = {
    strategies?: StrategyListItem[];
    loading?: boolean;
    onRefresh?: () => Promise<void>;
};

export function StrategiesTab({
    strategies: externalStrategies,
    loading = false,
    onRefresh,
}: StrategiesTabProps) {
    // In controlled mode (externalStrategies passed by the parent -- e.g.
    // strategy/page.tsx) `strategies` is derived fresh from the prop on
    // every render, never snapshotted into local state: a stale one-time
    // useState(externalStrategies ?? []) here previously meant later
    // parent re-renders (and, worse, this component's own remount when
    // its containing tab is switched away and back) silently reverted to
    // whatever the prop held at mount time, which is why a running
    // backtest's status pill could vanish after navigating away and back.
    const [localStrategies, setLocalStrategies] = useState<StrategyListItem[]>([]);
    const strategies = externalStrategies ?? localStrategies;
    const [loadingLocal, setLoadingLocal] = useState(
        externalStrategies === undefined,
    );
    const [busyId, setBusyId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [backtestModalId, setBacktestModalId] = useState<string | null>(null);

    async function load() {
        if (externalStrategies !== undefined) {
            // Controlled mode: the parent owns the data, so "refresh"
            // means asking it to refetch -- its next re-render is what
            // updates `strategies` above.
            await onRefresh?.();
            return;
        }
        setLoadingLocal(true);
        try {
            const res = await fetchStrategies();
            setLocalStrategies(res.strategies);
        } catch {
            // Silently ignore
        } finally {
            setLoadingLocal(false);
        }
    }

    // Initial load
    useState(() => {
        if (externalStrategies === undefined) {
            load();
        }
    });

    // Self-terminating auto-poll: only while some strategy has a backtest
    // actually running in the background (server-side
    // pending/complete backtest-run flow) -- picks the
    // state back up correctly on a fresh page load since it's driven by
    // server-persisted `status`, not local component state, and costs
    // nothing once every run has finished.
    const anyRunning = strategies.some((s) => s.latest_backtest?.status === "running");
    useEffect(() => {
        if (!anyRunning) return;
        const id = window.setInterval(load, 8000);
        return () => window.clearInterval(id);
    }, [anyRunning]);

    const allLoading = loading || loadingLocal;

    if (allLoading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"
                    />
                ))}
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Strategy Desk
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Refresh
                </button>
            </div>

            {strategies.map((s) => (
                <StrategyRow
                    key={s.id}
                    strategy={s}
                    isBusy={busyId === s.id}
                    isExpanded={expandedId === s.id}
                    isEditing={editId === s.id}
                    onExpand={() =>
                        setExpandedId((prev) => (prev === s.id ? null : s.id))
                    }
                    onEdit={() => setEditId(s.id)}
                    onFinishEdit={() => setEditId(null)}
                    onBusy={(id) => setBusyId(id)}
                    onRefreshList={load}
                    onOpenBacktest={() => setBacktestModalId(s.id)}
                />
            ))}

            {backtestModalId && (
                <BacktestConfigModal
                    strategy={strategies.find((s) => s.id === backtestModalId)!}
                    onClose={() => setBacktestModalId(null)}
                    onStarted={() => {
                        setBacktestModalId(null);
                        load();
                    }}
                />
            )}
        </section>
    );
}

function StrategyRow({
    strategy,
    isBusy,
    isExpanded,
    isEditing,
    onExpand,
    onEdit,
    onFinishEdit,
    onBusy,
    onRefreshList,
    onOpenBacktest,
}: {
    strategy: StrategyListItem;
    isBusy: boolean;
    isExpanded: boolean;
    isEditing: boolean;
    onExpand: () => void;
    onEdit: () => void;
    onFinishEdit: () => void;
    onBusy: (id: string) => void;
    onRefreshList: () => void;
    onOpenBacktest: () => void;
}) {
    const { id, label, kind, execution_mode, phase, enabled, read_only, trade_counts, latest_backtest, description } = strategy;
    const hasAchieved =
        !read_only &&
        latest_backtest?.overall?.total_pnl_usd != null &&
        (latest_backtest.overall.total_pnl_usd as number) > 0;
    const backtestRunning = latest_backtest?.status === "running";
    const backtestFailed = latest_backtest?.status === "failed";
    const backtestCancelled = latest_backtest?.status === "cancelled";
    const [stopping, setStopping] = useState(false);

    async function handleStop() {
        if (!latest_backtest?.id) return;
        setStopping(true);
        try {
            await cancelStrategyBacktest(latest_backtest.id);
        } catch {
            // best effort -- the next poll will still reflect real server state
        } finally {
            setStopping(false);
            onRefreshList();
        }
    }

    return (
        <div
            className={`min-w-0 max-w-full overflow-hidden rounded-xl border transition-all ${
                read_only
                    ? "border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-slate-800/50"
                    : "border-gray-200 bg-white hover:border-emerald-300 dark:border-gray-700 dark:bg-slate-900 dark:hover:border-emerald-800"
            }`}
        >
            <div className="flex flex-wrap items-center gap-3 p-4">
                <button
                    type="button"
                    onClick={onExpand}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white break-words">
                            {label}
                        </span>
                        {read_only ? (
                            <span className="rounded-md border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:bg-slate-700 dark:text-gray-400">
                                Legacy · Always-on · Mainnet
                            </span>
                        ) : (
                            <>
                                <ExecutionModeBadge mode={execution_mode} />
                                <PhasePill phase={phase} enabled={enabled} />
                                {hasAchieved && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                        <Award className="h-3 w-3" />
                                        Achieved
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="whitespace-nowrap">
                            Kind: <code className="font-mono break-all">{kind}</code>
                        </span>
                        {trade_counts && (
                            <span className="whitespace-nowrap">
                                Trades: {trade_counts.total} ({trade_counts.open}{" "}
                                open, {trade_counts.closed} closed)
                            </span>
                        )}
                        {backtestRunning && (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Backtest running
                                {latest_backtest?.created_at &&
                                    ` — started ${formatRelativeTime(latest_backtest.created_at)}`}
                            </span>
                        )}
                        {backtestRunning && latest_backtest?.id && (
                            <button
                                type="button"
                                disabled={stopping}
                                onClick={handleStop}
                                title="Stop this backtest"
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                            >
                                {stopping ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Ban className="h-3 w-3" />
                                )}
                                Stop
                            </button>
                        )}
                        {backtestFailed && (
                            <span
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                title={latest_backtest?.error ?? undefined}
                            >
                                <AlertTriangle className="h-3 w-3" />
                                Backtest failed
                                {latest_backtest?.error && `: ${latest_backtest.error}`}
                            </span>
                        )}
                        {backtestCancelled && (
                            <span
                                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                title="Stopped by user before it finished"
                            >
                                <XCircle className="h-3 w-3" />
                                Backtest cancelled
                            </span>
                        )}
                        {!backtestRunning &&
                            !backtestFailed &&
                            !backtestCancelled &&
                            latest_backtest?.overall?.total_pnl_usd != null && (
                                <span className="whitespace-nowrap">
                                    Last backtest PnL:{" "}
                                    {(latest_backtest.overall.total_pnl_usd as number) >= 0
                                        ? "+"
                                        : ""}
                                    ${(latest_backtest.overall.total_pnl_usd as number).toFixed(2)}
                                </span>
                            )}
                        {description && (
                            <span className="italic break-words">{description}</span>
                        )}
                    </div>
                    {!read_only && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            <HeartbeatPill
                                lastEvaluatedAt={strategy.last_evaluated_at}
                                enabled={enabled}
                            />
                            {strategy.last_reason && (
                                <span
                                    className="italic text-gray-500 break-words dark:text-gray-400"
                                    title="Reason the runner gave for its last decision"
                                >
                                    “{strategy.last_reason}”
                                </span>
                            )}
                            {strategy.current_journal_id && (
                                <Link
                                    href={`/journal?id=${strategy.current_journal_id}`}
                                    className="inline-flex items-center gap-1 whitespace-nowrap text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400"
                                >
                                    View open trade <ExternalLink className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    )}
                    <PerformanceSummary strategy={strategy} />
                </div>

                {!read_only && (
                    <div className="flex-shrink-0 flex flex-wrap items-center justify-end gap-1.5">
                        <button
                            type="button"
                            disabled={isBusy}
                            onClick={async () => {
                                onBusy(id);
                                try {
                                    if (enabled) {
                                        await deactivateStrategy(id);
                                    } else {
                                        await activateStrategy(id);
                                    }
                                } finally {
                                    onBusy("");
                                    onRefreshList();
                                }
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                enabled
                                    ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                    : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            }`}
                        >
                            {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : enabled ? (
                                <>
                                    <Square className="h-3 w-3" />
                                    Deactivate
                                </>
                            ) : (
                                <>
                                    <Play className="h-3 w-3" />
                                    Activate
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            disabled={isBusy || backtestRunning}
                            onClick={onOpenBacktest}
                            title={backtestRunning ? "A backtest is already running for this strategy" : undefined}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                        >
                            {backtestRunning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <>
                                    <RotateCcw className="h-3 w-3" />
                                    Backtest
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                        >
                            <Settings2 className="h-3 w-3" />
                            Edit
                        </button>
                    </div>
                )}
            </div>

            {isExpanded && !isEditing && (
                <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400">
                    <StrategyDetail strategy={strategy} />
                </div>
            )}

            {isEditing && (
                <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                    <StrategyEditor
                        strategy={strategy}
                        onSave={async () => {
                            onFinishEdit();
                            onRefreshList();
                        }}
                        onCancel={onFinishEdit}
                    />
                </div>
            )}
        </div>
    );
}

function ExecutionModeBadge({ mode }: { mode: "mainnet" | "demo" }) {
    return mode === "demo" ? (
        <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
            Demo
        </span>
    ) : (
        <span className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
            Mainnet
        </span>
    );
}

function PhasePill({
    phase,
    enabled,
}: {
    phase: string;
    enabled: boolean;
}) {
    const colors: Record<string, string> = {
        idle: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        armed: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        in_position: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        always_on: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
    const label = enabled
        ? phase === "in_position"
            ? "In Position"
            : phase === "armed"
              ? "Armed"
              : phase === "always_on"
                ? "Always On"
                : "Idle"
        : "Disabled";

    return (
        <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                enabled ? colors[phase] ?? colors.idle : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
        >
            {label}
        </span>
    );
}

function HeartbeatPill({
    lastEvaluatedAt,
    enabled,
}: {
    lastEvaluatedAt?: string | null;
    enabled: boolean;
}) {
    if (!lastEvaluatedAt) {
        return (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                Never ticked
            </span>
        );
    }
    const ageMin = (Date.now() - new Date(lastEvaluatedAt).getTime()) / 60000;
    // The scheduler ticks every 5 min -- more than ~2x that with no
    // update means the job itself stopped firing, not just "idle".
    const stale = enabled && ageMin > 12;
    const veryStale = enabled && ageMin > 30;
    const colors = veryStale
        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
        : stale
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${colors}`}
            title="Last time the scheduler actually evaluated this strategy -- proves it's ticking, not just marked Armed"
        >
            <Clock className="h-3 w-3" />
            {enabled ? "Last check-in" : "Last active"}: {formatRelativeTime(lastEvaluatedAt)}
        </span>
    );
}

function PerformanceSummary({ strategy }: { strategy: StrategyListItem }) {
    const perf = strategy.performance;
    if (perf) {
        const pnlPositive = (perf.total_pnl ?? 0) >= 0;
        const winRatePct = perf.win_rate != null ? Math.round(perf.win_rate * 100) : null;
        return (
            <div className="mt-1 text-[11px]">
                <span
                    className={`whitespace-nowrap font-medium ${
                        pnlPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                    }`}
                >
                    {strategy.execution_mode === "demo" ? "Demo" : "Live"} PnL:{" "}
                    {pnlPositive ? "+" : ""}
                    ${(perf.total_pnl ?? 0).toFixed(2)}
                    {winRatePct != null && ` (${winRatePct}% win, ${perf.closed} closed)`}
                </span>
            </div>
        );
    }
    if (strategy.read_only) return null;
    return (
        <div className="mt-1 text-[11px]">
            <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Not tested yet —{" "}
                {strategy.execution_mode === "demo"
                    ? "activate to start collecting demo performance data"
                    : "no closed trades yet"}
            </span>
        </div>
    );
}

function PerformanceDetail({ performance: perf, strategy }: { performance: StrategyPerformance | null | undefined; strategy: StrategyListItem }) {
    if (!perf) {
        return (
            <div className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-medium">
                    <Info className="h-3.5 w-3.5" />
                    No closed trades yet
                </div>
                <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    {strategy.read_only
                        ? "No performance data recorded for this job yet."
                        : strategy.execution_mode === "demo"
                          ? "Activate this strategy to start collecting real demo-mode performance data (win rate, PnL) before considering mainnet."
                          : "This strategy hasn't closed a trade yet -- performance will populate once one does."}
                </p>
            </div>
        );
    }
    const winRatePct = perf.win_rate != null ? Math.round(perf.win_rate * 100) : null;
    const pnlPositive = (perf.total_pnl ?? 0) >= 0;
    return (
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
                label="Win rate"
                value={winRatePct != null ? `${winRatePct}%` : "—"}
                sub={`${perf.wins}W / ${perf.losses}L`}
            />
            <Stat
                label="Total PnL"
                value={`${pnlPositive ? "+" : ""}$${(perf.total_pnl ?? 0).toFixed(2)}`}
                valueClassName={pnlPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            />
            <Stat
                label="Avg PnL / trade"
                value={perf.avg_pnl != null ? `${perf.avg_pnl >= 0 ? "+" : ""}$${perf.avg_pnl.toFixed(2)}` : "—"}
            />
            <Stat
                label="Closed trades"
                value={String(perf.closed)}
                sub={perf.last_closed_at ? `Last: ${formatRelativeTime(perf.last_closed_at)}` : undefined}
            />
        </div>
    );
}

function Stat({
    label,
    value,
    sub,
    valueClassName,
}: {
    label: string;
    value: string;
    sub?: string;
    valueClassName?: string;
}) {
    return (
        <div className="min-w-0 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-slate-800/60">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {label}
            </div>
            <div className={`mt-0.5 truncate text-sm font-semibold text-gray-900 dark:text-white ${valueClassName ?? ""}`}>
                {value}
            </div>
            {sub && <div className="truncate text-[10px] text-gray-400 dark:text-gray-500">{sub}</div>}
        </div>
    );
}

function StrategyDetail({ strategy }: { strategy: StrategyListItem }) {
    const { risk_params, entry_filters, latest_backtest } = strategy;
    return (
        <div className="space-y-3">
            {latest_backtest && (
                <div className="min-w-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        Latest backtest run:
                    </span>
                    <div className="mt-1">
                        <BacktestRunDetail run={latest_backtest} />
                    </div>
                </div>
            )}
            <div className="min-w-0">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                    Performance history:
                </span>
                <div className="mt-1">
                    <PerformanceDetail performance={strategy.performance} strategy={strategy} />
                </div>
            </div>
            {risk_params && (
                <div className="min-w-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        Risk params:
                    </span>
                    <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-[11px] dark:border-gray-700 dark:bg-slate-800/60">
                        {formatJson(risk_params)}
                    </pre>
                </div>
            )}
            {entry_filters && Object.keys(entry_filters).length > 0 && (
                <div className="min-w-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                        Entry filters:
                    </span>
                    <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-[11px] dark:border-gray-700 dark:bg-slate-800/60">
                        {formatJson(entry_filters)}
                    </pre>
                </div>
            )}
            {(!risk_params || (entry_filters && Object.keys(entry_filters).length === 0)) && (
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Info className="h-3.5 w-3.5" />
                    No configurable parameters
                </div>
            )}
        </div>
    );
}

// "Proper logs" for a backtest run: what it was started with, when, and
// (for a finished run) a lazily-fetched trade-by-trade log -- lets the
// user actually verify a running/completed/failed/cancelled run behaved
// the way they expect, instead of only seeing a status pill.
function BacktestRunDetail({ run }: { run: BacktestRunSummary }) {
    const statusColors: Record<string, string> = {
        running: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
        completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    };
    const status = String(run.status ?? "unknown");
    return (
        <div className="min-w-0 space-y-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-slate-800/60">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span
                    className={`rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wide ${statusColors[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}
                >
                    {status}
                </span>
                {run.created_at && (
                    <span className="text-gray-500 dark:text-gray-400">
                        Started {formatRelativeTime(run.created_at)}
                    </span>
                )}
            </div>
            {run.params && (
                <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-gray-100 bg-white px-2 py-1.5 font-mono text-[11px] dark:border-gray-700 dark:bg-slate-900">
                    {formatJson(run.params)}
                </pre>
            )}
            {(status === "failed" || status === "cancelled") && run.error && (
                <p className="break-words text-[11px] text-red-600 dark:text-red-400">
                    {run.error}
                </p>
            )}
            {status === "completed" && run.id && <BacktestTradesPanel runId={run.id} />}
        </div>
    );
}

function BacktestTradesPanel({ runId }: { runId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [trades, setTrades] = useState<Array<Record<string, unknown>> | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleToggle() {
        if (open) {
            setOpen(false);
            return;
        }
        setOpen(true);
        if (trades !== null) return; // already fetched
        setLoading(true);
        setError(null);
        try {
            const res = await fetchBacktestTrades(runId);
            setTrades(res.trades);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load trades");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-w-0">
            <button
                type="button"
                onClick={handleToggle}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {trades ? `View trades (${trades.length})` : "View trades"}
            </button>
            {open && (
                <div className="mt-1.5 max-h-64 max-w-full overflow-auto rounded-md border border-gray-100 dark:border-gray-700">
                    {loading && (
                        <div className="flex items-center gap-1.5 p-2 text-[11px] text-gray-500 dark:text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading trade log…
                        </div>
                    )}
                    {error && (
                        <p className="p-2 text-[11px] text-red-600 dark:text-red-400">{error}</p>
                    )}
                    {trades && trades.length === 0 && !loading && (
                        <p className="p-2 text-[11px] text-gray-500 dark:text-gray-400">
                            No trades recorded for this run.
                        </p>
                    )}
                    {trades && trades.length > 0 && (
                        <table className="w-full min-w-[420px] text-left text-[11px]">
                            <thead className="bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                                <tr>
                                    <th className="px-2 py-1 font-medium">Side</th>
                                    <th className="px-2 py-1 font-medium">Entry</th>
                                    <th className="px-2 py-1 font-medium">Exit</th>
                                    <th className="px-2 py-1 font-medium">PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.slice(0, 200).map((t, i) => {
                                    const pnl = Number(t.pnl_usd ?? t.pnl ?? 0);
                                    return (
                                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="px-2 py-1">{String(t.side ?? "—")}</td>
                                            <td className="px-2 py-1">{String(t.entry_price ?? t.entry ?? "—")}</td>
                                            <td className="px-2 py-1">{String(t.exit_price ?? t.exit ?? "—")}</td>
                                            <td className={`px-2 py-1 font-medium ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                                {pnl >= 0 ? "+" : ""}
                                                {pnl.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {trades && trades.length > 200 && (
                        <p className="border-t border-gray-100 p-2 text-[11px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
                            Showing first 200 of {trades.length} trades.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function StrategyEditor({
    strategy,
    onSave,
    onCancel,
}: {
    strategy: StrategyListItem;
    onSave: () => void;
    onCancel: () => void;
}) {
    const rp = (strategy.risk_params ?? {}) as Partial<StrategyRiskParams>;
    const ef = (strategy.entry_filters ?? {}) as Partial<StrategyEntryFilters>;

    const [marginUsd, setMarginUsd] = useState(rp.margin_usd ?? 10);
    const [leverage, setLeverage] = useState(rp.leverage ?? 3);
    const [atrStopMult, setAtrStopMult] = useState(rp.atr_stop_mult ?? 2);
    const [atrTargetMult, setAtrTargetMult] = useState(rp.atr_target_mult ?? 4);
    const [busy, setBusy] = useState(false);

    async function handleSave() {
        setBusy(true);
        try {
            await updateStrategySettings(
                {
                    risk_params: {
                        margin_usd: marginUsd,
                        leverage,
                        atr_stop_mult: atrStopMult,
                        atr_target_mult: atrTargetMult,
                        big_trade_notional_usd: rp.big_trade_notional_usd ?? 5000,
                    },
                    entry_filters: ef,
                },
                strategy.id,
            );
            onSave();
        } catch {
            // best effort
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Edit Parameters — {strategy.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        Margin (USD)
                    </span>
                    <input
                        type="number"
                        value={marginUsd}
                        onChange={(e) => setMarginUsd(Number(e.target.value))}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        Leverage
                    </span>
                    <input
                        type="number"
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        ATR Stop Mult
                    </span>
                    <input
                        type="number"
                        step="0.1"
                        value={atrStopMult}
                        onChange={(e) => setAtrStopMult(Number(e.target.value))}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        ATR Target Mult
                    </span>
                    <input
                        type="number"
                        step="0.1"
                        value={atrTargetMult}
                        onChange={(e) => setAtrTargetMult(Number(e.target.value))}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                    />
                </label>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={busy}
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                    {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Monitor className="h-3.5 w-3.5" />
                    )}
                    Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-slate-800"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

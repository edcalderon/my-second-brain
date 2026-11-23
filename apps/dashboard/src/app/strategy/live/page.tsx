"use client";

// Dedicated per-strategy monitoring dashboard + tracker. Reads `?id=` from
// window.location (static export: no dynamic route, and useSearchParams would
// need a Suspense boundary -- same approach as app/journal/page.tsx). Renders
// only what GET /strategies/{id}/monitor returns; every section degrades to
// an empty state when the backend omits it.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Clock,
    ExternalLink,
    Loader2,
    Play,
    RefreshCw,
    ShieldAlert,
    Square,
    TrendingDown,
    TrendingUp,
} from "lucide-react";
import {
    TradingApiError,
    activateStrategy,
    deactivateStrategy,
    fetchStrategyMonitor,
    type JournalEntry,
    type StrategyListItem,
    type StrategyMonitorEvent,
    type StrategyMonitorPosition,
    type StrategyMonitorResponse,
    type StrategyMonitorRisk,
} from "@/lib/hummingbot-api";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/hummingbot-format";
import { refreshLiveStrategies, useLiveStrategies } from "@/lib/useLiveStrategies";

const POLL_INTERVAL_MS = 10000;

function num(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function signedCurrency(value: number | null): string {
    if (value === null) return "--";
    return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
}

function pnlColor(value: number | null): string {
    if (value === null || value === 0) return "text-gray-900 dark:text-white";
    return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

// ── Small shared bits ──────────────────────────────────────────

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="glass-panel rounded-2xl p-5 space-y-4">
            <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
    return (
        <div className="rounded-lg border border-border bg-white px-3 py-2 dark:bg-slate-900">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${tone ?? "text-gray-900 dark:text-white"}`}>
                {value}
            </p>
        </div>
    );
}

function PhasePill({ phase, enabled }: { phase: string; enabled: boolean }) {
    const colors: Record<string, string> = {
        idle: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
        armed: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        in_position: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    };
    const label = !enabled && phase !== "in_position"
        ? "Disabled"
        : phase === "in_position"
          ? "In position"
          : phase === "armed"
            ? "Armed"
            : "Idle";
    return (
        <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                !enabled && phase !== "in_position" ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" : colors[phase] ?? colors.idle
            }`}
        >
            {label}
        </span>
    );
}

function Heartbeat({ lastEvaluatedAt, enabled }: { lastEvaluatedAt?: string | null; enabled: boolean }) {
    if (!lastEvaluatedAt) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                Never ticked
            </span>
        );
    }
    const ageMin = (Date.now() - new Date(lastEvaluatedAt).getTime()) / 60000;
    const colors =
        enabled && ageMin > 30
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            : enabled && ageMin > 12
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    return (
        <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${colors}`}
            title="Last time the scheduler evaluated this strategy -- a stale value means the job stopped firing"
        >
            <Clock className="h-3 w-3" />
            {enabled ? "Last check-in" : "Last active"}: {formatRelativeTime(lastEvaluatedAt)}
        </span>
    );
}

// Tiny dependency-free cumulative-PnL line over closed trades, oldest first.
function Sparkline({ values }: { values: number[] }) {
    if (values.length < 2) {
        return <p className="text-xs text-gray-500 dark:text-gray-400">Not enough closed trades for a curve yet.</p>;
    }
    const w = 320;
    const h = 72;
    const pad = 4;
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min || 1;
    const x = (i: number) => pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
    const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const last = values[values.length - 1];
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full" role="img" aria-label="Cumulative realized PnL">
            <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} className="stroke-gray-300 dark:stroke-gray-600" strokeDasharray="3 3" />
            <polyline
                points={points}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                className={last >= 0 ? "stroke-emerald-500" : "stroke-rose-500"}
            />
        </svg>
    );
}

// ── Sections ───────────────────────────────────────────────────

function PositionCard({ position }: { position: StrategyMonitorPosition | null | undefined }) {
    if (!position) {
        return (
            <Panel title="Position" subtitle="What this strategy currently holds.">
                <p className="text-sm text-gray-500 dark:text-gray-400">Flat -- no open position.</p>
            </Panel>
        );
    }
    const side = String(position.side ?? "").toLowerCase();
    const isLong = side === "long" || side === "buy";
    const mark = num(position.mark_price);
    const stop = num(position.stop_price);
    const liq = num(position.liq_price);
    const pnl = num(position.unrealized_pnl);
    const distStop = mark !== null && stop !== null && mark !== 0 ? (Math.abs(mark - stop) / mark) * 100 : null;
    const distLiq = mark !== null && liq !== null && mark !== 0 ? (Math.abs(mark - liq) / mark) * 100 : null;
    return (
        <Panel title="Position" subtitle="What this strategy currently holds.">
            <div className="flex flex-wrap items-center gap-2">
                <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                        isLong
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                >
                    {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isLong ? "Long" : "Short"}
                </span>
                {position.journal_id && (
                    <Link
                        href={`/journal?id=${encodeURIComponent(position.journal_id)}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                        Journal entry <ExternalLink className="h-3 w-3" />
                    </Link>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <Stat label="Size" value={formatNumber(position.size, 4)} />
                <Stat label="Entry" value={formatNumber(position.entry_price, 2)} />
                <Stat label="Mark" value={formatNumber(position.mark_price, 2)} />
                <Stat label="Leverage" value={position.leverage != null ? `${formatNumber(position.leverage, 1)}x` : "--"} />
                <Stat label="Stop" value={stop !== null ? formatNumber(stop, 2) : "NO STOP"} tone={stop === null ? "text-rose-600 dark:text-rose-400" : undefined} />
                <Stat label="To stop" value={distStop !== null ? `${distStop.toFixed(2)}%` : "--"} />
                <Stat label="To liquidation" value={distLiq !== null ? `${distLiq.toFixed(2)}%` : "--"} tone={distLiq !== null && distLiq < 5 ? "text-rose-600 dark:text-rose-400" : undefined} />
                <Stat label="Unrealized PnL" value={signedCurrency(pnl)} tone={pnlColor(pnl)} />
            </div>
        </Panel>
    );
}

function RiskPanel({ risk }: { risk: StrategyMonitorRisk | null | undefined }) {
    if (!risk) {
        return (
            <Panel title="Risk" subtitle="Hard limits enforced before every entry.">
                <p className="text-sm text-gray-500 dark:text-gray-400">Risk data unavailable.</p>
            </Panel>
        );
    }
    const equity = num(risk.equity_usd);
    const dayPnl = num(risk.day_pnl_usd);
    const limitPct = num(risk.daily_loss_limit_pct);
    const lossPct = equity !== null && dayPnl !== null && equity > 0 ? Math.max(0, (-dayPnl / (equity - dayPnl)) * 100) : null;
    const usedPct = lossPct !== null && limitPct ? Math.min(100, (lossPct / limitPct) * 100) : null;
    return (
        <Panel title="Risk" subtitle="Hard limits enforced before every entry.">
            {risk.daily_halt && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Daily loss limit reached -- new entries are halted until the next day.</span>
                </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Equity" value={formatCurrency(equity)} />
                <Stat label="Today's PnL" value={signedCurrency(dayPnl)} tone={pnlColor(dayPnl)} />
                <Stat label="Risk / trade" value={risk.risk_per_trade_pct != null ? `${formatNumber(risk.risk_per_trade_pct, 2)}%` : "--"} />
                <Stat label="Max leverage" value={risk.max_leverage != null ? `${formatNumber(risk.max_leverage, 1)}x` : "--"} />
                <Stat label="Max notional" value={formatCurrency(risk.max_notional_usd)} />
                <Stat label="Daily loss limit" value={limitPct !== null ? `${formatNumber(limitPct, 2)}%` : "--"} />
            </div>
            {usedPct !== null && (
                <div>
                    <div className="mb-1 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span>Daily loss budget used</span>
                        <span className="tabular-nums">{usedPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                        <div
                            className={`h-full rounded-full ${usedPct >= 100 ? "bg-rose-500" : usedPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${usedPct}%` }}
                        />
                    </div>
                </div>
            )}
        </Panel>
    );
}

function PerformancePanel({ strategy, trades }: { strategy: Partial<StrategyListItem>; trades: JournalEntry[] }) {
    const perf = strategy.performance;
    const closed = [...trades]
        .filter((t) => t.status === "closed" && num(t.realized_pnl) !== null)
        .sort((a, b) => new Date(a.closed_at ?? a.created_at).getTime() - new Date(b.closed_at ?? b.created_at).getTime());
    let running = 0;
    const curve = closed.map((t) => (running += num(t.realized_pnl) ?? 0));
    return (
        <Panel title="Performance" subtitle="Realized PnL over this strategy's closed trades.">
            {perf ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <Stat label="Closed" value={String(perf.closed)} />
                    <Stat label="Win rate" value={perf.win_rate != null ? `${Math.round(perf.win_rate * 100)}%` : "--"} />
                    <Stat label="Total PnL" value={signedCurrency(num(perf.total_pnl))} tone={pnlColor(num(perf.total_pnl))} />
                    <Stat label="Avg PnL" value={signedCurrency(num(perf.avg_pnl))} tone={pnlColor(num(perf.avg_pnl))} />
                    <Stat label="Best" value={signedCurrency(num(perf.best_trade))} tone={pnlColor(num(perf.best_trade))} />
                    <Stat label="Worst" value={signedCurrency(num(perf.worst_trade))} tone={pnlColor(num(perf.worst_trade))} />
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No closed trades yet -- nothing to measure.</p>
            )}
            <div>
                <p className="mb-1 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cumulative PnL (last {closed.length} closed)
                </p>
                <Sparkline values={curve} />
            </div>
        </Panel>
    );
}

function TradesTable({ trades }: { trades: JournalEntry[] }) {
    return (
        <Panel title="Trades" subtitle="Journal entries opened by this strategy, newest first.">
            {trades.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No trades yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Side</th>
                                <th className="px-3 py-2 text-right">Entry</th>
                                <th className="px-3 py-2 text-right">Exit</th>
                                <th className="px-3 py-2 text-right">PnL</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Opened</th>
                                <th className="px-3 py-2">Closed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {trades.map((t) => {
                                const pnl = num(t.realized_pnl);
                                return (
                                    <tr key={t.id}>
                                        <td className="whitespace-nowrap px-3 py-2">
                                            <Link
                                                href={`/journal?id=${encodeURIComponent(t.id)}`}
                                                className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                                            >
                                                #{t.trade_number}
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 capitalize text-gray-900 dark:text-white">{t.side}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900 dark:text-white">{formatNumber(t.entry_price, 2)}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-gray-900 dark:text-white">{formatNumber(t.exit_price, 2)}</td>
                                        <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${pnlColor(pnl)}`}>{signedCurrency(pnl)}</td>
                                        <td className="whitespace-nowrap px-3 py-2 capitalize text-gray-700 dark:text-gray-300">{t.status}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{t.opened_at ? formatRelativeTime(t.opened_at) : "--"}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{t.closed_at ? formatRelativeTime(t.closed_at) : "--"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}

function EventRow({ event }: { event: StrategyMonitorEvent }) {
    const [open, setOpen] = useState(false);
    return (
        <li className="rounded-lg border border-border bg-white px-3 py-2 dark:bg-slate-900">
            <button
                type="button"
                onClick={() => event.details && setOpen((v) => !v)}
                className="flex w-full items-start gap-2 text-left"
            >
                <span className="mt-0.5 shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {event.analysis_type ?? "event"}
                </span>
                <span className="min-w-0 flex-1 text-sm text-gray-900 dark:text-white">{event.summary ?? "--"}</span>
                <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
                    {event.created_at ? formatRelativeTime(event.created_at) : ""}
                </span>
                {event.details &&
                    (open ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />)}
            </button>
            {open && event.details && (
                <p className="mt-2 whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-gray-300">{event.details}</p>
            )}
        </li>
    );
}

function EventLog({ events }: { events: StrategyMonitorEvent[] }) {
    return (
        <Panel title="Event log" subtitle="Decisions and state changes recorded for this strategy.">
            {events.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No events yet.</p>
            ) : (
                <ul className="space-y-2">
                    {events.map((e, i) => (
                        <EventRow key={e.id ?? i} event={e} />
                    ))}
                </ul>
            )}
        </Panel>
    );
}

// ── Picker (no ?id=) ───────────────────────────────────────────

function Picker() {
    const { live, loading } = useLiveStrategies();
    return (
        <div className="mx-auto max-w-3xl space-y-4 pb-16">
            <header>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Strategy Desk</p>
                <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Live strategies</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Pick a running strategy to open its monitor.</p>
            </header>
            {loading ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
            ) : live.length === 0 ? (
                <div className="glass-panel rounded-2xl p-6 text-sm text-gray-600 dark:text-gray-400">
                    No strategy is running.{" "}
                    <Link href="/strategy" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                        Go to the Strategy Desk
                    </Link>{" "}
                    to activate one.
                </div>
            ) : (
                <ul className="space-y-2">
                    {live.map((s) => (
                        <li key={s.id}>
                            <Link
                                href={`/strategy/live?id=${encodeURIComponent(s.id)}`}
                                className="glass-panel flex items-center justify-between gap-3 rounded-xl px-4 py-3 hover:scale-[1.005] transition-transform"
                            >
                                <span className="font-semibold text-gray-900 dark:text-white">{s.label}</span>
                                <PhasePill phase={s.phase} enabled={s.enabled} />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Monitor (with ?id=) ────────────────────────────────────────

function Monitor({ id }: { id: string }) {
    const [data, setData] = useState<StrategyMonitorResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<{ status: number | null; message: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const res = await fetchStrategyMonitor(id);
            setData(res);
            setError(null);
        } catch (err) {
            // Keep the last good data on screen; just flag the failure.
            setError({
                status: err instanceof TradingApiError ? err.status : null,
                message: err instanceof Error ? err.message : "Failed to load strategy monitor",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        setData(null);
        setLoading(true);
        let cancelled = false;
        const tick = () => {
            if (!cancelled && !document.hidden) void load();
        };
        void load();
        const timer = setInterval(tick, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [load]);

    const strategy = data?.strategy ?? null;
    const enabled = Boolean(strategy?.enabled);
    const phase = strategy?.phase ?? "idle";
    const label = strategy?.label ?? id;
    const mainnet = strategy?.execution_mode === "mainnet";

    async function toggle() {
        if (!strategy) return;
        if (!enabled && mainnet && !window.confirm(
            `Activate "${label}"?\n\nThis strategy trades REAL money on the live account. It can open and close positions on its own once armed.`,
        )) {
            return;
        }
        setBusy(true);
        try {
            if (enabled) await deactivateStrategy(id);
            else await activateStrategy(id);
        } catch (err) {
            setError({ status: null, message: err instanceof Error ? err.message : "Request failed" });
        } finally {
            setBusy(false);
            refreshLiveStrategies();
            void load();
        }
    }

    if (loading && !data) {
        return (
            <div className="mx-auto max-w-5xl space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                ))}
            </div>
        );
    }

    if (!data) {
        return (
            <div className="mx-auto max-w-3xl space-y-4">
                <Link href="/strategy/live" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline dark:text-gray-400">
                    <ArrowLeft className="h-4 w-4" /> Live strategies
                </Link>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        {error?.status === 404
                            ? `Strategy "${id}" was not found.`
                            : `Could not load the strategy monitor${error ? `: ${error.message}` : "."}`}
                    </span>
                </div>
            </div>
        );
    }

    const trades = data.trades ?? [];
    const events = data.events ?? [];

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
            <header className="space-y-3">
                <Link href="/strategy/live" className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline dark:text-gray-400">
                    <ArrowLeft className="h-3.5 w-3.5" /> Live strategies
                </Link>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">{label}</h1>
                            {mainnet && (
                                <span className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                                    Live · real money
                                </span>
                            )}
                            {strategy?.execution_mode === "demo" && (
                                <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                    Demo
                                </span>
                            )}
                            <PhasePill phase={phase} enabled={enabled} />
                            <Heartbeat lastEvaluatedAt={strategy?.last_evaluated_at} enabled={enabled} />
                        </div>
                        {strategy?.description && <p className="text-sm text-gray-600 dark:text-gray-400">{strategy.description}</p>}
                        {strategy?.last_reason && (
                            <p className="text-xs italic text-gray-500 dark:text-gray-400" title="Reason the runner gave for its last decision">
                                “{strategy.last_reason}”
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:hover:bg-slate-800"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        {strategy && !strategy.read_only && (
                            <button
                                type="button"
                                onClick={toggle}
                                disabled={busy}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                                    enabled
                                        ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                        : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                                }`}
                            >
                                {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : enabled ? (
                                    <>
                                        <Square className="h-3 w-3" /> Deactivate
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3 w-3" /> Activate
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Showing the last data received -- latest refresh failed: {error.message}</span>
                </div>
            )}

            <PositionCard position={data.position} />
            <RiskPanel risk={data.risk} />
            <PerformancePanel strategy={strategy ?? {}} trades={trades} />
            <TradesTable trades={trades} />
            <EventLog events={events} />
        </div>
    );
}

export default function LiveStrategyPage() {
    // Read ?id= client-side only (static export; see file header).
    const [id, setId] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        setId(new URLSearchParams(window.location.search).get("id"));
    }, []);

    if (id === undefined) {
        return <div className="mx-auto h-28 max-w-3xl animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />;
    }
    return id ? <Monitor id={id} /> : <Picker />;
}

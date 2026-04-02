"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    ArrowUpRight,
    CandlestickChart,
    Clock3,
    Database,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { BalanceChartCard } from "@/components/portfolio/BalanceChart";
import { PortfolioLoading } from "@/components/portfolio/PortfolioLoading";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import {
    appendBalanceSample,
    combineBalanceSeries,
    createLiveBalanceSample,
    hasMeaningfulBalance,
    type BalancePoint,
} from "@/lib/balance-series";
import { readPortfolioLiveCache, writePortfolioLiveCache, type PortfolioLiveCache } from "@/lib/trading-cache";
import {
    fetchPortfolioTracker,
    fetchTradingStatus,
    type HummingbotPortfolioTracker,
    type HummingbotStatus,
} from "@/lib/hummingbot-api";
import { formatAddress, formatCurrency, formatJson, formatNumber, formatRelativeTime, formatTime, normalizePosition } from "@/lib/hummingbot-format";

const quickLinks = [
    {
        href: "/strategy",
        label: "Strategy Desk",
        description: "Preview signals before you open a paper trade.",
        icon: Sparkles,
    },
    {
        href: "/market",
        label: "Market Feed",
        description: "Review candles and market context for the current pair.",
        icon: CandlestickChart,
    },
    {
        href: "/risk",
        label: "Risk View",
        description: "Check exposure, allocation, and safety posture.",
        icon: ShieldCheck,
    },
    {
        href: "/execution",
        label: "Execution",
        description: "Open or close paper trades against the live backend.",
        icon: Wallet,
    },
];

const LIVE_TRACKER_TIMEOUT_MS = 4500;

async function fetchWithTimeout<T>(request: (init?: RequestInit) => Promise<T>, timeoutMs = LIVE_TRACKER_TIMEOUT_MS): Promise<T> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await request({ signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

export default function PortfolioPage() {
    const { portfolio, portfolioHistory, loading: portfolioLoading, error: portfolioError } = useSupabaseData();
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [tracker, setTracker] = useState<HummingbotPortfolioTracker | null>(null);
    const [cacheSnapshot, setCacheSnapshot] = useState<PortfolioLiveCache | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [liveSamples, setLiveSamples] = useState<BalancePoint[]>([]);

    useEffect(() => {
        let isMounted = true;
        const cachedSnapshot = readPortfolioLiveCache();

        if (cachedSnapshot) {
            setStatus(cachedSnapshot.status);
            setTracker(cachedSnapshot.tracker);
            setLiveSamples(cachedSnapshot.liveSamples);
            setCacheSnapshot(cachedSnapshot);
            setLoading(false);
        }

        async function load() {
            setRefreshing(true);

            const [statusResult, trackerResult] = await Promise.allSettled([
                fetchWithTimeout(fetchTradingStatus),
                fetchWithTimeout(fetchPortfolioTracker),
            ]);

            if (!isMounted) {
                return;
            }

            const nextErrors: string[] = [];
            let nextStatus: HummingbotStatus | null = null;
            let nextTracker: HummingbotPortfolioTracker | null = null;
            let nextLiveSamples = cachedSnapshot?.liveSamples ?? liveSamples;

            if (statusResult.status === "fulfilled") {
                nextStatus = statusResult.value;
                setStatus(nextStatus);
            } else {
                nextErrors.push("Trading status is temporarily unavailable");
            }

            if (trackerResult.status === "fulfilled") {
                nextTracker = trackerResult.value;
                setTracker(nextTracker);
            } else {
                nextErrors.push("Portfolio tracker is temporarily unavailable");
            }

            const summary = nextTracker?.summary ?? nextStatus?.portfolio_summary ?? null;
            const sample = createLiveBalanceSample(
                summary?.snapshot_time ?? nextTracker?.snapshot_time ?? new Date().toISOString(),
                summary?.current_balance_usd ?? summary?.total_value_usd,
                summary?.current_balance_eth ?? summary?.total_value_eth,
            );

            if (sample) {
                const shouldRecord = hasMeaningfulBalance(sample) || (portfolioHistory.length === 0 && nextLiveSamples.length === 0);
                if (shouldRecord) {
                    nextLiveSamples = appendBalanceSample(nextLiveSamples, sample);
                    setLiveSamples(nextLiveSamples);
                }
            }

            if (nextStatus || nextTracker) {
                const nextCache: PortfolioLiveCache = {
                    status: nextStatus,
                    tracker: nextTracker,
                    liveSamples: nextLiveSamples,
                    savedAt: new Date().toISOString(),
                };
                setCacheSnapshot(nextCache);
                writePortfolioLiveCache(nextCache);
            }

            setError(nextErrors.length ? nextErrors.join(" • ") : null);
            setLoading(false);
            setRefreshing(false);
        }

        load();
        const intervalId = window.setInterval(load, 15_000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [refreshCounter, portfolioHistory.length]);

    const chartPoints = combineBalanceSeries(portfolioHistory, liveSamples);
    const history = portfolioHistory.slice(0, 12);
    const latestStoredSnapshot = portfolio || history[0] || null;
    const liveSummary = tracker?.summary ?? status?.portfolio_summary ?? null;
    const mainWallet = tracker?.main_wallet ?? status?.main_wallet ?? null;
    const mainWalletAddress = mainWallet?.wallet_address ?? liveSummary?.main_wallet_address ?? null;
    const mainWalletUsdc = mainWallet?.balance_usd ?? liveSummary?.main_wallet_usdc ?? null;
    const liveBalanceUsd = liveSummary?.current_balance_usd ?? liveSummary?.total_value_usd ?? mainWalletUsdc ?? null;
    const liveBalanceEth = liveSummary?.current_balance_eth ?? (liveSummary?.total_value_eth && liveSummary.total_value_eth > 0 ? liveSummary.total_value_eth : null);
    const hasPositiveLiveBalance = typeof liveBalanceUsd === "number" && liveBalanceUsd > 0;
    const displayedBalanceUsd = hasPositiveLiveBalance ? liveBalanceUsd : latestStoredSnapshot?.total_value_usd ?? liveBalanceUsd ?? mainWalletUsdc;
    const displayedBalanceEth = hasPositiveLiveBalance ? liveBalanceEth : latestStoredSnapshot?.total_value_eth ?? liveBalanceEth;
    const balanceSourceLabel = hasPositiveLiveBalance
        ? cacheSnapshot
            ? "Live tracker + warm cache"
            : "Live tracker"
        : latestStoredSnapshot
            ? "Latest stored snapshot"
            : cacheSnapshot
                ? "Warm cached tracker"
                : "Live tracker";
    const balanceFallbackNote = hasPositiveLiveBalance
        ? cacheSnapshot
            ? "The live tracker is publishing a positive balance and the chart below is driven by the live update stream. A warm session cache keeps the page responsive between refreshes."
            : "The live tracker is publishing a positive balance and the chart below is driven by the live update stream."
        : latestStoredSnapshot
            ? "The live tracker has not published a positive balance yet, so the latest stored snapshot is used as the current balance."
            : cacheSnapshot
                ? "The live tracker is still warming up, so the current values come from the cached session snapshot until fresh data lands."
                : "Waiting for the first live balance snapshot.";
    const latestUpdatedAt = liveSummary?.snapshot_time ?? tracker?.snapshot_time ?? latestStoredSnapshot?.time ?? null;
    const currentBalanceText = displayedBalanceUsd === null ? "--" : formatCurrency(displayedBalanceUsd, 2);
    const currentBalanceSubtext = mainWalletUsdc === null ? "USDC --" : `${formatNumber(mainWalletUsdc, 2)} USDC`;
    const liveWallet = tracker?.wallet_address || status?.wallet_address || "--";
    const liveAccount = tracker?.account_name || status?.default_account || "--";
    const liveConnector = tracker?.connector_name || status?.default_connector || "--";
    const livePositions = (tracker?.open_positions || status?.open_positions || []).map(normalizePosition);
    const trackerState = error || portfolioError
        ? cacheSnapshot
            ? "Using cached tracker"
            : "Live tracker reconnecting"
        : refreshing && cacheSnapshot
            ? "Refreshing cached tracker"
            : loading || portfolioLoading
            ? "Loading portfolio tracker"
            : "Portfolio tracker connected";
    const isInitialLoading = (loading || portfolioLoading) && !chartPoints.length && !latestStoredSnapshot && !cacheSnapshot;
    const allocationBase = liveSummary
        ? Math.max(liveSummary.total_value_eth, liveSummary.s1 + liveSummary.s2 + liveSummary.s3 + liveSummary.reserve, 0)
        : 0;
    const cacheLabel = cacheSnapshot ? `Cache ${formatRelativeTime(cacheSnapshot.savedAt)}` : "Cold start";
    const trackerFreshness = cacheSnapshot ? `Session cache ${formatRelativeTime(cacheSnapshot.savedAt)}` : "Waiting for warm cache";

    if (isInitialLoading) {
        return <PortfolioLoading />;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-16">
            <header className="rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-sm dark:border-emerald-900/30 dark:bg-slate-950 lg:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900 dark:text-emerald-300">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Trading Desk / Portfolio
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white lg:text-5xl">
                                Hyperliquid tracker
                            </h1>
                            <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400 sm:text-base">
                                Live balance, Supabase snapshots, and position exposure in one clean view. The page now keeps the tracked
                                balance visible even when the live feed is still warming up.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setRefreshCounter((value) => value + 1)}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh tracker
                        </button>
                        <Pill label={trackerState} tone={error || portfolioError ? "amber" : "emerald"} />
                        <Pill label={cacheLabel} tone={cacheSnapshot ? "emerald" : "slate"} />
                        <Pill label={chartPoints.length ? `${chartPoints.length} samples` : "No samples yet"} tone="slate" />
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    {quickLinks.map((item) => (
                        <QuickLink key={item.label} href={item.href} label={item.label} description={item.description} icon={item.icon} />
                    ))}
                </div>
            </header>

            {(error || portfolioError) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{error || portfolioError}</p>
                    </div>
                </div>
            )}

            <BalanceChartCard
                history={chartPoints}
                currentBalanceUsd={displayedBalanceUsd ?? null}
                currentBalanceEth={displayedBalanceEth ?? null}
                mainWalletAddress={mainWalletAddress}
                mainWalletUsdc={mainWalletUsdc}
                sourceLabel={balanceSourceLabel}
                updatedAt={latestUpdatedAt}
                loading={loading || (portfolioLoading && !cacheSnapshot)}
                fallbackNote={balanceFallbackNote}
            />

            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="glass-panel rounded-2xl p-6 lg:p-7">
                    <SectionHeader
                        eyebrow="Live tracker"
                        title="Identity and live feed"
                        description="This panel follows the live Hummingbot tracker, wallet identity, and connector state."
                        icon={<Wallet className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />}
                    />

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile label="Wallet" value={liveWallet} mono helper="Hyperliquid wallet address" />
                        <MetricTile label="Main wallet" value={formatAddress(mainWalletAddress)} mono helper="Main reserve wallet" />
                        <MetricTile label="Account" value={String(liveAccount)} helper="Default Hummingbot account" />
                        <MetricTile label="Connector" value={String(liveConnector)} helper="Live market connector" />
                        <MetricTile
                            label="Paper mode"
                            value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"}
                            helper="Trading mode for this environment"
                        />
                        <MetricTile label="Open positions" value={`${livePositions.length}`} helper="Positions from the live backend" />
                        <MetricTile label="Connector count" value={status ? `${status.connector_count}` : "--"} helper="Available connectors" />
                        <MetricTile label="API base" value={status?.api_url || "--"} mono helper="Backend origin" />
                        <MetricTile label="Main USDC" value={mainWalletUsdc === null ? "--" : formatCurrency(mainWalletUsdc, 2)} helper="Current main wallet USDC balance" />
                        <MetricTile
                            label="Last sync"
                            value={latestUpdatedAt ? formatTime(latestUpdatedAt) : "--"}
                            helper="Last live tracker update"
                        />
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-semibold">
                                {loading || portfolioLoading ? "Loading portfolio tracker" : "Portfolio tracker connected"}
                            </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                            {balanceFallbackNote} The live backend still publishes tracker snapshots into Supabase every minute so the
                            balance chart stays in sync with the stored trail.
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-700/80 dark:text-emerald-300/80">
                            {trackerFreshness}
                        </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <MetricTile label="Live USD" value={currentBalanceText} highlight helper={balanceSourceLabel} />
                        <MetricTile label="Live ETH" value={currentBalanceSubtext} helper={balanceFallbackNote} />
                        <MetricTile
                            label="Unrealized PnL"
                            value={liveSummary ? formatCurrency(liveSummary.unrealized_pnl, 2) : "--"}
                            tone={liveSummary && liveSummary.unrealized_pnl < 0 ? "danger" : "default"}
                            helper="Open position mark-to-market"
                        />
                        <MetricTile
                            label="Realized PnL"
                            value={liveSummary ? formatCurrency(liveSummary.realized_pnl, 2) : "--"}
                            helper="Closed trades and booked gains"
                        />
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-white p-4 shadow-sm dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                                    Allocation
                                </p>
                                <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                                    Strategy buckets and reserve
                                </h3>
                            </div>
                            <Database className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                        </div>

                        <div className="mt-4 space-y-3">
                            {liveSummary && allocationBase > 0 ? (
                                <>
                                    <AllocationBar label="S1" value={liveSummary.s1} basis={allocationBase} />
                                    <AllocationBar label="S2" value={liveSummary.s2} basis={allocationBase} />
                                    <AllocationBar label="S3" value={liveSummary.s3} basis={allocationBase} />
                                    <AllocationBar label="Reserve" value={liveSummary.reserve} basis={allocationBase} />
                                </>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                                    Allocation details will appear once the tracker publishes a non-zero portfolio state.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 lg:p-7">
                    <SectionHeader
                        eyebrow="Capital summary"
                        title="Tracked balance and account health"
                        description="The headline balance uses the live tracker when available and falls back to the latest stored snapshot."
                        icon={<TrendingUp className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />}
                    />

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <MetricTile
                            label="Total USD"
                            value={displayedBalanceUsd === null ? "--" : formatCurrency(displayedBalanceUsd, 2)}
                            highlight
                            helper={balanceSourceLabel}
                        />
                        <MetricTile
                            label="Total ETH"
                            value={displayedBalanceEth === null ? "--" : formatNumber(displayedBalanceEth, 4)}
                            highlight
                            helper="Displayed alongside the tracked USD balance"
                        />
                        <MetricTile
                            label="Unrealized PnL"
                            value={liveSummary ? formatCurrency(liveSummary.unrealized_pnl, 2) : "--"}
                            tone={liveSummary && liveSummary.unrealized_pnl < 0 ? "danger" : "default"}
                            helper="Open position mark-to-market"
                        />
                        <MetricTile
                            label="Realized PnL"
                            value={liveSummary ? formatCurrency(liveSummary.realized_pnl, 2) : "--"}
                            helper="Closed trades and booked gains"
                        />
                        <MetricTile
                            label="Aave HF"
                            value={liveSummary ? formatNumber(liveSummary.aave_hf, 2) : "--"}
                            helper="Health factor from the wallet sidecar"
                        />
                        <MetricTile
                            label="Reserve ETH"
                            value={liveSummary ? formatNumber(liveSummary.reserve, 4) : "--"}
                            helper="Unallocated reserve in the portfolio"
                        />
                    </div>

                    <div className="mt-5 rounded-[24px] border border-border bg-white/85 p-4 shadow-sm dark:bg-slate-900">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                                    Snapshot source
                                </p>
                                <p className="mt-1 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                    Latest stored snapshot:{" "}
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {latestStoredSnapshot ? formatTime(latestStoredSnapshot.time) : "waiting for the first write"}
                                    </span>
                                </p>
                            </div>
                            <Pill label={latestStoredSnapshot ? "Live + stored" : "Waiting"} tone={latestStoredSnapshot ? "emerald" : "slate"} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="glass-panel rounded-2xl p-6 lg:p-7">
                    <SectionHeader
                        eyebrow="Recent snapshots"
                        title="Supabase history from the tracker feed"
                        description="A minute-level trail of the latest stored portfolio state."
                        badge={`${history.length} stored`}
                        icon={<Clock3 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />}
                    />

                        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:bg-slate-900">
                        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                            <thead className="bg-gray-50/90 dark:bg-slate-950/70">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Time</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">USD</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Unrealized</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Realized</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Aave HF</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-slate-900">
                                {history.map((snapshot) => (
                                    <tr key={snapshot.time} className="transition-colors hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatTime(snapshot.time)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(snapshot.total_value_usd, 2)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
                                            {formatCurrency(snapshot.unrealized_pnl, 2)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
                                            {formatCurrency(snapshot.realized_pnl, 2)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                                            {formatNumber(snapshot.aave_health_factor, 2)}
                                        </td>
                                    </tr>
                                ))}
                                {!history.length && (
                                    <tr>
                                        <td className="px-4 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                                            No stored snapshots yet. The live tracker will populate this table as soon as the minute job writes
                                            to Supabase.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 lg:p-7">
                    <SectionHeader
                        eyebrow="Open positions"
                        title="Positions currently exposed by the tracker"
                        description="This is the active perpetual exposure the backend is currently seeing."
                        badge={`${livePositions.length} active`}
                        icon={<ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />}
                    />

                    <div className="mt-5 space-y-3">
                        {livePositions.length ? (
                            livePositions.map((position) => (
                                <PositionCard
                                    key={`${position.tradingPair}-${position.side}-${position.entryPrice}-${position.amount}-${position.status}`}
                                    position={position}
                                />
                            ))
                        ) : (
                            <EmptyState
                                title="No positions are open"
                                description="The tracker is flat right now, so there is no active exposure to display."
                            />
                        )}
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-2xl p-6 lg:p-7">
                <details>
                    <summary className="cursor-pointer text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Raw tracker state
                    </summary>
                    <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:bg-slate-950">
                        {formatJson(tracker?.portfolio_state || status?.portfolio_state)}
                    </pre>
                </details>
            </section>
        </div>
    );
}

function QuickLink({
    href,
    label,
    description,
    icon: Icon,
}: {
    href: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <Link
            href={href}
            prefetch={false}
            className="group inline-flex min-w-0 items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            title={description}
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
    badge,
    icon,
}: {
    eyebrow: string;
    title: string;
    description: string;
    badge?: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">{eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
            </div>

            <div className="flex items-center gap-3">
                {badge && <Pill label={badge} tone="slate" />}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {icon}
                </div>
            </div>
        </div>
    );
}

function MetricTile({
    label,
    value,
    mono = false,
    tone = "default",
    highlight = false,
    helper,
}: {
    label: string;
    value: string;
    mono?: boolean;
    tone?: "default" | "danger";
    highlight?: boolean;
    helper?: string;
}) {
    return (
        <div
            className={`rounded-xl border px-4 py-3 shadow-sm transition-colors ${
                highlight
                    ? "border-emerald-200 bg-emerald-50/65 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                    : "border-border bg-white dark:bg-slate-900"
            }`}
        >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</div>
            <div
                className={`mt-2 text-sm font-semibold ${
                    tone === "danger"
                        ? "text-rose-600 dark:text-rose-300"
                        : "text-gray-900 dark:text-white"
                } ${mono ? "font-mono text-xs break-all leading-6" : "leading-6"}`}
            >
                {value}
            </div>
            {helper && <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{helper}</p>}
        </div>
    );
}

function PositionCard({
    position,
}: {
    position: ReturnType<typeof normalizePosition>;
}) {
    const isBuy = position.side === "BUY";
    const pnlPositive = position.unrealizedPnl >= 0;

    return (
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50/40 dark:bg-slate-900 dark:hover:border-emerald-900/40 dark:hover:bg-emerald-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Pair</p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{position.tradingPair}</h3>
                </div>

                <span
                    className={`rounded-lg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isBuy
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                >
                    {position.side}
                </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricTile label="Amount" value={formatNumber(position.amount, 4)} mono />
                <MetricTile label="Entry" value={formatCurrency(position.entryPrice, 2)} mono />
                <MetricTile
                    label="Leverage"
                    value={formatNumber(position.leverage, 2)}
                    mono
                />
                <MetricTile
                    label="PnL"
                    value={`${position.unrealizedPnl > 0 ? "+" : ""}${formatCurrency(Math.abs(position.unrealizedPnl), 2)}`}
                    tone={pnlPositive ? "default" : "danger"}
                    mono
                />
            </div>
        </div>
    );
}

function AllocationBar({
    label,
    value,
    basis,
}: {
    label: string;
    value: number;
    basis: number;
}) {
    const percent = basis > 0 ? Math.max(0, (value / basis) * 100) : 0;

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(value, 4)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                <div
                    className="h-full rounded-md bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
        </div>
    );
}

function Pill({
    label,
    tone,
}: {
    label: string;
    tone: "emerald" | "amber" | "slate";
}) {
    const toneClasses = {
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
        amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200",
        slate: "border-border bg-white text-gray-600 dark:bg-slate-900 dark:text-gray-300",
    }[tone];

    return (
        <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses}`}>
            {label}
        </span>
    );
}

function EmptyState({ title, description }: { title: string; description: string }) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-white px-5 py-8 text-center dark:bg-slate-900">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
        </div>
    );
}

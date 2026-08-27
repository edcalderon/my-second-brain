"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, Activity } from "lucide-react";
import { PortfolioTabs } from "@/components/portfolio/PortfolioTabs";
import type { TradingGoal } from "@/components/portfolio/GoalsPanel";
import type { PositionWithPnL } from "@/components/portfolio/PositionCard";
import type { TradeHistoryItem } from "@/components/portfolio/TradeHistory";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import { TradingOutageBanner } from "@/components/trading/TradingOutageBanner";
import {
    appendBalanceSample,
    combineBalanceSeries,
    createLiveBalanceSample,
    hasMeaningfulBalance,
    type BalancePoint,
} from "@/lib/balance-series";
import { readPortfolioLiveCache, writePortfolioLiveCache, type PortfolioLiveCache } from "@/lib/trading-cache";
import {
    buildTradingOutageNotice,
    fetchPortfolioTracker,
    fetchTradingStatus,
    getTradingErrorPayload,
    type HummingbotPortfolioTracker,
    type HummingbotStatus,
} from "@/lib/hummingbot-api";
import { formatAddress, formatCurrency, formatRelativeTime, normalizePosition } from "@/lib/hummingbot-format";

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
    const [error, setError] = useState<unknown>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [liveSamples, setLiveSamples] = useState<BalancePoint[]>([]);
    const [goals, setGoals] = useState<TradingGoal[]>([]);
    const [goalsLoading, setGoalsLoading] = useState(true);

    // Load portfolio data
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

            if (!isMounted) return;

            const nextErrors: string[] = [];
            let nextStatus: HummingbotStatus | null = null;
            let nextTracker: HummingbotPortfolioTracker | null = null;
            let nextLiveSamples = cachedSnapshot?.liveSamples ?? liveSamples;

            if (statusResult.status === "fulfilled") {
                nextStatus = statusResult.value;
                setStatus(nextStatus);
            } else {
                nextErrors.push("Trading status unavailable");
                const payload = getTradingErrorPayload<HummingbotStatus>(statusResult.reason);
                if (payload) {
                    nextStatus = payload;
                    setStatus(payload);
                }
            }

            if (trackerResult.status === "fulfilled") {
                nextTracker = trackerResult.value;
                setTracker(nextTracker);
            } else {
                nextErrors.push("Portfolio tracker unavailable");
                const payload = getTradingErrorPayload<HummingbotPortfolioTracker>(trackerResult.reason);
                if (payload) {
                    nextTracker = payload;
                    setTracker(payload);
                }
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

    // Load goals (demo data for now)
    useEffect(() => {
        let isMounted = true;
        async function loadGoals() {
            setGoalsLoading(true);
            try {
                // TODO: Replace with actual API call
                const demoGoals: TradingGoal[] = [
                    {
                        id: "demo-1",
                        goal_type: "daily_pnl",
                        target_value: 50,
                        current_value: 44,
                        period_start: new Date().toISOString().split("T")[0],
                        period_end: new Date().toISOString().split("T")[0],
                        currency: "USD",
                        is_active: true,
                        progress_pct: 88,
                        on_track: true,
                        days_remaining: 0,
                    },
                    {
                        id: "demo-2",
                        goal_type: "weekly_pnl",
                        target_value: 250,
                        current_value: 187,
                        period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                        period_end: new Date().toISOString().split("T")[0],
                        currency: "USD",
                        is_active: true,
                        progress_pct: 74.8,
                        on_track: false,
                        days_remaining: 0,
                    },
                    {
                        id: "demo-3",
                        goal_type: "win_rate",
                        target_value: 45,
                        current_value: 35.3,
                        period_start: "2026-01-01",
                        period_end: "2026-12-31",
                        currency: undefined,
                        is_active: true,
                        progress_pct: 78.4,
                        on_track: false,
                        days_remaining: 127,
                    },
                ];
                if (isMounted) setGoals(demoGoals);
            } catch (err) {
                console.error("Failed to load goals:", err);
            } finally {
                if (isMounted) setGoalsLoading(false);
            }
        }
        loadGoals();
    }, []);

    const chartPoints = combineBalanceSeries(portfolioHistory, liveSamples);
    const liveSummary = tracker?.summary ?? status?.portfolio_summary ?? null;
    const mainWallet = tracker?.main_wallet ?? status?.main_wallet ?? null;
    const mainWalletAddress = mainWallet?.wallet_address ?? liveSummary?.main_wallet_address ?? null;
    const mainWalletUsdc = mainWallet?.balance_usd ?? liveSummary?.main_wallet_usdc ?? null;
    const liveBalanceUsd = liveSummary?.current_balance_usd ?? liveSummary?.total_value_usd ?? mainWalletUsdc ?? null;
    const liveBalanceEth = liveSummary?.current_balance_eth ?? (liveSummary?.total_value_eth && liveSummary.total_value_eth > 0 ? liveSummary.total_value_eth : null);

    const outageNotice = buildTradingOutageNotice({
        status: status?.service_health ?? tracker?.service_health ?? null,
        error,
        endpoint: "/trading/status",
    });

    const hasPositiveLiveBalance = typeof liveBalanceUsd === "number" && liveBalanceUsd > 0;
    const displayedBalanceUsd = hasPositiveLiveBalance ? liveBalanceUsd : portfolio?.total_value_usd ?? liveBalanceUsd ?? mainWalletUsdc;
    const displayedBalanceEth = hasPositiveLiveBalance ? liveBalanceEth : portfolio?.total_value_eth ?? liveBalanceEth;

    const balanceSourceLabel = hasPositiveLiveBalance
        ? cacheSnapshot ? "Live tracker + cache" : "Live tracker"
        : portfolio ? "Stored snapshot" : cacheSnapshot ? "Cache" : "Waiting";

    const latestUpdatedAt = liveSummary?.snapshot_time ?? tracker?.snapshot_time ?? portfolio?.time ?? null;

    // Transform positions to new format
    const positions: PositionWithPnL[] = (tracker?.open_positions || status?.open_positions || [])
        .map(normalizePosition)
        .map((p) => ({
            tradingPair: p.tradingPair,
            side: p.side as "BUY" | "SELL",
            amount: p.amount,
            entryPrice: p.entryPrice,
            unrealizedPnl: p.unrealizedPnl,
            leverage: p.leverage,
            status: "open" as const,
        }));

    // Add Bybit direct positions if available
    const bybitDirectPositions: PositionWithPnL[] = (status?.bybit_direct_positions || []).map((p: Record<string, unknown>) => ({
        tradingPair: String(p.symbol || "UNKNOWN"),
        side: String(p.side || "Buy").toLowerCase() === "buy" ? "BUY" : "SELL",
        amount: Number(p.size || 0),
        entryPrice: Number(p.avgPrice || 0),
        unrealizedPnl: Number(p.unrealisedPnl || 0),
        leverage: Number(p.leverage || 1),
        status: "open" as const,
    }));

    const allPositions = [...positions, ...bybitDirectPositions];

    // Demo trade history - replace with real data from API
    const trades: TradeHistoryItem[] = [
        {
            id: "trade-1",
            instrument: "BTCPERP",
            side: "short",
            entryPrice: 78986.60,
            exitPrice: 78444.00,
            realizedPnl: 0.44,
            closedAt: new Date("2026-08-26T13:44:00Z").toISOString(),
            durationHours: 2.2,
            fees: 0.05,
        },
    ];

    const isInitialLoading = (loading || portfolioLoading) && !chartPoints.length && !displayedBalanceUsd && !cacheSnapshot;

    if (isInitialLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <Activity className="mx-auto h-8 w-8 animate-pulse text-emerald-600" />
                    <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">Loading portfolio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-16">
            {/* Header */}
            <header className="rounded-2xl border border-emerald-200/70 bg-white p-6 shadow-sm dark:border-emerald-900/30 dark:bg-slate-950">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Trading Portfolio
                        </div>
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white lg:text-4xl">
                                {displayedBalanceUsd !== null ? formatCurrency(displayedBalanceUsd, 2) : "--"}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {displayedBalanceEth !== null ? `${displayedBalanceEth.toFixed(4)} ETH` : "--"}
                                {mainWalletAddress && (
                                    <span className="ml-2 text-gray-400">
                                        • {formatAddress(mainWalletAddress)}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setRefreshCounter((v) => v + 1)}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-slate-900 dark:text-emerald-300"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <span className="rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 dark:bg-slate-900 dark:text-gray-300">
                            {balanceSourceLabel}
                        </span>
                    </div>
                </div>

                {outageNotice && (
                    <div className="mt-4">
                        <TradingOutageBanner notice={outageNotice} />
                    </div>
                )}

                {portfolioError && !outageNotice && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                        <p>{portfolioError}</p>
                    </div>
                )}
            </header>

            {/* Main Tab-Based Portfolio View */}
            <PortfolioTabs
                balanceHistory={chartPoints}
                currentBalanceUsd={displayedBalanceUsd}
                currentBalanceEth={displayedBalanceEth}
                mainWalletAddress={mainWalletAddress}
                mainWalletUsdc={mainWalletUsdc}
                positions={allPositions}
                trades={trades}
                goals={goals}
                loading={loading || refreshing}
                sourceLabel={balanceSourceLabel}
                updatedAt={latestUpdatedAt}
            />

            {/* Bybit Portfolio Value - Real-time from exchange */}
            {status?.bybit_portfolio_value && (
                <section className="rounded-xl border border-emerald-200 bg-white px-5 py-4 dark:border-emerald-900/30 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                                Bybit Portfolio
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(status.bybit_portfolio_value.total_usd ?? 0, 2)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                Real-time from Bybit •
                                {status.bybit_portfolio_value.unified.available
                                    ? ` Unrealized: ${formatCurrency(status.bybit_portfolio_value.unified.unrealized_pnl_usd ?? 0, 2)}`
                                    : " Unified data unavailable"}
                            </p>
                        </div>
                        {status.executor_label && (
                            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                                ● {status.executor_label}
                            </span>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

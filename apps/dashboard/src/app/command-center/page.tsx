"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Crosshair, Play, RefreshCw, Square, TrendingDown, TrendingUp } from "lucide-react";
import {
    buildTradingOutageNotice,
    submitTradeClose,
    fetchTradingStatus,
    fetchStrategyStatus,
    activateStrategy,
    deactivateStrategy,
    type StrategyState,
    HummingbotPosition,
    HummingbotStatus,
    getTradingErrorPayload,
    submitTradeOpen,
} from "@/lib/hummingbot-api";
import {
    formatCurrency,
    formatNumber,
    formatRelativeTime,
    normalizePosition,
} from "@/lib/hummingbot-format";
import { TradingOutageBanner } from "@/components/trading/TradingOutageBanner";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { ExecutorStatusBadge } from "@/components/trading/ExecutorStatusBadge";

// Matches the live backend defaults (infra/compose/.env on the AWS trading
// box) -- BTC-USDT on Bybit perpetual, not the older ETH/Hyperliquid setup
// still used as fallback defaults elsewhere in this app.
const DEFAULT_PAIR = "BTC-USDT";
const DEFAULT_CONNECTOR = "bybit_perpetual";
const DEFAULT_ACCOUNT = "bybit_main";
const DEFAULT_AMOUNT = 0.001;
const DEFAULT_LEVERAGE = 3;
const DEFAULT_STOP_LOSS = 0.05;
const DEFAULT_TP1 = 0.10;
const DEFAULT_TP2 = 0.20;

// Real-time is relative to this refresh cadence -- REST polling, not
// Supabase Realtime push (positions aren't streamed into Supabase yet).
const REFRESH_MS = 5000;

export default function CommandCenterPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [positions, setPositions] = useState<HummingbotPosition[]>([]);
    const [bybitDirectPositions, setBybitDirectPositions] = useState<Array<Record<string, unknown>>>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [busyPositionKey, setBusyPositionKey] = useState<string | null>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    const [tradingPair, setTradingPair] = useState(DEFAULT_PAIR);
    const [side, setSide] = useState<"BUY" | "SELL">("BUY");
    const [amount, setAmount] = useState(DEFAULT_AMOUNT);
    const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
    const [busyOpen, setBusyOpen] = useState(false);
    const [lastAction, setLastAction] = useState<{ ok: boolean; message: string } | null>(null);
    const [strategy, setStrategy] = useState<StrategyState | null>(null);
    const [busyStrategy, setBusyStrategy] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setRefreshing(true);
            const statusResult = await fetchTradingStatus().catch((err) => {
                if (isMounted) setError(err);
                return getTradingErrorPayload<HummingbotStatus>(err);
            });

            if (!isMounted || !statusResult) {
                // A network error (no structured payload at all, so
                // getTradingErrorPayload returns nothing) still needs
                // loading cleared -- otherwise the outage banner has an
                // error to show, but permanent skeleton placeholders sit on
                // top of it because `loading` never left its initial true.
                if (isMounted) {
                    setRefreshing(false);
                    setLoading(false);
                }
                return;
            }

            setStatus(statusResult);
            setPositions(statusResult.open_positions || []);
            setBybitDirectPositions(statusResult.bybit_direct_positions || []);
            setError(null);
            setLastUpdated(new Date());
            setLoading(false);
            setRefreshing(false);
        }

        load();
        fetchStrategyStatus().then(setStrategy).catch(() => {});
        const intervalId = setInterval(load, REFRESH_MS);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [refreshCounter]);

    const account = status?.default_account || DEFAULT_ACCOUNT;
    const connector = status?.default_connector || DEFAULT_CONNECTOR;
    const normalizedPositions = positions.map(normalizePosition);
    // Hummingbot's tracked positions (empty for this account -- its
    // connector only covers the USDT-linear market) plus the Bybit-direct
    // USDC-perpetual position, which is the position that actually exists.
    // Using normalizedPositions alone here undercounts to zero even while
    // the real position is open -- exactly what the "Bybit USDC perpetual"
    // panel below already surfaces separately.
    const bybitDirectPnl = bybitDirectPositions.reduce((sum, p) => sum + Number(p.unrealisedPnl ?? 0), 0);
    const totalUnrealizedPnl = normalizedPositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0) + bybitDirectPnl;
    const totalOpenPositions = normalizedPositions.length + bybitDirectPositions.length;
    // The backend serves hardcoded mock numbers (e.g. $4,500 portfolio value)
    // when it can't reach Hummingbot, specifically so frontend dev doesn't
    // break -- but that means this data is never safe to render as real
    // without checking fallback_active first. When it's degraded/fallback or
    // still loading, show a skeleton instead of a number that looks real.
    const isFallback = Boolean(status?.service_health?.fallback_active);
    const dataAvailable = !loading && Boolean(status) && !isFallback;
    // Real account value read directly from Bybit -- independent of
    // Hummingbot's own fallback state above, since it's a separate direct
    // API call. portfolio_summary.total_value_usd is Hummingbot's tracked
    // state against placeholder wallet addresses, not this account -- never
    // show that as "the" portfolio value.
    const bybitValue = status?.bybit_portfolio_value;
    const portfolioValueAvailable = !loading && Boolean(bybitValue);
    const portfolioValueUsd = bybitValue?.total_usd ?? 0;
    const outageNotice = buildTradingOutageNotice({
        status: status?.service_health ?? null,
        error,
        endpoint: "/trading/status",
    });

    async function handleStrategyToggle() {
        if (!strategy) return;
        setBusyStrategy(true);
        try {
            const next = strategy.enabled
                ? await deactivateStrategy()
                : await activateStrategy();
            setStrategy(next);
            setLastAction({
                ok: true,
                message: next.enabled
                    ? `Strategy armed — phase: ${next.phase}`
                    : "Strategy deactivated",
            });
        } catch (err) {
            setLastAction({ ok: false, message: `Strategy toggle failed: ${String(err)}` });
        } finally {
            setBusyStrategy(false);
        }
    }

    async function submitOpen() {
        setBusyOpen(true);
        setLastAction(null);
        try {
            await submitTradeOpen({
                trading_pair: tradingPair,
                side,
                amount,
                leverage,
                stop_loss_pct: DEFAULT_STOP_LOSS,
                take_profit_1_pct: DEFAULT_TP1,
                take_profit_2_pct: DEFAULT_TP2,
                account_name: account,
                connector_name: connector,
                client_request_id: crypto.randomUUID(),
            });
            setLastAction({ ok: true, message: `${side} ${amount} ${tradingPair} submitted.` });
            setRefreshCounter((v) => v + 1);
        } catch (err) {
            setLastAction({ ok: false, message: getTradingErrorPayload<{ message?: string }>(err)?.message || String(err) });
        } finally {
            setBusyOpen(false);
        }
    }

    async function closePosition(position: HummingbotPosition, key: string) {
        setBusyPositionKey(key);
        setLastAction(null);
        try {
            const normalized = normalizePosition(position);
            await submitTradeClose({
                trading_pair: normalized.tradingPair,
                side: normalized.side === "SELL" ? "SELL" : "BUY",
                amount: normalized.amount || amount,
                leverage: normalized.leverage || leverage,
                stop_loss_pct: DEFAULT_STOP_LOSS,
                take_profit_1_pct: DEFAULT_TP1,
                take_profit_2_pct: DEFAULT_TP2,
                account_name: account,
                connector_name: connector,
            });
            setLastAction({ ok: true, message: `Closed ${normalized.tradingPair}.` });
            setRefreshCounter((v) => v + 1);
        } catch (err) {
            setLastAction({ ok: false, message: getTradingErrorPayload<{ message?: string }>(err)?.message || String(err) });
        } finally {
            setBusyPositionKey(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Command Center</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Live positions & trade control</h1>
                        <p className="text-sm text-gray-600">
                            {connector} / {account} — refreshing every {REFRESH_MS / 1000}s.
                            {lastUpdated ? ` Last update ${formatRelativeTime(lastUpdated.toISOString())}.` : ""}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        <Chip tone={status?.live_trading_enabled ? "danger" : "default"}>
                            {status?.live_trading_enabled ? "LIVE TRADING" : "Dry-run"}
                        </Chip>
                        <Chip>{connector}</Chip>
                        <ExecutorStatusBadge status={status} lastUpdated={lastUpdated} />
                        <Chip tone={isFallback ? "danger" : "default"}>
                            {dataAvailable ? `${totalOpenPositions} open` : isFallback ? "mock data" : "loading"}
                        </Chip>
                    </div>
                </div>
            </header>

            <TradingOutageBanner notice={outageNotice} />

            <section className="grid gap-4 sm:grid-cols-3">
                <Metric
                    label="Portfolio value (Bybit)"
                    value={portfolioValueAvailable ? formatCurrency(portfolioValueUsd) : null}
                    skeletonReason="loading"
                />
                <Metric
                    label="Unrealized PnL (open)"
                    value={dataAvailable ? formatCurrency(totalUnrealizedPnl) : null}
                    skeletonReason={isFallback ? "mock" : "loading"}
                    tone={totalUnrealizedPnl > 0 ? "positive" : totalUnrealizedPnl < 0 ? "negative" : "default"}
                />
                <Metric
                    label="Open positions"
                    value={dataAvailable ? `${totalOpenPositions}` : null}
                    skeletonReason={isFallback ? "mock" : "loading"}
                />
            </section>

            {bybitValue && (
                <section className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Unified Trading</p>
                        {bybitValue.unified.available ? (
                            <>
                                <p className="mt-1 text-lg font-semibold text-gray-900">
                                    {formatCurrency(bybitValue.unified.total_equity_usd ?? 0)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Unrealized PnL {formatCurrency(bybitValue.unified.unrealized_pnl_usd ?? 0)} · Available{" "}
                                    {formatCurrency(bybitValue.unified.available_balance_usd ?? 0)}
                                </p>
                            </>
                        ) : (
                            <p className="mt-1 text-xs text-rose-700">{bybitValue.unified.error || "Unavailable"}</p>
                        )}
                    </div>
                    <div className="rounded-xl border border-border bg-white px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Funding</p>
                        {bybitValue.funding.available ? (
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                {formatCurrency(bybitValue.funding.total_usd ?? 0)}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-amber-700">{bybitValue.funding.error || "Unavailable"}</p>
                        )}
                    </div>
                </section>
            )}

            <TradingViewChart />

            {/*
                @container, not lg:, because this section's *available* width
                depends on the sidebar (fixed ~256px), not the raw viewport --
                a viewport breakpoint can look "wide enough" while the actual
                column here is still cramped. @3xl responds to the real space.
            */}
            <section className="@container grid gap-6 @3xl:grid-cols-[1.4fr_0.6fr]">
                <div className="glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Open positions</h2>
                            <p className="text-sm text-gray-500">Close any position directly from here.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRefreshCounter((v) => v + 1)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-400 sm:hidden">Swipe the table sideways to see all columns →</p>
                    <div className="overflow-x-auto rounded-xl border border-border bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Pair</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Side</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Amount</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Entry</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">PnL</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Leverage</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {normalizedPositions.map((position, index) => {
                                    const key = `${position.tradingPair}-${position.side}-${position.entryPrice}-${index}`;
                                    return (
                                        <tr key={key}>
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">{position.tradingPair}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                                                        position.side === "BUY"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-rose-50 text-rose-700"
                                                    }`}
                                                >
                                                    {position.side === "BUY" ? (
                                                        <TrendingUp className="h-3 w-3" />
                                                    ) : (
                                                        <TrendingDown className="h-3 w-3" />
                                                    )}
                                                    {position.side}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.amount, 4)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(position.entryPrice, 2)}</td>
                                            <td
                                                className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold ${
                                                    position.unrealizedPnl > 0
                                                        ? "text-emerald-700"
                                                        : position.unrealizedPnl < 0
                                                          ? "text-rose-700"
                                                          : "text-gray-900"
                                                }`}
                                            >
                                                {formatCurrency(position.unrealizedPnl)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">{formatNumber(position.leverage, 0)}x</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => closePosition(position.raw, key)}
                                                    disabled={busyPositionKey === key}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    <Square className="h-3 w-3" />
                                                    {busyPositionKey === key ? "Closing..." : "Close"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!normalizedPositions.length && (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                                            {loading
                                                ? "Loading positions..."
                                                : isFallback
                                                  ? "Backend unreachable — position state unknown, not confirmed empty."
                                                  : "No open positions."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/*
                    min-w-0: grid items don't shrink below their content's
                    min-content width by default, which is exactly what was
                    clipping the Amount/Leverage inputs -- the 0.6fr track
                    couldn't actually shrink them, so they overflowed instead.
                    @container: lets the inner grid below react to this
                    panel's own width, not the viewport (which can be wide
                    while this specific column is still narrow).
                */}
                <div className="@container glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Quick trade</h2>
                            <p className="text-sm text-gray-500">Market order via {connector}.</p>
                        </div>
                        <Crosshair className="h-5 w-5 text-emerald-700 shrink-0" />
                    </div>

                    <Field label="Trading pair">
                        <input
                            value={tradingPair}
                            onChange={(e) => setTradingPair(e.target.value.toUpperCase())}
                            className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            placeholder={DEFAULT_PAIR}
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setSide("BUY")}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                                side === "BUY"
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-border bg-white text-gray-700"
                            }`}
                        >
                            Long / BUY
                        </button>
                        <button
                            type="button"
                            onClick={() => setSide("SELL")}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                                side === "SELL"
                                    ? "border-rose-600 bg-rose-600 text-white"
                                    : "border-border bg-white text-gray-700"
                            }`}
                        >
                            Short / SELL
                        </button>
                    </div>

                    <div className="grid grid-cols-1 @xs:grid-cols-2 gap-3">
                        <Field label="Amount">
                            <input
                                type="number"
                                step="0.0001"
                                min={0}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value) || DEFAULT_AMOUNT)}
                                className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Leverage">
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={leverage}
                                onChange={(e) => setLeverage(Number(e.target.value) || DEFAULT_LEVERAGE)}
                                className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                    </div>

                    <button
                        type="button"
                        disabled={busyOpen}
                        onClick={submitOpen}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        <Play className="h-4 w-4" />
                        {busyOpen ? "Submitting..." : `${side === "BUY" ? "Open Long" : "Open Short"}`}
                    </button>

                    {lastAction && (
                        <p className={`text-xs ${lastAction.ok ? "text-emerald-700" : "text-rose-700"}`}>
                            {lastAction.message}
                        </p>
                    )}

                    <div className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-gray-500">
                        {status?.live_trading_enabled
                            ? "LIVE_TRADING_ENABLED is on — this submits a real order."
                            : "Dry-run mode — orders are logged, not sent to the exchange."}
                    </div>
                </div>
            </section>

            {bybitDirectPositions.length > 0 && (
                <section className="glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Bybit USDC perpetual (manual)</h2>
                            <p className="text-sm text-gray-500">
                                Read directly from Bybit — Hummingbot&apos;s connector only tracks the USDT-margined
                                market, so positions opened here (e.g. via the Bybit web UI) don&apos;t show up
                                above. Display only: no close action, since Hummingbot can&apos;t act on this
                                market either.
                            </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">{bybitDirectPositions.length} open</span>
                    </div>

                    <p className="text-[11px] text-gray-400 sm:hidden">Swipe the table sideways to see all columns →</p>
                    <div className="overflow-x-auto rounded-xl border border-border bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Symbol</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">Side</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Size</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Avg entry</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Mark</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Liq. price</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">PnL</th>
                                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">Leverage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {bybitDirectPositions.map((position, index) => {
                                    const pnl = Number(position.unrealisedPnl ?? 0);
                                    return (
                                        <tr key={`${position.symbol}-${index}`}>
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
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">{formatNumber(position.liqPrice, 2)}</td>
                                            <td
                                                className={`whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold ${
                                                    pnl > 0 ? "text-emerald-700" : pnl < 0 ? "text-rose-700" : "text-gray-900"
                                                }`}
                                            >
                                                {formatCurrency(pnl)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">{String(position.leverage)}x</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Strategy Engine */}
            <section className="rounded-xl border border-border bg-white px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Strategy Engine</h2>
                        <p className="text-sm text-gray-500">
                            {strategy?.enabled
                                ? `Watching ${strategy.symbol} for qualifying entries`
                                : "Inactive — click Activate to arm"}
                        </p>
                    </div>
                    <span
                        className={`inline-block h-3 w-3 rounded-full ${
                            strategy?.enabled
                                ? strategy.phase === "in_position"
                                    ? "bg-amber-400 animate-pulse"
                                    : "bg-emerald-500"
                                : "bg-gray-300"
                        }`}
                        title={strategy?.phase ?? "unknown"}
                    />
                </div>

                {strategy && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <div>
                            <span className="text-gray-500">Phase</span>
                            <p className="font-medium text-gray-900 capitalize">{strategy.phase.replace("_", " ")}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Market</span>
                            <p className="font-medium text-gray-900">{strategy.symbol} · {strategy.category}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Risk</span>
                            <p className="font-medium text-gray-900">
                                ${strategy.risk_params.margin_usd} × {strategy.risk_params.leverage}x
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-500">Last evaluated</span>
                            <p className="font-medium text-gray-900">
                                {strategy.last_evaluated_at
                                    ? formatRelativeTime(strategy.last_evaluated_at)
                                    : "never"}
                            </p>
                        </div>
                        {strategy.last_reason && (
                            <div className="col-span-2">
                                <span className="text-gray-500">Last reason</span>
                                <p className="font-medium text-gray-900">{strategy.last_reason}</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleStrategyToggle}
                    disabled={busyStrategy || !strategy}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                        strategy?.enabled
                            ? "border border-border bg-white text-gray-700 hover:bg-gray-50"
                            : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                >
                    {strategy?.enabled ? (
                        <>
                            <Square className="h-3.5 w-3.5" />
                            {busyStrategy ? "Deactivating..." : "Deactivate"}
                        </>
                    ) : (
                        <>
                            <Play className="h-3.5 w-3.5" />
                            {busyStrategy ? "Activating..." : "Activate"}
                        </>
                    )}
                </button>
            </section>
        </div>
    );
}

function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "danger" }) {
    return (
        <span
            className={`rounded-lg border px-3 py-1 text-[11px] ${
                tone === "danger"
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
        >
            {children}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1 block">
            <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    );
}

function Metric({
    label,
    value,
    tone = "default",
    skeletonReason = "loading",
}: {
    label: string;
    // null means "don't show this yet" -- render a skeleton instead of a
    // real-looking number, rather than a stale/mock 0 or $0.00.
    value: string | null;
    tone?: "default" | "positive" | "negative";
    skeletonReason?: "loading" | "mock";
}) {
    return (
        <div className="glass-panel rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            {value === null ? (
                <div className="mt-3 space-y-1">
                    <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />
                    <p className="text-[11px] text-gray-400">
                        {skeletonReason === "mock" ? "backend unreachable — no real data" : "loading..."}
                    </p>
                </div>
            ) : (
                <p
                    className={`mt-2 text-2xl font-semibold ${
                        tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-rose-700" : "text-gray-900"
                    }`}
                >
                    {value}
                </p>
            )}
        </div>
    );
}

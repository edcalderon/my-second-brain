"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ArrowRightLeft, Play, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import {
    closePaperTrade,
    fetchTradingPositions,
    fetchTradingStatus,
    HummingbotPosition,
    HummingbotPreview,
    HummingbotStatus,
    openPaperTrade,
    previewTrade,
    runBacktest,
} from "@/lib/hummingbot-api";
import {
    formatJson,
    formatNumber,
    formatPercent,
    formatTime,
    normalizePosition,
} from "@/lib/hummingbot-format";

const DEFAULT_PAIR = "ETH-USD";
const DEFAULT_INTERVAL = "1h";
const DEFAULT_FAST_EMA = 21;
const DEFAULT_SLOW_EMA = 55;
const DEFAULT_RSI = 14;
const DEFAULT_AMOUNT = 0.05;
const DEFAULT_LEVERAGE = 3;
const DEFAULT_STOP_LOSS = 0.05;
const DEFAULT_TP1 = 0.10;
const DEFAULT_TP2 = 0.20;
const DEFAULT_ACCOUNT = "master_account";
const DEFAULT_CONNECTOR = "hyperliquid_perpetual_testnet";

function buildBacktestConfig({
    tradingPair,
    connectorName,
    interval,
    fastEma,
    slowEma,
    rsiPeriod,
    signal,
    amount,
    leverage,
    stopLossPct,
    takeProfit1Pct,
    takeProfit2Pct,
}: {
    tradingPair: string;
    connectorName: string;
    interval: string;
    fastEma: number;
    slowEma: number;
    rsiPeriod: number;
    signal: string;
    amount: number;
    leverage: number;
    stopLossPct: number;
    takeProfit1Pct: number;
    takeProfit2Pct: number;
}) {
    return JSON.stringify(
        {
            strategy_name: "s2_active_trading",
            trading_pair: tradingPair,
            connector_name: connectorName,
            interval,
            indicators: {
                fast_ema: fastEma,
                slow_ema: slowEma,
                rsi_period: rsiPeriod,
            },
            signal_hint: signal,
            trade_plan: {
                amount: amount,
                leverage,
                stop_loss_pct: stopLossPct,
                take_profit_1_pct: takeProfit1Pct,
                take_profit_2_pct: takeProfit2Pct,
            },
        },
        null,
        2,
    );
}

export default function StrategyPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [preview, setPreview] = useState<HummingbotPreview | null>(null);
    const [positions, setPositions] = useState<HummingbotPosition[]>([]);
    const [tradingPair, setTradingPair] = useState(DEFAULT_PAIR);
    const [connectorName, setConnectorName] = useState("");
    const [accountName, setAccountName] = useState("");
    const [candleInterval, setCandleInterval] = useState(DEFAULT_INTERVAL);
    const [fastEma, setFastEma] = useState(DEFAULT_FAST_EMA);
    const [slowEma, setSlowEma] = useState(DEFAULT_SLOW_EMA);
    const [rsiPeriod, setRsiPeriod] = useState(DEFAULT_RSI);
    const [side, setSide] = useState<"BUY" | "SELL">("BUY");
    const [amount, setAmount] = useState(DEFAULT_AMOUNT);
    const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
    const [stopLossPct, setStopLossPct] = useState(DEFAULT_STOP_LOSS);
    const [takeProfit1Pct, setTakeProfit1Pct] = useState(DEFAULT_TP1);
    const [takeProfit2Pct, setTakeProfit2Pct] = useState(DEFAULT_TP2);
    const [backtestStart, setBacktestStart] = useState(defaultDateOffset(-7));
    const [backtestEnd, setBacktestEnd] = useState(defaultDateOffset(0));
    const [backtestConfigText, setBacktestConfigText] = useState(
        buildBacktestConfig({
            tradingPair: DEFAULT_PAIR,
            connectorName: DEFAULT_CONNECTOR,
            interval: DEFAULT_INTERVAL,
            fastEma: DEFAULT_FAST_EMA,
            slowEma: DEFAULT_SLOW_EMA,
            rsiPeriod: DEFAULT_RSI,
            signal: "HOLD",
            amount: DEFAULT_AMOUNT,
            leverage: DEFAULT_LEVERAGE,
            stopLossPct: DEFAULT_STOP_LOSS,
            takeProfit1Pct: DEFAULT_TP1,
            takeProfit2Pct: DEFAULT_TP2,
        }),
    );
    const [backtestConfigDirty, setBacktestConfigDirty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastAction, setLastAction] = useState<unknown>(null);
    const [refreshCounter, setRefreshCounter] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function loadWorkspace() {
            setRefreshing(true);
            try {
                const statusPayload = await fetchTradingStatus();

                if (!isMounted) {
                    return;
                }

                setStatus(statusPayload);

                if (!connectorName && statusPayload.default_connector) {
                    setConnectorName(statusPayload.default_connector);
                }
                if (!accountName && statusPayload.default_account) {
                    setAccountName(statusPayload.default_account);
                }

                const selectedConnector = connectorName || statusPayload.default_connector || DEFAULT_CONNECTOR;
                const selectedAccount = accountName || statusPayload.default_account || DEFAULT_ACCOUNT;

                const [previewPayload, positionsPayload] = await Promise.all([
                    previewTrade({
                        trading_pair: tradingPair,
                        connector_name: selectedConnector,
                        interval: candleInterval,
                        fast_ema: fastEma,
                        slow_ema: slowEma,
                        rsi_period: rsiPeriod,
                    }),
                    fetchTradingPositions(selectedAccount),
                ]);

                if (!isMounted) {
                    return;
                }

                setPreview(previewPayload);
                setPositions(positionsPayload.positions);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load strategy workspace");
            } finally {
                if (isMounted) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }

        loadWorkspace();
        const intervalId = setInterval(loadWorkspace, 15000);
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [tradingPair, connectorName, accountName, candleInterval, fastEma, slowEma, rsiPeriod, refreshCounter]);

    useEffect(() => {
        if (preview && !backtestConfigDirty) {
            setBacktestConfigText(
                buildBacktestConfig({
                    tradingPair,
                    connectorName: connectorName || status?.default_connector || DEFAULT_CONNECTOR,
                    interval: candleInterval,
                    fastEma,
                    slowEma,
                    rsiPeriod,
                    signal: preview.signal,
                    amount,
                    leverage,
                    stopLossPct,
                    takeProfit1Pct,
                    takeProfit2Pct,
                }),
            );
        }
    }, [preview, backtestConfigDirty, tradingPair, connectorName, status?.default_connector, candleInterval, fastEma, slowEma, rsiPeriod, amount, leverage, stopLossPct, takeProfit1Pct, takeProfit2Pct]);

    const connectorOptions = Array.from(
        new Set([
            ...(status?.connectors || []),
            status?.default_connector || DEFAULT_CONNECTOR,
            "hyperliquid_perpetual",
            "hyperliquid_perpetual_testnet",
        ].filter(Boolean)),
    );

    const normalizedPositions = positions.map(normalizePosition);
    const previewSide = preview?.signal === "LONG" ? "BUY" : preview?.signal === "SHORT" ? "SELL" : side;
    const previewSignalLabel = preview?.signal || "HOLD";
    const statusConnector = connectorName || status?.default_connector || DEFAULT_CONNECTOR;
    const statusAccount = accountName || status?.default_account || DEFAULT_ACCOUNT;
    const latestPreviewCandleTime = preview?.candles?.at(-1)?.time || "--";

    async function submitOpenTrade() {
        setBusyAction("open");
        setError(null);
        try {
            const response = await openPaperTrade({
                trading_pair: tradingPair,
                side,
                amount,
                leverage,
                stop_loss_pct: stopLossPct,
                take_profit_1_pct: takeProfit1Pct,
                take_profit_2_pct: takeProfit2Pct,
                account_name: statusAccount,
                connector_name: statusConnector,
            });
            setLastAction(response);
            setRefreshCounter((value) => value + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open paper trade");
        } finally {
            setBusyAction(null);
        }
    }

    async function submitBacktest() {
        setBusyAction("backtest");
        setError(null);
        try {
            const config = JSON.parse(backtestConfigText);
            const response = await runBacktest({
                strategy_config: config,
                start_date: backtestStart,
                end_date: backtestEnd,
            });
            setLastAction(response);
        } catch (err) {
            setError(err instanceof SyntaxError ? "Backtest config must be valid JSON" : err instanceof Error ? err.message : "Failed to run backtest");
        } finally {
            setBusyAction(null);
        }
    }

    async function closePosition(position: HummingbotPosition) {
        setBusyAction("close");
        setError(null);
        try {
            const normalized = normalizePosition(position);
            const response = await closePaperTrade({
                trading_pair: normalized.tradingPair,
                side: normalized.side === "SELL" ? "SELL" : "BUY",
                amount: normalized.amount || amount,
                leverage: normalized.leverage || leverage,
                stop_loss_pct: stopLossPct,
                take_profit_1_pct: takeProfit1Pct,
                take_profit_2_pct: takeProfit2Pct,
                account_name: statusAccount,
                connector_name: statusConnector,
            });
            setLastAction(response);
            setRefreshCounter((value) => value + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to close position");
        } finally {
            setBusyAction(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Strategy</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Paper trading desk</h1>
                        <p className="text-sm text-gray-600">
                            Validate EMA/RSI setups against Hummingbot candles, preview the signal, then submit a paper order or run a backtest.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        <Chip>{status?.paper_mode ? "Paper mode" : "Live mode"}</Chip>
                        <Chip>{statusConnector}</Chip>
                        <Chip>{statusAccount}</Chip>
                        <Chip>{previewSignalLabel}</Chip>
                    </div>
                </div>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="glass-panel rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Strategy controls</h2>
                            <p className="text-sm text-gray-500">Tune the live inputs before you push a test order.</p>
                        </div>
                        <Sparkles className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Trading pair">
                            <input
                                value={tradingPair}
                                onChange={(e) => setTradingPair(e.target.value.toUpperCase())}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                                placeholder="ETH-USD"
                            />
                        </Field>
                        <Field label="Connector">
                            <select
                                value={connectorName || status?.default_connector || DEFAULT_CONNECTOR}
                                onChange={(e) => setConnectorName(e.target.value)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            >
                                {connectorOptions.map((connector) => (
                                    <option key={connector} value={connector}>
                                        {connector}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Interval">
                            <select
                                value={candleInterval}
                                onChange={(e) => setCandleInterval(e.target.value)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            >
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="1h">1h</option>
                                <option value="4h">4h</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Field label="Fast EMA">
                            <input
                                type="number"
                                min={2}
                                max={200}
                                value={fastEma}
                                onChange={(e) => setFastEma(Number(e.target.value) || DEFAULT_FAST_EMA)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Slow EMA">
                            <input
                                type="number"
                                min={3}
                                max={400}
                                value={slowEma}
                                onChange={(e) => setSlowEma(Number(e.target.value) || DEFAULT_SLOW_EMA)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="RSI period">
                            <input
                                type="number"
                                min={2}
                                max={200}
                                value={rsiPeriod}
                                onChange={(e) => setRsiPeriod(Number(e.target.value) || DEFAULT_RSI)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Direction">
                            <select
                                value={side}
                                onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            >
                                <option value="BUY">BUY / Long</option>
                                <option value="SELL">SELL / Short</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                        <Field label="Amount">
                            <input
                                type="number"
                                step="0.001"
                                min={0}
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value) || DEFAULT_AMOUNT)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Leverage">
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={leverage}
                                onChange={(e) => setLeverage(Number(e.target.value) || DEFAULT_LEVERAGE)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Stop loss">
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={stopLossPct}
                                onChange={(e) => setStopLossPct(Number(e.target.value) || DEFAULT_STOP_LOSS)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="TP1">
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={takeProfit1Pct}
                                onChange={(e) => setTakeProfit1Pct(Number(e.target.value) || DEFAULT_TP1)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="TP2">
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={takeProfit2Pct}
                                onChange={(e) => setTakeProfit2Pct(Number(e.target.value) || DEFAULT_TP2)}
                                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Metric label="Confidence" value={formatPercent((preview?.confidence || 0) * 100, 1)} />
                        <Metric label="Expected edge" value={`${formatNumber(preview?.expected_edge_bps ?? 0, 2)} bps`} />
                        <Metric label="Latest close" value={formatNumber(preview?.latest_close)} />
                        <Metric label="RSI" value={formatNumber(preview?.rsi, 2)} />
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500">Signal preview</p>
                                <p className="text-2xl font-semibold text-gray-900">{previewSignalLabel}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSide(previewSide)}
                                className="inline-flex items-center gap-2 rounded-full border border-border bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
                            >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                Use preview side
                            </button>
                        </div>
                        <p className="text-sm text-gray-600">{preview?.reason || "Refresh the feed to compute a signal preview."}</p>
                        <div className="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                            <DataRow label="EMA fast" value={formatNumber(preview?.ema_fast)} />
                            <DataRow label="EMA slow" value={formatNumber(preview?.ema_slow)} />
                            <DataRow
                                label="Latest candle"
                                value={latestPreviewCandleTime === "--" ? "--" : formatTime(latestPreviewCandleTime)}
                            />
                            <DataRow label="Bars loaded" value={`${preview?.candles?.length || 0}`} />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setRefreshCounter((value) => value + 1)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh preview
                        </button>
                        <button
                            type="button"
                            disabled={busyAction === "open"}
                            onClick={submitOpenTrade}
                            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            <Play className="h-4 w-4" />
                            {busyAction === "open" ? "Opening..." : "Open paper trade"}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <section className="glass-panel rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Backtest desk</h2>
                                <p className="text-sm text-gray-500">Run the strategy config through Hummingbot's backtesting router.</p>
                            </div>
                            <ShieldCheck className="h-5 w-5 text-emerald-700" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Start date">
                                <input
                                    type="date"
                                    value={backtestStart}
                                    onChange={(e) => setBacktestStart(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                                />
                            </Field>
                            <Field label="End date">
                                <input
                                    type="date"
                                    value={backtestEnd}
                                    onChange={(e) => setBacktestEnd(e.target.value)}
                                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                                />
                            </Field>
                        </div>

                        <div className="rounded-2xl border border-border bg-white px-4 py-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Strategy config JSON</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBacktestConfigText(
                                            buildBacktestConfig({
                                                tradingPair,
                                                connectorName: statusConnector,
                                                interval: candleInterval,
                                                fastEma,
                                                slowEma,
                                                rsiPeriod,
                                                signal: preview?.signal || "HOLD",
                                                amount,
                                                leverage,
                                                stopLossPct,
                                                takeProfit1Pct,
                                                takeProfit2Pct,
                                            }),
                                        );
                                        setBacktestConfigDirty(false);
                                    }}
                                    className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
                                >
                                    Reset
                                </button>
                            </div>
                            <textarea
                                value={backtestConfigText}
                                onChange={(e) => {
                                    setBacktestConfigText(e.target.value);
                                    setBacktestConfigDirty(true);
                                }}
                                rows={14}
                                className="w-full rounded-xl border border-border bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800"
                            />
                        </div>

                        <button
                            type="button"
                            disabled={busyAction === "backtest"}
                            onClick={submitBacktest}
                            className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            {busyAction === "backtest" ? "Running backtest..." : "Run backtest"}
                        </button>
                    </section>

                    <section className="glass-panel rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Workspace state</h2>
                            <span className="text-xs uppercase tracking-[0.2em] text-gray-500">
                                {loading ? "Loading" : "Live"}
                            </span>
                        </div>

                        <div className="grid gap-3 text-sm text-gray-700">
                            <DataRow label="API base" value={status?.api_url || "--"} />
                            <DataRow label="Paper mode" value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"} />
                            <DataRow label="Connector" value={statusConnector} />
                            <DataRow label="Account" value={statusAccount} />
                            <DataRow label="Positions" value={`${positions.length}`} />
                        </div>

                        <details className="rounded-2xl border border-border bg-white px-4 py-3">
                            <summary className="cursor-pointer text-sm font-semibold text-gray-800">Portfolio snapshot</summary>
                            <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(status?.portfolio_state)}</pre>
                        </details>

                        <div className="rounded-2xl border border-border bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Last action</p>
                            <pre className="mt-3 overflow-x-auto text-xs text-gray-600">{formatJson(lastAction || { message: "No trades submitted yet." })}</pre>
                        </div>
                    </section>
                </div>
            </section>

            <section className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Open positions</h2>
                        <p className="text-sm text-gray-500">Close individual positions directly from the desk.</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{positions.length} open</span>
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
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
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
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => closePosition(position.raw)}
                                            disabled={busyAction === "close"}
                                            className="rounded-full border border-border bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                        >
                                            {busyAction === "close" ? "Closing..." : "Close"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!normalizedPositions.length && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                                        No open positions reported by Hummingbot.
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

function defaultDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function Chip({ children }: { children: ReactNode }) {
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">{children}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
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

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
    type StrategyListItem,
    type StrategyBacktestRequest,
    runStrategyBacktest,
} from "@/lib/hummingbot-api";

const INTERVAL_OPTIONS = [
    { value: "1", label: "1m" },
    { value: "5", label: "5m" },
    { value: "15", label: "15m" },
    { value: "30", label: "30m" },
    { value: "60", label: "1h" },
    { value: "120", label: "2h" },
    { value: "240", label: "4h" },
    { value: "D", label: "1D" },
];

type Props = {
    strategy: StrategyListItem;
    onClose: () => void;
    onStarted: () => void;
};

export function BacktestConfigModal({ strategy, onClose, onStarted }: Props) {
    const [symbol, setSymbol] = useState(strategy.symbol || "BTCUSDT");
    // Interval is the real analogue of "how fast" a backtest moves through
    // price action -- the engine computes directly over historical klines,
    // there's no separate playback-speed knob to simulate.
    const [interval, setInterval_] = useState(strategy.kind === "dual_timeframe_high_cadence" ? "5" : "60");
    const [days, setDays] = useState(90);
    const [fast, setFast] = useState(21);
    const [slow, setSlow] = useState(55);
    const [rsiPeriod, setRsiPeriod] = useState(14);
    const [stopLossPct, setStopLossPct] = useState(0.05);
    const [takeProfit1Pct, setTakeProfit1Pct] = useState(0.1);
    const [takeProfit2Pct, setTakeProfit2Pct] = useState(0.2);
    const [positionSize, setPositionSize] = useState(0.001);
    const [initialBalanceUsd, setInitialBalanceUsd] = useState(1000);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const kind =
        strategy.kind === "dual_timeframe_high_cadence"
            ? "dual_timeframe_high_cadence"
            : "ema_rsi_single_timeframe";

    async function handleSubmit() {
        setBusy(true);
        setError(null);
        try {
            const request: StrategyBacktestRequest = {
                strategy_id: strategy.backtest_label || strategy.id,
                symbol,
                interval,
                days,
                fast,
                slow,
                rsi_period: rsiPeriod,
                stop_loss_pct: stopLossPct,
                take_profit_1_pct: takeProfit1Pct,
                take_profit_2_pct: takeProfit2Pct,
                position_size: positionSize,
                initial_balance_usd: initialBalanceUsd,
                kind,
            };
            await runStrategyBacktest(request);
            // The backend already wrote a `status: "running"` row -- the
            // caller's next /strategies fetch will pick it up.
            onStarted();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start backtest");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Backtest — {strategy.label}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Runs against real historical Bybit klines in the background — you
                    can close this and navigate away; the run continues on the server
                    and its result appears on this strategy&apos;s card once finished.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Symbol</span>
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Interval (kline granularity)</span>
                        <select
                            value={interval}
                            onChange={(e) => setInterval_(e.target.value)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        >
                            {INTERVAL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Period (days)</span>
                        <input
                            type="number"
                            min={1}
                            max={730}
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Initial balance (USD)</span>
                        <input
                            type="number"
                            value={initialBalanceUsd}
                            onChange={(e) => setInitialBalanceUsd(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Fast EMA</span>
                        <input
                            type="number"
                            value={fast}
                            onChange={(e) => setFast(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Slow EMA</span>
                        <input
                            type="number"
                            value={slow}
                            onChange={(e) => setSlow(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">RSI period</span>
                        <input
                            type="number"
                            value={rsiPeriod}
                            onChange={(e) => setRsiPeriod(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Position size (base units)</span>
                        <input
                            type="number"
                            step="0.0001"
                            value={positionSize}
                            onChange={(e) => setPositionSize(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Stop loss %</span>
                        <input
                            type="number"
                            step="0.01"
                            value={stopLossPct}
                            onChange={(e) => setStopLossPct(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Take profit 1 %</span>
                        <input
                            type="number"
                            step="0.01"
                            value={takeProfit1Pct}
                            onChange={(e) => setTakeProfit1Pct(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Take profit 2 %</span>
                        <input
                            type="number"
                            step="0.01"
                            value={takeProfit2Pct}
                            onChange={(e) => setTakeProfit2Pct(Number(e.target.value))}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-slate-800"
                        />
                    </label>
                </div>

                {error && (
                    <p className="mt-3 break-words text-xs text-red-600 dark:text-red-400">{error}</p>
                )}

                <div className="mt-4 flex items-center gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={handleSubmit}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Start backtest
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

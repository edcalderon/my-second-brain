"use client";

import { type ReactNode, useEffect, useState } from "react";
import { CandlestickChart, RefreshCw } from "lucide-react";
import {
    fetchTradingMarket,
    fetchTradingStatus,
    HummingbotMarket,
    HummingbotStatus,
} from "@/lib/hummingbot-api";
import { formatNumber, formatTime } from "@/lib/hummingbot-format";

const DEFAULT_PAIR = "ETH-USD";
const DEFAULT_INTERVAL = "1h";

export default function MarketPage() {
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [market, setMarket] = useState<HummingbotMarket | null>(null);
    const [tradingPair, setTradingPair] = useState(DEFAULT_PAIR);
    const [candleInterval, setCandleInterval] = useState(DEFAULT_INTERVAL);
    const [limit, setLimit] = useState(120);
    const [refreshCounter, setRefreshCounter] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            setRefreshing(true);
            try {
                const [statusPayload, marketPayload] = await Promise.all([
                    fetchTradingStatus(),
                    fetchTradingMarket({ trading_pair: tradingPair, interval: candleInterval, limit }),
                ]);

                if (!isMounted) {
                    return;
                }

                setStatus(statusPayload);
                setMarket(marketPayload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load market data");
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
    }, [tradingPair, candleInterval, limit, refreshCounter]);

    const candles = market?.candles ?? [];
    const latest = market?.latest_candle ?? candles[candles.length - 1] ?? null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Market</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Hummingbot market feed</h1>
                    <p className="text-sm text-gray-600">
                        Live candles for the selected connector. Use this to validate entries before pushing a paper trade.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setRefreshCounter((value) => value + 1)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    <span>Refresh feed</span>
                </button>
            </header>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
                <div className="glass-panel rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Feed controls</h2>
                            <p className="text-sm text-gray-500">Tune the candle window before running a strategy preview.</p>
                        </div>
                        <CandlestickChart className="h-5 w-5 text-emerald-700" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Field label="Trading pair">
                            <input
                                value={tradingPair}
                                onChange={(e) => setTradingPair(e.target.value.toUpperCase())}
                            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900"
                                placeholder="ETH-USD"
                            />
                        </Field>
                        <Field label="Interval">
                            <select
                                value={candleInterval}
                                onChange={(e) => setCandleInterval(e.target.value)}
                                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            >
                                <option value="5m">5m</option>
                                <option value="15m">15m</option>
                                <option value="1h">1h</option>
                                <option value="4h">4h</option>
                            </select>
                        </Field>
                        <Field label="Lookback">
                            <input
                                type="number"
                                min={20}
                                max={500}
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value) || 120)}
                                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            />
                        </Field>
                        <Field label="Connector">
                            <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-gray-700">
                                {market?.connector_name || status?.default_connector || "--"}
                            </div>
                        </Field>
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700 sm:grid-cols-2 xl:grid-cols-4">
                        <DataRow label="Latest close" value={formatNumber(market?.latest_close)} />
                        <DataRow label="Candles" value={`${candles.length}`} />
                        <DataRow label="Paper mode" value={status ? (status.paper_mode ? "Enabled" : "Disabled") : "--"} />
                        <DataRow label="Open positions" value={status ? `${status.open_positions_count}` : "--"} />
                    </div>

                    <div className="rounded-xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="font-semibold">
                                {loading ? "Loading market feed" : "Hummingbot market feed connected"}
                            </span>
                        </div>
                        <p className="mt-2">
                            {status?.api_url || "Waiting for backend status."}
                        </p>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Signal preview</h2>
                        <span className="rounded-lg bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            {market?.price_preview?.signal || "Pending"}
                        </span>
                    </div>

                    <div className="grid gap-3 text-sm text-gray-700">
                        <DataRow label="Confidence" value={market?.price_preview ? `${(market.price_preview.confidence * 100).toFixed(1)}%` : "--"} />
                        <DataRow label="Expected edge" value={market?.price_preview ? `${market.price_preview.expected_edge_bps.toFixed(2)} bps` : "--"} />
                        <DataRow label="Latest time" value={latest?.time || "--"} />
                        <DataRow label="Symbol" value={market?.trading_pair || "--"} />
                    </div>

                    <div className="rounded-xl border border-border bg-white px-5 py-4 text-sm text-gray-600">
                        <p className="font-semibold text-gray-800">Why this matters</p>
                        <p className="mt-2">
                            This is the raw feed the strategy page uses to calculate the EMA/RSI preview before a paper order is submitted.
                        </p>
                    </div>
                </div>
            </section>

            <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Recent candles</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                        {market?.interval || candleInterval}
                    </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Open</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">High</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Low</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Close</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Volume</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {candles.slice(-12).map((candle) => (
                                <tr key={candle.time}>
                                    <td className="px-4 py-3 text-gray-600">{formatTime(candle.time)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(candle.open)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(candle.high)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(candle.low)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatNumber(candle.close)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{formatNumber(candle.volume)}</td>
                                </tr>
                            ))}
                            {!candles.length && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                        No candles returned by the backend.
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

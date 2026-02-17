"use client";

import { useEffect, useState } from "react";
import { CandlestickChart, RefreshCw } from "lucide-react";
import { fetchMarket, MarketResponse } from "@/lib/dashboard-api";

export default function MarketPage() {
    const [data, setData] = useState<MarketResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function load() {
            try {
                const payload = await fetchMarket();
                if (!isMounted) {
                    return;
                }
                setData(payload);
                setError(null);
            } catch (err) {
                if (!isMounted) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load market data");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        load();
        const interval = setInterval(load, 15000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const tick = data?.tick;
    const candle = data?.candle;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16">
            <header className="flex items-center justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Market</p>
                    <h1 className="text-3xl font-semibold text-gray-900">Market data feed</h1>
                    <p className="text-sm text-gray-600">Live tick + candle snapshots from the execution venue.</p>
                </div>
                <button className="inline-flex items-center space-x-2 rounded-full border border-border bg-white px-4 py-2 text-xs font-semibold text-gray-600">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Auto-refresh</span>
                </button>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Tick snapshot</h2>
                        <CandlestickChart className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="grid gap-3 text-sm text-gray-700">
                        <DataRow label="Symbol" value={tick?.symbol || "--"} />
                        <DataRow label="Bid" value={tick ? `${tick.bid}` : "--"} />
                        <DataRow label="Ask" value={tick ? `${tick.ask}` : "--"} />
                        <DataRow label="Last trade" value={tick ? `${tick.last_trade}` : "--"} />
                        <DataRow label="Timestamp" value={tick?.ts || "--"} />
                    </div>
                </div>

                <div className="glass-panel rounded-3xl p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Last candle</h2>
                    <div className="grid gap-3 text-sm text-gray-700">
                        <DataRow label="Symbol" value={candle?.symbol || "--"} />
                        <DataRow label="Open" value={candle ? `${candle.open}` : "--"} />
                        <DataRow label="High" value={candle ? `${candle.high}` : "--"} />
                        <DataRow label="Low" value={candle ? `${candle.low}` : "--"} />
                        <DataRow label="Close" value={candle ? `${candle.close}` : "--"} />
                        <DataRow label="Volume" value={candle ? `${candle.volume}` : "--"} />
                        <DataRow label="Window" value={candle ? `${candle.window_s}s` : "--"} />
                    </div>
                </div>
            </section>

            {loading && (
                <div className="text-xs text-gray-500">Loading market feed...</div>
            )}
        </div>
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

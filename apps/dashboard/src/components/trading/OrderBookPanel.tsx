"use client";

import { useEffect, useRef, useState } from "react";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";
import { authClient } from "@/components/auth/AuthProvider";

type OrderBookRow = [price: number, size: number];
type Trade = { price: number; size: number; ts: number; side: string; is_block: boolean };

const REFRESH_MS = 3000;

async function fetchOrderbook(symbol: string, depth: number): Promise<{ bids: OrderBookRow[]; asks: OrderBookRow[]; ts: number; symbol: string }> {
    const token = await authClient.getSessionToken();
    const resp = await fetch(
        `${getHummingbotApiBase()}/trading/orderbook?symbol=${encodeURIComponent(symbol)}&depth=${depth}`,
        { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!resp.ok) throw new Error(`orderbook fetch failed: ${resp.status}`);
    return resp.json();
}

async function fetchRecentTrades(symbol: string, limit: number): Promise<Trade[]> {
    const token = await authClient.getSessionToken();
    const resp = await fetch(
        `${getHummingbotApiBase()}/trading/recent-trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`,
        { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!resp.ok) throw new Error(`recent trades fetch failed: ${resp.status}`);
    const data = await resp.json();
    return (data.trades as Trade[]) ?? [];
}

export function OrderBookPanel({ symbol = "BTCUSDC", depth = 20, tradeLimit = 30 }: { symbol?: string; depth?: number; tradeLimit?: number }) {
    const [bids, setBids] = useState<OrderBookRow[]>([]);
    const [asks, setAsks] = useState<OrderBookRow[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [ts, setTs] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"book" | "trades">("book");

    const displaySymbol = symbol.replace("USDC", "/USDC").replace("USDT", "/USDT");

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const [ob, tr] = await Promise.all([
                    fetchOrderbook(symbol, depth),
                    fetchRecentTrades(symbol, tradeLimit),
                ]);
                if (cancelled) return;
                setBids(ob.bids ?? []);
                setAsks(ob.asks ?? []);
                setTs(ob.ts ?? 0);
                setTrades(tr ?? []);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                setError((err as Error).message);
            }
        }
        load();
        const id = setInterval(load, REFRESH_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, [symbol, depth, tradeLimit]);

    // Compute max total for depth bars
    const maxBidTotal = Math.max(...bids.map(([, s]) => s), 1);
    const maxAskTotal = Math.max(...asks.map(([, s]) => s), 1);

    const updatedAgo = ts ? `${Math.round((Date.now() - ts) / 1000)}s ago` : "";

    return (
        <div className="glass-panel rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {displaySymbol}
                    </h2>
                    <p className="text-xs text-gray-500">Order book · {updatedAgo}</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
                    <button
                        type="button"
                        onClick={() => setTab("book")}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            tab === "book"
                                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        }`}
                    >
                        Book
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("trades")}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            tab === "trades"
                                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                        }`}
                    >
                        Trades
                    </button>
                </div>
            </div>

            {error && (
                <p className="text-xs text-rose-600 mb-2">{error}</p>
            )}

            {tab === "book" ? (
                <div className="space-y-0 text-xs font-mono">
                    {/* Asks (reversed so lowest ask is at bottom, touching spread) */}
                    <div className="overflow-hidden rounded-t-lg">
                        {asks.slice(0, depth).reverse().map(([price, size], i) => (
                            <OrderRow key={`a-${i}`} price={price} size={size} maxTotal={maxAskTotal} side="ask" />
                        ))}
                    </div>

                    {/* Spread */}
                    {bids.length > 0 && asks.length > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500">
                            <span className="text-[10px] uppercase tracking-wider">Spread</span>
                            <span className="tabular-nums">
                                {(asks[0][0] - bids[0][0]).toFixed(2)} ({((asks[0][0] - bids[0][0]) / asks[0][0] * 100).toFixed(3)}%)
                            </span>
                        </div>
                    )}

                    {/* Bids */}
                    <div className="overflow-hidden rounded-b-lg">
                        {bids.slice(0, depth).map(([price, size], i) => (
                            <OrderRow key={`b-${i}`} price={price} size={size} maxTotal={maxBidTotal} side="bid" />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                        <thead>
                            <tr className="text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left font-medium px-2 py-1.5">Price</th>
                                <th className="text-right font-medium px-2 py-1.5">Size</th>
                                <th className="text-right font-medium px-2 py-1.5">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.slice(0, tradeLimit).map((t, i) => (
                                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className={`px-2 py-1 tabular-nums ${t.side === "Buy" ? "text-emerald-600" : "text-rose-600"}`}>
                                        {t.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-2 py-1 text-right tabular-nums text-gray-600 dark:text-gray-300">
                                        {t.size.toFixed(4)}
                                    </td>
                                    <td className="px-2 py-1 text-right tabular-nums text-gray-400">
                                        {new Date(t.ts).toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                            {trades.length === 0 && (
                                <tr>
                                    <td className="px-2 py-4 text-center text-gray-500" colSpan={3}>
                                        Loading trades...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function OrderRow({ price, size, maxTotal, side }: { price: number; size: number; maxTotal: number; side: "bid" | "ask" }) {
    const pct = Math.min(100, (size / maxTotal) * 100);
    const color = side === "bid" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400";

    return (
        <div className="relative flex items-center justify-between px-2 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            {/* Depth bar background */}
            <div
                className={`absolute inset-y-0 right-0 ${side === "bid" ? "bg-emerald-500/[0.08]" : "bg-rose-500/[0.08]"}`}
                style={{ width: `${pct}%` }}
            />
            <span className={`relative tabular-nums ${color}`}>{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="relative tabular-nums text-gray-500">{size.toFixed(4)}</span>
        </div>
    );
}

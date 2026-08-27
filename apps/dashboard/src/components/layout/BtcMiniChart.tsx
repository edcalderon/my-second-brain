"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, TrendingDown, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { previewTrade, toHummingbotPair, type HummingbotCandle } from "@/lib/hummingbot-api";
import { cn } from "@/lib/utils";

type TimeRange = "1h" | "24h" | "7d";

const RANGE_CONFIG: Record<TimeRange, { interval: string; limit: number; label: string }> = {
    "1h": { interval: "5m", limit: 12, label: "1H" },
    "24h": { interval: "1h", limit: 24, label: "24H" },
    "7d": { interval: "4h", limit: 42, label: "7D" },
};

export default function BtcMiniChart({
    collapsed: controlledCollapsed,
    onToggleCollapse,
    onExpandSidebar,
}: {
    collapsed?: boolean;
    onToggleCollapse?: (collapsed: boolean) => void;
    onExpandSidebar?: () => void;
}) {
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [range, setRange] = useState<TimeRange>("24h");
    const [candles, setCandles] = useState<HummingbotCandle[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Controlled vs uncollapsed: if a parent passes `collapsed`, use it;
    // otherwise manage our own state.
    const collapsed = controlledCollapsed ?? internalCollapsed;
    const setCollapsed = (v: boolean) => {
        if (onToggleCollapse) {
            onToggleCollapse(v);
        } else {
            setInternalCollapsed(v);
        }
    };

    // Fetch candles on range change
    useEffect(() => {
        const cfg = RANGE_CONFIG[range];
        setLoading(true);
        previewTrade({
            trading_pair: toHummingbotPair("BTCUSDT"),
            interval: cfg.interval,
            limit: cfg.limit,
        })
            .then((pv) => {
                const c = pv.candles.filter((n) => Number.isFinite(n.close));
                setCandles(c);
            })
            .catch(() => setCandles([]))
            .finally(() => setLoading(false));
    }, [range]);

    const closes = candles.map((c) => c.close);
    const lastCandle = candles[candles.length - 1] ?? null;
    const firstCandle = candles[0] ?? null;
    const pricePct =
        firstCandle && lastCandle && firstCandle.close !== 0
            ? ((lastCandle.close - firstCandle.close) / Math.abs(firstCandle.close)) * 100
            : null;
    const isUp = (pricePct ?? 0) >= 0;
    const lineColor = isUp ? "#10b981" : "#ef4444";
    const displayPrice = lastCandle ? formatPrice(lastCandle.close) : "—";
    const displayPct = pricePct != null ? `${isUp ? "+" : ""}${pricePct.toFixed(2)}%` : "";

    // Sparkline geometry
    const W = 260;
    const H = 70;
    const PAD = 6;
    const points =
        closes.length > 1
            ? closes
                  .map((c, i) => {
                      const x = PAD + (i / (closes.length - 1)) * (W - PAD * 2);
                      const min = Math.min(...closes);
                      const max = Math.max(...closes);
                      const range = max - min || 1;
                      const y = H - PAD - ((c - min) / range) * (H - PAD * 2);
                      return `${x},${y}`;
                  })
                  .join(" ")
            : "";

    // Dot position for the latest candle
    const dotX = closes.length > 1 ? PAD + ((closes.length - 1) / (closes.length - 1)) * (W - PAD * 2) : W / 2;
    const dotY = closes.length > 1
        ? (() => {
              const min = Math.min(...closes);
              const max = Math.max(...closes);
              const range = max - min || 1;
              return H - PAD - ((closes[closes.length - 1] - min) / range) * (H - PAD * 2);
          })()
        : H / 2;

    // Format candle time for display
    const lastCandleTime = lastCandle
        ? new Date(lastCandle.time).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

    // Format volume
    const lastVolume = lastCandle?.volume;
    const displayVolume =
        lastVolume != null && Number.isFinite(lastVolume)
            ? formatVolume(lastVolume)
            : "—";

    // ── Collapsed minimal pill ─────────────────────────────────────
    if (collapsed) {
        return (
            <div className="mx-2 mb-2 relative">
                <button
                    type="button"
                    onClick={() => {
                        setCollapsed(false);
                        onExpandSidebar?.();
                    }}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    title={`BTC ${displayPrice} (${displayPct}) — Click to expand sidebar`}
                >
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">BTC</span>
                    <span className={cn(
                        "text-sm font-bold tabular-nums",
                        isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
                    )}>
                        {displayPrice}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500">{displayPct}</span>
                    <ChevronDown className="h-2.5 w-2.5 text-gray-400 rotate-180 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-transform" />
                </button>
                {/* Tooltip for collapsed state */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                    BTC {displayPrice} ({displayPct})
                </div>
            </div>
        );
    }

    // ── Expanded chart card ────────────────────────────────────────
    return (
        <div ref={ref} className="mx-4 mb-3">
            <div className="rounded-xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
                {/* Header — compact row with pair, price, pct, collapse */}
                <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="w-full flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-gray-900 dark:text-gray-200">₿ BTC-USDT</span>
                        <span className={cn(
                            "text-xs font-semibold tabular-nums",
                            isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500",
                        )}>
                            {displayPrice}
                        </span>
                        <span className={cn(
                            "text-[10px] font-medium tabular-nums",
                            isUp ? "text-emerald-600/80 dark:text-emerald-400/80" : "text-red-500/80",
                        )}>
                            {displayPct}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {/* Range buttons */}
                        <div className="flex gap-0.5">
                            {(Object.keys(RANGE_CONFIG) as TimeRange[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={(e) => { e.stopPropagation(); setRange(r); }}
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                                        range === r
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
                                    )}
                                >
                                    {RANGE_CONFIG[r].label}
                                </button>
                            ))}
                        </div>
                        <ChevronUp className="h-3 w-3 text-gray-400 ml-0.5" />
                    </div>
                </button>

                {/* Sparkline */}
                <div className="px-3 py-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-[70px] text-gray-400 dark:text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-xs">Loading…</span>
                        </div>
                    ) : closes.length > 1 ? (
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                            <line x1="0" y1={PAD} x2={W} y2={PAD} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                            <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                            <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                            <polyline
                                fill="none"
                                stroke={lineColor}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={points}
                            />
                            <circle cx={dotX} cy={dotY} r="3.5" fill={lineColor} opacity="0.9" />
                            <circle cx={dotX} cy={dotY} r="3.5" fill="none" stroke={lineColor} strokeWidth="1" opacity="0.4">
                                <animate attributeName="r" from="3.5" to="8" dur="1.5s" repeatCount="indefinite" />
                                <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                    ) : (
                        <div className="flex items-center justify-center h-[70px] text-gray-400 text-xs">
                            No data available
                        </div>
                    )}
                </div>

                {/* Footer — date + volume */}
                <div className="border-t border-gray-100 dark:border-white/5 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        {lastCandleTime}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                        Vol {displayVolume}
                    </span>
                </div>
            </div>
        </div>
    );
}

function formatPrice(n: number): string {
    if (n >= 1000) {
        return `$${(n / 1000).toFixed(1)}k`;
    }
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatVolume(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toFixed(2);
}

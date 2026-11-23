"use client";

// Sidebar's "which strategies are running" entry -- the contextual sibling of
// LiveTradeMonitor. Renders nothing until a strategy is activated, then lists
// every live strategy (armed or in a position); each row opens that
// strategy's dedicated monitor at /strategy/live?id=<id>.

import Link from "next/link";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveStrategies } from "@/lib/useLiveStrategies";
import { useLivePositions, type LivePosition } from "@/lib/useLivePositions";
import type { StrategyListItem } from "@/lib/hummingbot-api";

function normalizeSymbol(value: string | null | undefined): string {
    return (value ?? "").replace(/[-_]/g, "").toUpperCase();
}

function formatPnl(value: number | null): string {
    if (value === null) return "";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}`;
}

function monitorHref(s: StrategyListItem): string {
    return `/strategy/live?id=${encodeURIComponent(s.id)}`;
}

// Cheap PnL: match the strategy's symbol against the already-polled live
// positions (shared TradingStatusProvider data, no extra request). Only shown
// while the strategy is in a position; the monitor page has the exact figure.
function positionFor(s: StrategyListItem, positions: LivePosition[]): LivePosition | null {
    if (s.phase !== "in_position" || !s.symbol) return null;
    const symbol = normalizeSymbol(s.symbol);
    return positions.find((p) => normalizeSymbol(p.symbol) === symbol) ?? null;
}

function PhasePill({ phase }: { phase: string }) {
    const inPosition = phase === "in_position";
    return (
        <span
            className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                inPosition
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
            )}
        >
            {inPosition ? "In position" : "Armed"}
        </span>
    );
}

export default function LiveStrategiesMonitor({ collapsed }: { collapsed: boolean }) {
    const { live } = useLiveStrategies();
    const positions = useLivePositions();

    if (live.length === 0) return null;

    if (collapsed) {
        return (
            <div className="mx-2 mb-2 flex justify-center relative group">
                <Link
                    href={live.length === 1 ? monitorHref(live[0]) : "/strategy/live"}
                    prefetch={false}
                    aria-label="Live strategies"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400"
                >
                    <Radio className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                        {live.length}
                    </span>
                </Link>
                {/* Tooltip for collapsed state */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                    {live.map((s) => s.label).join(", ")}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-4 mb-3 rounded-xl glass-panel px-3 py-2.5">
            <Link
                href="/strategy/live"
                prefetch={false}
                className="mb-2 flex items-center gap-1.5"
            >
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Live strategies
                </span>
                {live.length > 1 && (
                    <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
                        {live.length}
                    </span>
                )}
            </Link>

            <div className="space-y-1">
                {live.map((s) => {
                    const pos = positionFor(s, positions);
                    const pnl = pos?.unrealizedPnl ?? null;
                    return (
                        <Link
                            key={s.id}
                            href={monitorHref(s)}
                            prefetch={false}
                            title={`Open ${s.label} monitor`}
                            className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        >
                            <span className="min-w-0 truncate font-semibold text-gray-900 dark:text-white">
                                {s.label}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                                {pnl !== null && (
                                    <span
                                        className={cn(
                                            "font-semibold tabular-nums",
                                            pnl >= 0 ? "text-emerald-500" : "text-red-400",
                                        )}
                                    >
                                        {formatPnl(pnl)}
                                    </span>
                                )}
                                <PhasePill phase={s.phase} />
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

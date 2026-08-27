"use client";

// Sidebar's "is there a live trade right now" indicator -- deliberately
// minimal when flat, and glass-panel prominent the moment a position opens.
// Renders every open position (not just the first one, as the dead
// LiveInfoWidget it replaced used to), each tagged with its provider, so a
// second concurrent position -- same exchange or a future different one --
// shows up as another row with no code change here. Links straight into
// /execution, which already has the full position table, agent activity,
// and live monitor log built out.

import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLivePositions } from "@/lib/useLivePositions";

function formatSize(value: number | null): string {
    if (value === null) return "—";
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatPnl(value: number | null): string {
    if (value === null) return "—";
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })}`;
}

export default function LiveTradeMonitor({ collapsed }: { collapsed: boolean }) {
    const positions = useLivePositions();
    const isLive = positions.length > 0;

    if (collapsed) {
        if (!isLive) return null;
        return (
            <div className="mx-2 mb-2 flex justify-center relative group">
                <Link
                    href="/execution"
                    prefetch={false}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                    <Activity className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                        {positions.length}
                    </span>
                </Link>
                {/* Tooltip for collapsed state */}
                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                    {positions.map((p) => `${p.side} ${p.symbol}`).join(", ")}
                </div>
            </div>
        );
    }

    // Expanded + idle: return null so the tabbed recent-trades/setups area
    // (SidebarQuickActions) fills this space instead. No redundant "No live
    // trades" row.
    if (!isLive) return null;

    return (
        <Link
            href="/execution"
            prefetch={false}
            className="mx-4 mb-3 block rounded-xl glass-panel px-3 py-2.5 transition-transform hover:scale-[1.01]"
        >
            <div className="mb-2 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Live
                </span>
                {positions.length > 1 && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {positions.length} open
                    </span>
                )}
            </div>

            <div className="space-y-1.5">
                {positions.map((p) => {
                    const isLong = p.side === "long";
                    const Icon = isLong ? ArrowUpRight : ArrowDownRight;
                    const pnlPositive = (p.unrealizedPnl ?? 0) >= 0;
                    return (
                        <div key={p.key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5">
                                <Icon className={cn("h-3.5 w-3.5 shrink-0", isLong ? "text-emerald-500" : "text-red-500")} />
                                <span className="truncate font-semibold text-gray-900 dark:text-white">{p.symbol}</span>
                                <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                                    {formatSize(p.size)}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    "shrink-0 font-semibold tabular-nums",
                                    pnlPositive ? "text-emerald-500" : "text-red-400",
                                )}
                            >
                                {formatPnl(p.unrealizedPnl)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </Link>
    );
}

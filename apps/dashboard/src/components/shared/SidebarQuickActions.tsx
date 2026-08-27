"use client";

// Idle-state sidebar widget: tabbed "Recent Trades" / "Setups" area that
// replaces the LiveTradeMonitor card when no position is open. The floating
// "+" action button lives separately (FloatingSidebarActions) centered at
// the top of the footer section.

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLivePositions } from "@/lib/useLivePositions";

type ViewTab = "trades" | "setups";

// ── component ────────────────────────────────────────────────────────

export default function SidebarQuickActions() {
    const positions = useLivePositions();
    const isLive = positions.length > 0;

    // If a position is open, the LiveTradeMonitor renders instead — this
    // widget hides itself so the sidebar never shows both.
    if (isLive) return null;

    return <RecentActivityList />;
}

// ── Recent activity list ────────────────────────────────────────────

function RecentActivityList() {
    const [view, setView] = useState<ViewTab>("trades");

    return (
        <div className="mx-4 mb-3 rounded-lg border border-gray-200/60 dark:border-white/10 bg-white/60 dark:bg-[#0d1117]/60 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={() => setView("trades")}
                    className={
                        view === "trades"
                            ? "flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500"
                            : "flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    }
                >
                    Recent Trades
                </button>
                <button
                    type="button"
                    onClick={() => setView("setups")}
                    className={
                        view === "setups"
                            ? "flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                            : "flex-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    }
                >
                    Setups
                </button>
            </div>

            {/* Content */}
            <div className="px-2.5 py-2">
                {view === "trades" ? <TradesPlaceholder /> : <SetupsPlaceholder />}
            </div>
        </div>
    );
}

function TradesPlaceholder() {
    return (
        <div className="flex items-center justify-center gap-1.5 py-3 text-[11px] text-gray-400 dark:text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Recent trades will appear here</span>
        </div>
    );
}

function SetupsPlaceholder() {
    return (
        <div className="flex items-center justify-center gap-1.5 py-3 text-[11px] text-gray-400 dark:text-gray-500">
            <Sparkles className="h-3 w-3" />
            <span>Active setups will appear here</span>
        </div>
    );
}

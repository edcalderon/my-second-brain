"use client";

// Real-time process log for the execution monitor. Every entry here is a
// row already written to `notifications` by the background services
// (position_defender.py, risk_guard.py, thesis_monitor.py,
// connectivity_monitor.py -- see notify() call sites) and already
// streamed live via SupabaseProvider's Realtime subscription. This is not
// a separate log transport: it is a filtered, denser view of data the
// dashboard already receives live, scoped to the monitoring system rather
// than the full notification inbox (no read/archive affordances -- this
// is a log, not a to-do list).

import { useState } from "react";
import { Activity, ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { type AppNotification } from "@/components/supabase/SupabaseProvider";
import { formatRelativeTime } from "@/lib/hummingbot-format";

const MONITOR_CATEGORIES = new Set([
    "position_defender",
    "risk_guard",
    "thesis_monitor",
    "connectivity_monitor",
    "volatility_watcher",
]);

const SEVERITY_DOT: Record<string, string> = {
    info: "bg-sky-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
};

const CATEGORY_LABEL: Record<string, string> = {
    position_defender: "Position Defender",
    risk_guard: "Risk Guard",
    thesis_monitor: "Thesis Monitor",
    connectivity_monitor: "Connectivity",
    volatility_watcher: "Volatility Watcher",
};

export function MonitorLogFeed({ notifications }: { notifications: AppNotification[] }) {
    const entries = notifications
        .filter((n) => MONITOR_CATEGORIES.has(n.category))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100);

    return (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <ScrollText className="h-5 w-5 text-emerald-700" />
                        Live monitor log
                    </h2>
                    <p className="text-sm text-gray-500">
                        Real-time feed of what the monitoring backend has actually done -- streamed live, newest first.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-emerald-700">
                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                    Live
                </span>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-white divide-y divide-gray-100">
                {entries.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">
                        No monitor activity recorded yet -- entries appear here the moment a background service logs one.
                    </p>
                )}
                {entries.map((n) => (
                    <LogRow key={n.id} entry={n} />
                ))}
            </div>
        </div>
    );
}

function LogRow({ entry }: { entry: AppNotification }) {
    const [expanded, setExpanded] = useState(false);
    const dot = SEVERITY_DOT[entry.severity] ?? SEVERITY_DOT.info;
    const label = CATEGORY_LABEL[entry.category] ?? entry.category;

    return (
        <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
        >
            <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{entry.title}</p>
                        <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
                            {formatRelativeTime(entry.created_at)}
                        </span>
                    </div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-0.5">{label}</p>
                    {expanded ? (
                        <p className="mt-1.5 text-xs text-gray-600 whitespace-pre-wrap">{entry.message}</p>
                    ) : (
                        <p className="mt-1.5 text-xs text-gray-500 line-clamp-1">{entry.message}</p>
                    )}
                </div>
                {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-300 mt-1" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 mt-1" />
                )}
            </div>
        </button>
    );
}

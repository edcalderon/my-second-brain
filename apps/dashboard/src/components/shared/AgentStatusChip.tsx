"use client";

// Shared agent-activity chip -- originally defined only inside
// AgentActivityTab.tsx (Strategy Desk page). Extracted so the Execution
// monitor page can render the same real agent_status state (from
// GET /agents/status, see api-svc services/agent_status.py) with
// identical styling instead of duplicating the state->style map.

import { Activity, Brain, Moon, PenLine } from "lucide-react";
import { type AgentActivityState } from "@/lib/hummingbot-api";

export const AGENT_STATE_STYLES: Record<
    AgentActivityState,
    { dot: string; badge: string; icon: typeof Brain; label: string }
> = {
    idle: {
        dot: "bg-gray-300",
        badge: "bg-gray-50 text-gray-600 border-gray-200",
        icon: Moon,
        label: "Idle",
    },
    thinking: {
        dot: "bg-sky-500 animate-pulse",
        badge: "bg-sky-50 text-sky-700 border-sky-200",
        icon: Brain,
        label: "Thinking",
    },
    writing: {
        dot: "bg-amber-500 animate-pulse",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        icon: PenLine,
        label: "Writing",
    },
    monitoring: {
        dot: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Activity,
        label: "Monitoring",
    },
};

export function AgentStatusChip({
    label,
    entry,
    detailOverride,
}: {
    label: string;
    entry: { state: AgentActivityState; detail: string | null; updated_at: string | null } | null;
    detailOverride?: string | null;
}) {
    const state = entry?.state ?? "idle";
    const style = AGENT_STATE_STYLES[state];
    const Icon = style.icon;
    const detail = detailOverride || entry?.detail;

    return (
        <div className="rounded-xl border border-border bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{label}</span>
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
            </div>
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${style.badge}`}
            >
                <Icon className="h-3 w-3" />
                {style.label}
            </span>
            <p className="text-xs text-gray-500 line-clamp-2" title={detail ?? undefined}>
                {detail || "No activity recorded yet."}
            </p>
        </div>
    );
}

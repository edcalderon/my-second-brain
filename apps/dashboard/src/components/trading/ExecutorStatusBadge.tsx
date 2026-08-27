"use client";

import { AlertTriangle, Server } from "lucide-react";
import { formatRelativeTime } from "@/lib/hummingbot-format";
import type { HummingbotStatus } from "@/lib/hummingbot-api";

type ExecutorBadgeProps = {
    status: HummingbotStatus | null;
    lastUpdated?: Date | null;
};

/**
 * Compact inline badge showing which executor backend the dashboard is
 * connected to and its current health state.
 *
 * Green dot  — primary executor, healthy
 * Amber dot  — fallback active or degraded
 * Red dot    — disconnected / no data
 *
 * Designed for the command-center header chip row. Hover for details.
 */
export function ExecutorStatusBadge({ status, lastUpdated }: ExecutorBadgeProps) {
    const executorId = status?.executor_id ?? null;
    const executorLabel = status?.executor_label ?? null;
    const executorPriority = status?.executor_priority ?? null;
    const healthState = status?.service_health?.state ?? null;
    const fallbackActive = status?.service_health?.fallback_active ?? false;

    if (!executorId) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
                </span>
                Disconnected
            </span>
        );
    }

    // Determine tone: red if unhealthy, amber if fallback/degraded, green otherwise.
    const isDisconnected = healthState === "offline";
    const isDegraded = healthState === "degraded" || fallbackActive;
    const isPrimary = executorPriority === "primary";

    if (isDisconnected) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
                </span>
                {executorLabel ?? executorId}
            </span>
        );
    }

    if (isDegraded || !isPrimary) {
        return (
            <span
                className="group relative inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700"
                title={`${executorId} · ${executorPriority ?? "fallback"} · last check ${lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : "just now"}`}
            >
                <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {executorLabel ?? executorId}
                {/* Tooltip on hover */}
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2 py-1 text-[10px] normal-case tracking-normal text-gray-600 shadow-sm group-hover:block">
                    {executorId} · {executorPriority ?? "fallback"}
                    {lastUpdated && <> · {formatRelativeTime(lastUpdated.toISOString())}</>}
                </span>
            </span>
        );
    }

    return (
        <span
            className="group relative inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700"
            title={`${executorId} · ${executorPriority} · last check ${lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : "just now"}`}
        >
            <span className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {executorLabel ?? executorId}
            {/* Tooltip on hover */}
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-white px-2 py-1 text-[10px] normal-case tracking-normal text-gray-600 shadow-sm group-hover:block">
                {executorId} · {executorPriority}
                {lastUpdated && <> · {formatRelativeTime(lastUpdated.toISOString())}</>}
            </span>
        </span>
    );
}

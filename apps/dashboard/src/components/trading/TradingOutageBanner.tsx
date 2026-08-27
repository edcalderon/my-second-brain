"use client";

import { ChevronDown, ChevronUp, Info, ShieldAlert, XCircle } from "lucide-react";
import { useState } from "react";
import type { TradingOutageNotice } from "@/lib/hummingbot-api";

function IssueRow({
    text,
    variant,
}: {
    text: string;
    variant: "critical" | "info";
}) {
    if (variant === "info") {
        return (
            <li className="flex items-start gap-2 rounded-lg border border-white/40 bg-white/40 px-3 py-2 text-xs leading-5 dark:border-slate-800 dark:bg-slate-950/40">
                <Info className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                <span className="opacity-75">{text}</span>
            </li>
        );
    }
    return (
        <li className="flex items-start gap-2 rounded-lg border border-white/50 bg-white/60 px-3 py-2 text-xs leading-5 dark:border-slate-800 dark:bg-slate-950/50">
            <XCircle className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
            <span>{text}</span>
        </li>
    );
}

export function TradingOutageBanner({
    notice,
    className = "",
}: {
    notice: TradingOutageNotice | null;
    className?: string;
}) {
    const [expanded, setExpanded] = useState(true);

    if (!notice) {
        return null;
    }

    const hasCriticalDetails = notice.details.length > 0;
    const hasInfoDetails = (notice.infoDetails ?? []).length > 0;
    const hasAnyDetails = hasCriticalDetails || hasInfoDetails;

    const toneClasses =
        notice.state === "offline"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200";

    const badgeClasses =
        notice.state === "offline"
            ? "border-red-200 bg-white/80 text-red-700 dark:border-red-900/40 dark:bg-slate-950/60 dark:text-red-200"
            : "border-amber-200 bg-white/80 text-amber-700 dark:border-amber-900/40 dark:bg-slate-950/60 dark:text-amber-200";

    return (
        <div
            role="alert"
            className={`rounded-2xl border px-4 py-4 shadow-sm ${toneClasses} ${className}`.trim()}
        >
            {/* Header row — always visible */}
            <button
                type="button"
                onClick={() => hasAnyDetails && setExpanded(!expanded)}
                className={`w-full text-left ${hasAnyDetails ? "cursor-pointer" : "cursor-default"}`}
                aria-expanded={expanded}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${badgeClasses}`}
                    >
                        {notice.state === "offline" ? (
                            <ShieldAlert className="h-4 w-4" />
                        ) : (
                            <Info className="h-4 w-4" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold">{notice.title}</h3>
                            <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${badgeClasses}`}
                            >
                                {notice.state}
                            </span>
                            {hasAnyDetails && (
                                <span className="ml-auto text-xs opacity-60">
                                    {expanded ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    )}
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm leading-6">{notice.message}</p>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] opacity-80">
                            {notice.endpointLabel}
                            {notice.statusCode !== null ? ` · ${notice.statusCode}` : ""}
                        </p>
                    </div>
                </div>
            </button>

            {/* Expandable details — stacked issue list */}
            {hasAnyDetails && expanded && (
                <div className="mt-3 border-t border-black/5 pt-3 dark:border-white/5">
                    {hasCriticalDetails && (
                        <>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">
                                Issues
                            </p>
                            <ul className="space-y-1.5">
                                {notice.details.map((detail, i) => (
                                    <IssueRow key={i} text={detail} variant="critical" />
                                ))}
                            </ul>
                        </>
                    )}
                    {hasCriticalDetails && hasInfoDetails && (
                        <div className="my-2" />
                    )}
                    {hasInfoDetails && (
                        <>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-50">
                                Secondary dependencies
                            </p>
                            <ul className="space-y-1.5">
                                {notice.infoDetails!.map((detail, i) => (
                                    <IssueRow key={i} text={detail} variant="info" />
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

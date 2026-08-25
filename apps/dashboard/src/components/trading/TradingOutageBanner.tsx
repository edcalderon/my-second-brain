"use client";

import { ShieldAlert } from "lucide-react";
import type { TradingOutageNotice } from "@/lib/hummingbot-api";

export function TradingOutageBanner({
    notice,
    className = "",
}: {
    notice: TradingOutageNotice | null;
    className?: string;
}) {
    if (!notice) {
        return null;
    }

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
            <div className="flex items-start gap-3">
                <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${badgeClasses}`}
                >
                    <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{notice.title}</h3>
                        <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${badgeClasses}`}
                        >
                            {notice.state}
                        </span>
                    </div>
                    <p className="text-sm leading-6">{notice.message}</p>
                    {notice.details.length > 0 && (
                        <ul className="space-y-1 text-xs leading-5 opacity-90">
                            {notice.details.slice(0, 3).map((detail) => (
                                <li key={detail} className="rounded-lg border border-white/50 bg-white/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs font-medium uppercase tracking-[0.22em] opacity-80">
                        {notice.endpointLabel}
                        {notice.statusCode !== null ? ` · ${notice.statusCode}` : ""}
                    </p>
                </div>
            </div>
        </div>
    );
}

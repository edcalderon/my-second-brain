"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/hummingbot-format";
import type { HummingbotPreview } from "@/lib/hummingbot-api";

type MarketSnapshotProps = {
    preview: HummingbotPreview | null;
    loading: boolean;
    onRefresh: () => void;
};

export function MarketSnapshot({ preview, loading, onRefresh }: MarketSnapshotProps) {
    return (
        <section className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Market Snapshot</h2>
                    <p className="text-sm text-gray-500">BTCUSDT live signals — auto-refreshed every 30s.</p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Metric label="Signal" value={preview?.signal || "—"} />
                <Metric label="RSI" value={preview?.rsi != null ? formatNumber(preview.rsi, 2) : "—"} />
                <Metric
                    label="Latest Close"
                    value={preview?.latest_close != null ? `$${formatNumber(preview.latest_close, 2)}` : "—"}
                />
                <Metric
                    label="EMA Fast"
                    value={preview?.ema_fast != null ? formatNumber(preview.ema_fast, 2) : "—"}
                />
                <Metric
                    label="EMA Slow"
                    value={preview?.ema_slow != null ? formatNumber(preview.ema_slow, 2) : "—"}
                />
            </div>

            {preview?.reason && (
                <div className="rounded-xl border border-border bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Signal reason</p>
                    <p className="text-sm text-gray-700">{preview.reason}</p>
                </div>
            )}

            {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading market data…
                </div>
            )}
        </section>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                {label}
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    );
}

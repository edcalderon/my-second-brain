"use client";

import { RefreshCw, Loader2, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/hummingbot-format";
import type { HummingbotPreview } from "@/lib/hummingbot-api";

// Extended preview type that includes regime info (available after Migration 0011)
type HummingbotPreviewWithRegime = HummingbotPreview & {
    regime_info?: {
        regime: "trend" | "range";
        vol_bucket: "low" | "medium" | "high";
        adx: number;
        atr_pct: number;
    } | null;
};

type MarketDataTabProps = {
    preview: HummingbotPreviewWithRegime | null;
    loading: boolean;
    onRefresh: () => void;
};

export function MarketDataTab({ preview, loading, onRefresh }: MarketDataTabProps) {
    return (
        <div className="space-y-6">
            {/* Market Snapshot Card */}
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

                {preview?.regime_info && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <RegimeMetric
                            label="Regime"
                            value={preview.regime_info.regime || "N/A"}
                            tone={preview.regime_info.regime === "trend" ? "positive" : "default"}
                        />
                        <RegimeMetric
                            label="Vol Bucket"
                            value={preview.regime_info.vol_bucket || "N/A"}
                        />
                        <RegimeMetric
                            label="ADX"
                            value={preview.regime_info.adx != null ? preview.regime_info.adx.toFixed(1) : "—"}
                        />
                    </div>
                )}

                {loading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading market data…
                    </div>
                )}
            </section>
        </div>
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

function RegimeMetric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "negative" }) {
    const colors = {
        default: "text-gray-900 dark:text-white",
        positive: "text-emerald-600 dark:text-emerald-400",
        negative: "text-rose-600 dark:text-rose-400",
    };

    return (
        <div className="rounded-lg border border-border bg-white p-3 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                {label}
            </p>
            <p className={`mt-1 text-lg font-semibold ${colors[tone]}`}>{value}</p>
        </div>
    );
}

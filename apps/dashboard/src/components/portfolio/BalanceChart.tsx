"use client";

import { useId, type ReactNode } from "react";
import { Activity, Clock3, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { combineBalanceSeries, summarizeBalanceSeries, type BalancePoint } from "@/lib/balance-series";
import { formatCompactCurrency, formatCurrency, formatNumber, formatPercent, formatTime } from "@/lib/hummingbot-format";

type BalanceChartCardProps = {
    history: BalancePoint[];
    currentBalanceUsd: number | null;
    currentBalanceEth: number | null;
    sourceLabel: string;
    updatedAt?: string | null;
    loading?: boolean;
    fallbackNote?: string | null;
};

export function BalanceChartCard({
    history,
    currentBalanceUsd,
    currentBalanceEth,
    sourceLabel,
    updatedAt,
    loading = false,
    fallbackNote,
}: BalanceChartCardProps) {
    if (loading) {
        return <BalanceChartSkeleton />;
    }

    const series = combineBalanceSeries([], history);
    const summary = summarizeBalanceSeries(series);
    const currentValue = currentBalanceUsd ?? summary?.latest.totalValueUsd ?? null;
    const currentEth = currentBalanceEth ?? summary?.latest.totalValueEth ?? null;
    const deltaUsd = summary?.delta ?? 0;
    const deltaPct = summary?.deltaPct ?? 0;
    const trendIsPositive = summary ? summary.changeIsPositive : true;
    const deltaLabel = summary ? `${trendIsPositive ? "+" : ""}${formatCurrency(Math.abs(deltaUsd), 2)}` : "--";
    const deltaPercentLabel = summary ? `${trendIsPositive ? "+" : ""}${formatPercent(Math.abs(deltaPct), 2)}` : "--";
    const rangeLabel =
        summary && Number.isFinite(summary.min) && Number.isFinite(summary.max)
            ? `${formatCompactCurrency(summary.min, 2)} - ${formatCompactCurrency(summary.max, 2)}`
            : "--";

    const chartId = useId().replace(/:/g, "");
    const gradientId = `portfolio-balance-gradient-${chartId}`;
    const lineId = `portfolio-balance-line-${chartId}`;
    const sampleCount = series.length;

    const chart = series.length ? buildChartPath(series) : null;

    return (
        <section className="glass-panel rounded-[32px] p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Activity className="h-3.5 w-3.5" />
                        Current balance
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Live equity and balance trend</h2>
                    <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                        A live balance view stitched together from the Hummingbot tracker and the stored Supabase snapshot trail.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <InfoChip icon={<Clock3 className="h-3.5 w-3.5" />} label={updatedAt ? formatTime(updatedAt) : "Waiting for live update"} />
                    <InfoChip icon={<Gauge className="h-3.5 w-3.5" />} label={sourceLabel} />
                </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/55 to-amber-50/65 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:border-emerald-900/30 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">Tracked balance</p>
                            <div className="mt-2 flex items-baseline gap-3">
                                <span className="text-4xl font-semibold text-gray-900 dark:text-white lg:text-5xl">
                                    {currentValue === null ? "--" : formatCurrency(currentValue, 2)}
                                </span>
                                <span className="pb-1 text-sm font-medium text-gray-500 dark:text-gray-400">USD</span>
                            </div>
                            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-400">
                                {fallbackNote || "The live tracker updates this value whenever the backend posts a new snapshot."}
                            </p>
                        </div>

                        <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${trendIsPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"}`}>
                            <span className="inline-flex items-center gap-1.5">
                                {trendIsPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                {deltaLabel}
                            </span>
                            <span className="ml-2 opacity-80">{deltaPercentLabel}</span>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-inner backdrop-blur-sm dark:border-white/5 dark:bg-slate-950/50">
                        {chart ? (
                            <svg viewBox="0 0 120 64" className="h-44 w-full" role="img" aria-label="Portfolio balance chart">
                                <defs>
                                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                                    </linearGradient>
                                    <linearGradient id={lineId} x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
                                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
                                    </linearGradient>
                                </defs>
                                <g className="text-emerald-600 dark:text-emerald-400">
                                    <path d={chart.areaPath} fill={`url(#${gradientId})`} />
                                    <path
                                        d={chart.linePath}
                                        fill="none"
                                        stroke={`url(#${lineId})`}
                                        strokeWidth="2.75"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {chart.points.map((point, index) => (
                                        <circle
                                            key={`${point.time}-${index}`}
                                            cx={point.x}
                                            cy={point.y}
                                            r={index === chart.points.length - 1 ? 2.9 : 1.8}
                                            className={index === chart.points.length - 1 ? "fill-emerald-500 dark:fill-emerald-300" : "fill-emerald-400/80 dark:fill-emerald-300/70"}
                                        />
                                    ))}
                                </g>
                            </svg>
                        ) : (
                            <div className="flex h-44 items-center justify-center rounded-[20px] border border-dashed border-emerald-200/70 bg-white/70 text-sm text-gray-500 dark:border-emerald-900/40 dark:bg-slate-950/50 dark:text-gray-400">
                                Waiting for enough balance samples to draw the live chart.
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <StatBadge label="Latest ETH" value={currentEth === null ? "--" : formatNumber(currentEth, 4)} />
                        <StatBadge label="Tracked range" value={rangeLabel} />
                        <StatBadge label="Samples" value={`${sampleCount}`} />
                    </div>
                </div>

                <div className="space-y-3">
                    <MetricCard label="Balance source" value={sourceLabel} helper="The UI prefers the live tracker and falls back to stored snapshots when the live value is unavailable." />
                    <MetricCard label="Last sync" value={updatedAt ? formatTime(updatedAt) : "--"} helper="Most recent live snapshot timestamp from the backend." />
                    <MetricCard label="Trend window" value={summary ? `${summary.first ? formatTime(summary.first.time) : "--"} → ${summary.latest ? formatTime(summary.latest.time) : "--"}` : "--"} helper="The current chart window is derived from the latest tracked points." />
                </div>
            </div>
        </section>
    );
}

export function BalanceChartSkeleton() {
    return (
        <section className="glass-panel animate-pulse rounded-[32px] p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <div className="h-6 w-36 rounded-full bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="h-8 w-72 rounded-2xl bg-slate-200/80 dark:bg-slate-700/70" />
                    <div className="h-4 w-[min(100%,34rem)] rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                </div>
                <div className="flex gap-2">
                    <div className="h-8 w-28 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                    <div className="h-8 w-28 rounded-full bg-slate-200/70 dark:bg-slate-700/60" />
                </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-[28px] border border-border/80 bg-white/60 p-5 dark:bg-slate-900/60">
                    <div className="h-12 w-64 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60" />
                    <div className="mt-5 h-44 rounded-[24px] bg-gradient-to-b from-slate-200/70 to-slate-100/50 dark:from-slate-700/60 dark:to-slate-800/40" />
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60" />
                        <div className="h-14 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60" />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="h-24 rounded-[24px] bg-slate-200/70 dark:bg-slate-700/60" />
                    <div className="h-24 rounded-[24px] bg-slate-200/70 dark:bg-slate-700/60" />
                    <div className="h-24 rounded-[24px] bg-slate-200/70 dark:bg-slate-700/60" />
                </div>
            </div>
        </section>
    );
}

function buildChartPath(points: BalancePoint[]) {
    const width = 120;
    const height = 64;
    const padding = 6;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const values = points.map((point) => point.totalValueUsd);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min;
    const safeSpread = spread === 0 ? Math.max(Math.abs(max), 1) : spread;
    const normalized = points.length === 1
        ? [points[0], { ...points[0], time: `${points[0].time}-dup` }]
        : points;

    const coordinates = normalized.map((point, index) => {
        const x = normalized.length === 1 ? width / 2 : padding + (index / (normalized.length - 1)) * plotWidth;
        const normalizedValue = (point.totalValueUsd - min) / safeSpread;
        const y = padding + (1 - normalizedValue) * plotHeight;
        return { ...point, x, y };
    });

    const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const areaPath = [
        `M ${coordinates[0].x.toFixed(2)} ${height - padding}`,
        ...coordinates.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
        `L ${coordinates[coordinates.length - 1].x.toFixed(2)} ${height - padding}`,
        "Z",
    ].join(" ");

    return {
        points: coordinates,
        linePath,
        areaPath,
    };
}

function InfoChip({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm dark:bg-slate-900 dark:text-gray-300">
            {icon}
            {label}
        </span>
    );
}

function StatBadge({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
        </div>
    );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
    return (
        <div className="rounded-[24px] border border-border bg-white/85 p-4 shadow-sm dark:bg-slate-900">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{helper}</p>
        </div>
    );
}

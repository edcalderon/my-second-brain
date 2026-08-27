"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { BalancePoint } from "@/lib/balance-series";
import { formatCurrency, formatTime } from "@/lib/hummingbot-format";

type EquityCurveChartProps = {
  data: BalancePoint[];
  currentUsd: number | null;
};

type ChartData = {
  time: string;
  value: number;
  displayTime: string;
};

export function EquityCurveChart({ data, currentUsd }: EquityCurveChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((point) => ({
      time: point.time,
      value: point.totalValueUsd,
      displayTime: formatDisplayTime(point.time),
    }));
  }, [data]);

  const { min, max, avg } = useMemo(() => {
    if (!chartData.length) {
      return { min: 0, max: 0, avg: 0 };
    }

    const values = chartData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    return { min, max, avg };
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-emerald-200/70 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">No data yet</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Portfolio history will appear here as trades are executed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 w-full lg:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            vertical={false}
            className="dark:stroke-slate-700"
          />

          <XAxis
            dataKey="displayTime"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            className="dark:text-slate-400"
          />

          <YAxis
            domain={[Math.floor(min * 0.95), Math.ceil(max * 1.05)]}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
            tickLine={false}
            axisLine={false}
            width={50}
            className="dark:text-slate-400"
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;

              const data = payload[0].payload as ChartData;

              return (
                <div className="rounded-lg border border-border bg-white p-3 shadow-lg dark:bg-slate-900">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(data.value, 2)}
                  </p>
                </div>
              );
            }}
          />

          {/* Reference line for average */}
          <ReferenceLine
            y={avg}
            stroke="#9ca3af"
            strokeDasharray="3 3"
            label={{ value: "Avg", fontSize: 10, fill: "#9ca3af" }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#equityGradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#10b981",
              stroke: "#fff",
              strokeWidth: 2,
            }}
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDisplayTime(timeString: string): string {
  const date = new Date(timeString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

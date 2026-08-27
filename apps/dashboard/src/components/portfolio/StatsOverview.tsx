"use client";

import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/hummingbot-format";

type StatsOverviewProps = {
  balanceUsd: number | null;
  balanceEth: number | null;
  totalPnL: number;
  openPositions: number;
  mainWalletUsdc?: number | null;
};

export function StatsOverview({
  balanceUsd,
  balanceEth,
  totalPnL,
  openPositions,
  mainWalletUsdc,
}: StatsOverviewProps) {
  const isPositive = totalPnL >= 0;

  const stats = [
    {
      label: "Total Balance",
      value: balanceUsd !== null ? formatCurrency(balanceUsd, 2) : "--",
      subvalue: balanceEth !== null ? `${formatNumber(balanceEth, 4)} ETH` : undefined,
      icon: <Wallet className="h-4 w-4" />,
      tone: "default" as const,
    },
    {
      label: "Unrealized PnL",
      value: `${isPositive ? "+" : ""}${formatCurrency(Math.abs(totalPnL), 2)}`,
      icon: isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
      tone: isPositive ? ("positive" as const) : "negative" as const,
    },
    {
      label: "Open Positions",
      value: `${openPositions}`,
      subvalue: openPositions > 0 ? "Active trades" : "No positions",
      icon: <Activity className="h-4 w-4" />,
      tone: "default" as const,
    },
    {
      label: "Main Wallet",
      value: mainWalletUsdc !== null ? formatCurrency(mainWalletUsdc, 2) : "--",
      subvalue: "USDC",
      icon: <Wallet className="h-4 w-4" />,
      tone: "default" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  subvalue,
  icon,
  tone,
}: {
  label: string;
  value: string;
  subvalue?: string;
  icon: React.ReactNode;
  tone: "default" | "positive" | "negative";
}) {
  const toneClasses = {
    default: "border-border bg-white dark:bg-slate-900",
    positive: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    negative: "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20",
  };

  const valueColor = {
    default: "text-gray-900 dark:text-white",
    positive: "text-emerald-600 dark:text-emerald-400",
    negative: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-colors ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800">
          {icon}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>

      <div className="mt-2">
        <p className={`text-lg font-semibold ${valueColor[tone]}`}>{value}</p>
        {subvalue && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subvalue}</p>
        )}
      </div>
    </div>
  );
}

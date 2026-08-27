"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/hummingbot-format";

export type PositionWithPnL = {
  tradingPair: string;
  side: "BUY" | "SELL" | "Long" | "Short";
  amount: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
  status?: "open" | "closed";
  raw?: unknown;
};

type PositionCardProps = {
  position: PositionWithPnL;
};

export function PositionCard({ position }: PositionCardProps) {
  const isBuy = position.side === "BUY" || position.side === "Long";
  const pnlPositive = position.unrealizedPnl >= 0;

  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm transition-colors hover:border-emerald-200 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {position.tradingPair}
            </span>
            <span
              className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isBuy
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              {isBuy ? "Long" : "Short"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatNumber(position.amount, 4)} @ {formatCurrency(position.entryPrice, 2)}
          </p>
        </div>

        <div className="text-right">
          <p
            className={`text-lg font-semibold ${
              pnlPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {pnlPositive ? "+" : ""}
            {formatCurrency(position.unrealizedPnl, 2)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {formatNumber(position.leverage, 0)}x leverage
          </p>
        </div>
      </div>

      {/* Progress bar for PnL relative to position size */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>PnL %</span>
          <span>{((position.unrealizedPnl / (position.amount * position.entryPrice)) * 100).toFixed(2)}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${
              pnlPositive ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{
              width: `${Math.min(100, Math.abs((position.unrealizedPnl / (position.amount * position.entryPrice)) * 100 * 2))}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

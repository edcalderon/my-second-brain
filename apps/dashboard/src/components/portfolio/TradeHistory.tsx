"use client";

import { Clock3 } from "lucide-react";
import { formatCurrency, formatNumber, formatTime } from "@/lib/hummingbot-format";

export type TradeHistoryItem = {
  id: string;
  instrument: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice?: number;
  realizedPnl: number;
  closedAt: string;
  durationHours?: number;
  fees?: number;
};

type TradeHistoryProps = {
  trades: TradeHistoryItem[];
};

export function TradeHistory({ trades }: TradeHistoryProps) {
  // Sort by close date, newest first
  const sortedTrades = [...trades].sort((a, b) => {
    return new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime();
  });

  const totalPnL = trades.reduce((sum, t) => sum + t.realizedPnl, 0);
  const wins = trades.filter((t) => t.realizedPnl > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Total PnL"
          value={`${totalPnL >= 0 ? "+" : ""}${formatCurrency(totalPnL, 2)}`}
          tone={totalPnL >= 0 ? "positive" : "negative"}
        />
        <SummaryStat label="Trades" value={`${trades.length}`} />
        <SummaryStat label="Win Rate" value={`${winRate.toFixed(1)}%`} />
      </div>

      {/* Trade List */}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-slate-950">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                Instrument
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                Side
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                Entry
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                Exit
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                PnL
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">
                Closed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-slate-900">
            {sortedTrades.map((trade) => (
              <tr
                key={trade.id}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {trade.instrument}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      trade.side === "long"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                  >
                    {trade.side}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
                  {formatCurrency(trade.entryPrice, 2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-200">
                  {trade.exitPrice ? formatCurrency(trade.exitPrice, 2) : "--"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span
                    className={`font-semibold ${
                      trade.realizedPnl >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {trade.realizedPnl >= 0 ? "+" : ""}
                    {formatCurrency(trade.realizedPnl, 2)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                  <div className="flex items-center justify-end gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatTime(trade.closedAt)}
                  </div>
                  {trade.durationHours && (
                    <p className="text-[10px] text-gray-400">
                      {trade.durationHours < 1
                        ? `${(trade.durationHours * 60).toFixed(0)}m`
                        : `${trade.durationHours.toFixed(1)}h`}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
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
      <p className={`mt-1 text-lg font-semibold ${colors[tone || "default"]}`}>{value}</p>
    </div>
  );
}

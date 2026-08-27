"use client";

import { Zap, Target, Loader2 } from "lucide-react";
import type { HummingbotPosition } from "@/lib/hummingbot-api";
import { formatNumber, formatPercent, normalizePosition } from "@/lib/hummingbot-format";

type PositionsTabProps = {
    positions: HummingbotPosition[];
    todayTrades: number;
    targetTrades: number;
    onTargetChange: (target: number) => void;
    activeSetupsCount: number;
};

export function PositionsTab({
    positions,
    todayTrades,
    targetTrades,
    onTargetChange,
    activeSetupsCount,
}: PositionsTabProps) {
    const normalizedPositions = positions.map(normalizePosition);

    return (
        <div className="space-y-6">
            {/* Trade Cadence */}
            <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Trade Cadence</h2>
                        <p className="text-sm text-gray-500">Soft targets — tracks but never blocks.</p>
                    </div>
                    <Target className="h-5 w-5 text-emerald-700" />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white px-5 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Trades today</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900">{todayTrades}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white px-5 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Target per day</p>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={targetTrades}
                            onChange={(e) => onTargetChange(Number(e.target.value) || 3)}
                            className="mt-2 w-20 rounded-lg border border-border bg-gray-50 px-3 py-1 text-lg font-semibold text-gray-900 text-center"
                        />
                    </div>
                    <div className="rounded-xl border border-border bg-white px-5 py-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Active setups</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900">{activeSetupsCount}</p>
                    </div>
                </div>
            </section>

            {/* Open Positions */}
            <section className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Open Positions</h2>
                        <p className="text-sm text-gray-500">
                            {normalizedPositions.length} open position{normalizedPositions.length !== 1 ? "s" : ""}.
                        </p>
                    </div>
                    <Zap className="h-5 w-5 text-emerald-700" />
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-white">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">
                                    Pair
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-500">
                                    Side
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">
                                    Amount
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">
                                    Entry
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">
                                    PnL
                                </th>
                                <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-500">
                                    Leverage
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {normalizedPositions.map((position) => (
                                <tr
                                    key={`${position.tradingPair ?? "pair"}-${position.side ?? "side"}-${position.entryPrice ?? "entry"}-${position.amount ?? "amount"}`}
                                >
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                        {position.tradingPair}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                        {position.side}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">
                                        {formatNumber(position.amount)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">
                                        {formatNumber(position.entryPrice)}
                                    </td>
                                    <td
                                        className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
                                            (position.unrealizedPnl ?? 0) >= 0
                                                ? "text-emerald-600"
                                                : "text-red-600"
                                        }`}
                                    >
                                        {formatNumber(position.unrealizedPnl)}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                                        {formatNumber(position.leverage, 0)}x
                                    </td>
                                </tr>
                            ))}
                            {!normalizedPositions.length && (
                                <tr>
                                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                        No open positions.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

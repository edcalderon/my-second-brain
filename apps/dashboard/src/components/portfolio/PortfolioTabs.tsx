"use client";

import { type ReactNode, useState } from "react";
import { PieChart, TrendingUp, Wallet, History, Target, Activity } from "lucide-react";
import type { BalancePoint } from "@/lib/balance-series";
import { EquityCurveChart } from "./EquityCurveChart";
import { GoalsPanel, type TradingGoal } from "./GoalsPanel";
import { PositionCard, type PositionWithPnL } from "./PositionCard";
import { StatsOverview } from "./StatsOverview";
import { TradeHistory, type TradeHistoryItem } from "./TradeHistory";
import { formatCurrency } from "@/lib/hummingbot-format";

type PortfolioTab = "overview" | "positions" | "history" | "goals";

type PortfolioTabsProps = {
  balanceHistory: BalancePoint[];
  currentBalanceUsd: number | null;
  currentBalanceEth: number | null;
  mainWalletAddress?: string | null;
  mainWalletUsdc?: number | null;
  positions?: PositionWithPnL[];
  trades?: TradeHistoryItem[];
  goals?: TradingGoal[];
  loading?: boolean;
  sourceLabel?: string;
  updatedAt?: string | null;
};

const tabs: { id: PortfolioTab; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Activity className="h-4 w-4" /> },
  { id: "positions", label: "Positions", icon: <Wallet className="h-4 w-4" /> },
  { id: "history", label: "History", icon: <History className="h-4 w-4" /> },
  { id: "goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
];

export function PortfolioTabs({
  balanceHistory,
  currentBalanceUsd,
  currentBalanceEth,
  mainWalletAddress,
  mainWalletUsdc,
  positions = [],
  trades = [],
  goals = [],
  loading = false,
  sourceLabel,
  updatedAt,
}: PortfolioTabsProps) {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("overview");

  if (loading) {
    return <PortfolioTabsSkeleton />;
  }

  const totalPnL = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
  const openPositions = positions.filter((p) => p.status === "open");

  return (
    <section className="glass-panel rounded-2xl p-0 lg:p-0 overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1 overflow-x-auto px-4 lg:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "positions" && openPositions.length > 0 && (
                <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  {openPositions.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-6">
        {activeTab === "overview" && (
          <OverviewTab
            balanceHistory={balanceHistory}
            currentBalanceUsd={currentBalanceUsd}
            currentBalanceEth={currentBalanceEth}
            mainWalletAddress={mainWalletAddress}
            mainWalletUsdc={mainWalletUsdc}
            totalPnL={totalPnL}
            openPositions={openPositions.length}
            sourceLabel={sourceLabel}
            updatedAt={updatedAt}
          />
        )}

        {activeTab === "positions" && (
          <PositionsTab positions={positions} />
        )}

        {activeTab === "history" && (
          <HistoryTab trades={trades} />
        )}

        {activeTab === "goals" && (
          <GoalsPanel
            goals={goals}
            loading={false}
            onEditGoal={(goal) => {
              console.log("Edit goal:", goal);
              // TODO: Open goal editor dialog
            }}
          />
        )}
      </div>
    </section>
  );
}

function OverviewTab({
  balanceHistory,
  currentBalanceUsd,
  currentBalanceEth,
  mainWalletAddress,
  mainWalletUsdc,
  totalPnL,
  openPositions,
  sourceLabel,
  updatedAt,
}: {
  balanceHistory: BalancePoint[];
  currentBalanceUsd: number | null;
  currentBalanceEth: number | null;
  mainWalletAddress?: string | null;
  mainWalletUsdc?: number | null;
  totalPnL: number;
  openPositions: number;
  sourceLabel?: string;
  updatedAt?: string | null;
}) {
  const isPositive = totalPnL >= 0;

  return (
    <div className="space-y-6">
      {/* Equity Curve Chart - Full Width */}
      <div className="rounded-xl border border-emerald-200/70 bg-white p-4 dark:border-emerald-900/30 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
              Portfolio Value
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-gray-900 dark:text-white lg:text-4xl">
                {currentBalanceUsd === null ? "--" : formatCurrency(currentBalanceUsd, 2)}
              </span>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                {isPositive ? "+" : ""}{formatCurrency(totalPnL, 2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentBalanceEth !== null ? `${currentBalanceEth.toFixed(4)} ETH` : "--"}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {updatedAt ? `Updated ${updatedAt}` : "Waiting for update"}
            </p>
          </div>
        </div>

        <EquityCurveChart data={balanceHistory} currentUsd={currentBalanceUsd} />
      </div>

      {/* Stats Grid */}
      <StatsOverview
        balanceUsd={currentBalanceUsd}
        balanceEth={currentBalanceEth}
        totalPnL={totalPnL}
        openPositions={openPositions}
        mainWalletUsdc={mainWalletUsdc}
      />

      {/* Quick Info */}
      <div className="rounded-xl border border-border bg-gray-50/80 p-4 dark:bg-slate-800/50">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Data Source</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {sourceLabel || "Live tracker"} • Main wallet: {mainWalletAddress ? `${mainWalletAddress.slice(0, 6)}...${mainWalletAddress.slice(-4)}` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PositionsTab({ positions }: { positions: PositionWithPnL[] }) {
  if (!positions.length) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <Wallet className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">No open positions</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your open positions will appear here when you start trading.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {positions.map((position) => (
        <PositionCard key={`${position.tradingPair}-${position.side}-${position.entryPrice}`} position={position} />
      ))}
    </div>
  );
}

function HistoryTab({ trades }: { trades: TradeHistoryItem[] }) {
  if (!trades.length) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-center">
        <History className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">No trade history</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Your closed trades will appear here with full PnL details.
        </p>
      </div>
    );
  }

  return <TradeHistory trades={trades} />;
}

function PortfolioTabsSkeleton() {
  return (
    <section className="glass-panel animate-pulse rounded-2xl p-0 lg:p-0 overflow-hidden">
      <div className="border-b border-border bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1 overflow-x-auto px-4 lg:px-6 py-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
      <div className="p-4 lg:p-6">
        <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { TrendingUp, Target, Calendar, Award, AlertCircle } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/hummingbot-format";

export type GoalType = "daily_pnl" | "weekly_pnl" | "monthly_pnl" | "win_rate" | "profit_factor" | "max_drawdown";

export type TradingGoal = {
  id: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string;
  currency?: string;
  is_active: boolean;
  progress_pct: number;
  on_track: boolean;
  days_remaining: number;
};

type GoalsPanelProps = {
  goals: TradingGoal[];
  loading?: boolean;
  onEditGoal?: (goal: TradingGoal) => void;
};

export function GoalsPanel({ goals, loading = false, onEditGoal }: GoalsPanelProps) {
  if (loading) {
    return <GoalsPanelSkeleton />;
  }

  if (!goals.length) {
    return (
      <section className="glass-panel rounded-2xl p-6 lg:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Target className="h-3.5 w-3.5" />
              Trading Goals
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Performance Targets</h2>
            <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
              Set and track your daily, weekly, and monthly trading goals.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-emerald-200/70 bg-emerald-50/50 p-8 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <Target className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">No goals configured yet</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Start by setting a daily PnL target or win rate goal.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            <Target className="h-3.5 w-3.5" />
            Create First Goal
          </button>
        </div>
      </section>
    );
  }

  const dailyGoals = goals.filter((g) => g.goal_type === "daily_pnl");
  const weeklyGoals = goals.filter((g) => g.goal_type === "weekly_pnl");
  const monthlyGoals = goals.filter((g) => g.goal_type === "monthly_pnl");
  const performanceGoals = goals.filter((g) => ["win_rate", "profit_factor", "max_drawdown"].includes(g.goal_type));

  return (
    <section className="glass-panel rounded-2xl p-6 lg:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Target className="h-3.5 w-3.5" />
            Performance Tracking
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Goals &amp; Progress</h2>
          <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
            Track your trading targets and measure progress against your goals.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:bg-slate-900 dark:text-gray-300"
          >
            <Target className="h-3.5 w-3.5" />
            New Goal
          </button>
        </div>
      </div>

      {/* Time-bound PnL Goals */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dailyGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            title="Daily PnL"
            icon={<Calendar className="h-4 w-4" />}
            target={goal.target_value}
            current={goal.current_value}
            progress={goal.progress_pct}
            currency="USD"
            periodLabel={`Due ${formatDaysRemaining(goal.days_remaining)}`}
            onTrack={goal.on_track}
            onClick={() => onEditGoal?.(goal)}
          />
        ))}

        {weeklyGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            title="Weekly PnL"
            icon={<Calendar className="h-4 w-4" />}
            target={goal.target_value}
            current={goal.current_value}
            progress={goal.progress_pct}
            currency="USD"
            periodLabel={`${goal.days_remaining}d left`}
            onTrack={goal.on_track}
            onClick={() => onEditGoal?.(goal)}
          />
        ))}

        {monthlyGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            title="Monthly PnL"
            icon={<Calendar className="h-4 w-4" />}
            target={goal.target_value}
            current={goal.current_value}
            progress={goal.progress_pct}
            currency="USD"
            periodLabel={`${goal.days_remaining}d left`}
            onTrack={goal.on_track}
            onClick={() => onEditGoal?.(goal)}
          />
        ))}
      </div>

      {/* Performance Metrics */}
      {performanceGoals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Performance Metrics
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {performanceGoals.map((goal) => (
              <MetricGoalCard key={goal.id} goal={goal} onClick={() => onEditGoal?.(goal)} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {goals.some((g) => !g.on_track && g.days_remaining > 0) && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                Goals at Risk
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                {goals.filter((g) => !g.on_track && g.days_remaining > 0).length} goal(s) are behind target with time remaining.
                Consider reducing position size or waiting for higher-conviction setups.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function GoalCard({
  title,
  icon,
  target,
  current,
  progress,
  currency,
  periodLabel,
  onTrack,
  onClick,
}: {
  title: string;
  icon: React.ReactNode;
  target: number;
  current: number;
  progress: number;
  currency?: string;
  periodLabel: string;
  onTrack: boolean;
  onClick?: () => void;
}) {
  const isPositive = current >= 0;
  const progressClamped = Math.min(100, Math.max(0, progress));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left shadow-sm transition-all hover:shadow-md ${
        onTrack
          ? "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-amber-200 bg-amber-50/50 hover:border-amber-300 dark:border-amber-900/40 dark:bg-amber-950/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            onTrack ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          } dark:bg-slate-800`}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          onTrack
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        }`}>
          {onTrack ? "On Track" : "Behind"}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-gray-900 dark:text-white">
            {currency === "USD" ? formatCurrency(current, 2) : current.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            target: {currency === "USD" ? formatCurrency(target, 2) : target.toFixed(2)}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full rounded-full transition-all ${
              onTrack ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${progressClamped}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">{periodLabel}</span>
          <span className={`font-medium ${isPositive ? "text-emerald-600" : "text-gray-500"}`}>
            {progressClamped.toFixed(0)}%
          </span>
        </div>
      </div>
    </button>
  );
}

function MetricGoalCard({ goal, onClick }: { goal: TradingGoal; onClick?: () => void }) {
  const { goal_type, target_value, current_value, progress_pct, on_track } = goal;

  const labels = {
    win_rate: { title: "Win Rate", icon: <Award className="h-4 w-4" />, unit: "%" },
    profit_factor: { title: "Profit Factor", icon: <TrendingUp className="h-4 w-4" />, unit: "" },
    max_drawdown: { title: "Max Drawdown", icon: <AlertCircle className="h-4 w-4" />, unit: "%" },
  };

  const { title, icon, unit } = labels[goal_type as keyof typeof labels] || {
    title: goal_type,
    icon: <Target className="h-4 w-4" />,
    unit: "",
  };

  const isBetter = goal_type === "max_drawdown" ? current_value <= target_value : current_value >= target_value;
  const onTrack = isBetter ? on_track : false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left shadow-sm ${
        onTrack
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-border bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-slate-800">
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-semibold text-gray-900 dark:text-white">
            {unit === "%" ? formatPercent(current_value, 1) : current_value.toFixed(2)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            target: {unit === "%" ? formatPercent(target_value, 1) : target_value.toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {isBetter ? "✅ Meeting target" : "⚠️ Below target"}
          </span>
        </div>
      </div>
    </button>
  );
}

function GoalsPanelSkeleton() {
  return (
    <section className="glass-panel animate-pulse rounded-2xl p-6 lg:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="h-6 w-40 rounded-lg bg-slate-200/80 dark:bg-slate-700/70" />
          <div className="h-8 w-64 rounded-xl bg-slate-200/80 dark:bg-slate-700/70" />
          <div className="h-4 w-96 rounded-lg bg-slate-200/70 dark:bg-slate-700/60" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-slate-200/70 dark:bg-slate-700/60" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="mt-3 h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </section>
  );
}

function formatDaysRemaining(days: number): string {
  if (days <= 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days <= 7) return `in ${days}d`;
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (remainingDays === 0) return `in ${weeks}w`;
  return `in ${weeks}w ${remainingDays}d`;
}

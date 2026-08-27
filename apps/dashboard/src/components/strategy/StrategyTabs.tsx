"use client";

import { useState } from "react";
import { TrendingUp, Target, Activity, BookOpen, Zap, ClipboardList } from "lucide-react";

type StrategyTab = "market" | "builder" | "setups" | "activity" | "cadence" | "positions";

type StrategyTabsProps = {
    children: React.ReactNode;
    activeTab?: StrategyTab;
    onTabChange?: (tab: StrategyTab) => void;
    setupCount?: number;
    positionCount?: number;
};

const TABS: { id: StrategyTab; label: string; icon: React.ReactNode; badge?: number }[] = [];

export function StrategyTabs({
    children,
    activeTab = "market",
    onTabChange,
    setupCount = 0,
    positionCount = 0,
}: StrategyTabsProps) {
    const [internalTab, setInternalTab] = useState<StrategyTab>(activeTab);

    const tab = activeTab || internalTab;
    const setTab = onTabChange || setInternalTab;

    const tabs = [
        { id: "market" as StrategyTab, label: "Market", icon: <TrendingUp className="h-4 w-4" /> },
        { id: "builder" as StrategyTab, label: "Setup Builder", icon: <Target className="h-4 w-4" /> },
        { id: "setups" as StrategyTab, label: "Active Setups", icon: <BookOpen className="h-4 w-4" />, badge: setupCount },
        { id: "activity" as StrategyTab, label: "Agent Activity", icon: <Activity className="h-4 w-4" /> },
        { id: "cadence" as StrategyTab, label: "Trade Cadence", icon: <ClipboardList className="h-4 w-4" /> },
        { id: "positions" as StrategyTab, label: "Positions", icon: <Zap className="h-4 w-4" />, badge: positionCount },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-1 overflow-x-auto pb-px">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium
                                transition-colors border-b-2 whitespace-nowrap
                                ${
                                    tab === t.id
                                        ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                }
                            `}
                        >
                            {t.icon}
                            {t.label}
                            {t.badge !== undefined && t.badge > 0 && (
                                <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div>{children}</div>
        </div>
    );
}

export type { StrategyTab };

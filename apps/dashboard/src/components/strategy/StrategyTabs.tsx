"use client";

import { useState } from "react";
import { TrendingUp, BookOpen, Activity, Layers } from "lucide-react";

type StrategyTab = "market" | "setups" | "strategies" | "activity";

type StrategyTabsProps = {
    children: React.ReactNode;
    activeTab?: StrategyTab;
    onTabChange?: (tab: StrategyTab) => void;
};

export function StrategyTabs({
    children,
    activeTab = "market",
    onTabChange,
}: StrategyTabsProps) {
    const [internalTab, setInternalTab] = useState<StrategyTab>(activeTab);

    const tab = activeTab || internalTab;
    const setTab = onTabChange || setInternalTab;

    const tabs = [
        { id: "market" as StrategyTab, label: "Market", icon: <TrendingUp className="h-4 w-4" /> },
        { id: "setups" as StrategyTab, label: "Setups", icon: <BookOpen className="h-4 w-4" /> },
        { id: "strategies" as StrategyTab, label: "Strategies", icon: <Layers className="h-4 w-4" /> },
        { id: "activity" as StrategyTab, label: "Agent Activity", icon: <Activity className="h-4 w-4" /> },
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

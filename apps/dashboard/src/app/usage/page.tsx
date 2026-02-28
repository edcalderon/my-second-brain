import { BarChart3, TrendingUp, Activity, Clock } from "lucide-react";

const stats = [
    { label: "Queries Today", value: "0", icon: Activity, trend: "+0%", positive: true },
    { label: "Avg Response Time", value: "0ms", icon: Clock, trend: "-0%", positive: false },
    { label: "API Calls", value: "0", icon: TrendingUp, trend: "+0%", positive: true },
    { label: "Documents Indexed", value: "0", icon: BarChart3, trend: "-0%", positive: false },
];

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor your Second Brain usage and performance metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 backdrop-blur-sm hover:border-accent/40 dark:hover:border-accent/40 transition-colors shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                                </div>
                                <div className="p-3 bg-accent/10 dark:bg-accent/20 rounded-lg">
                                    <Icon className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                            <p className={`text-xs mt-2 ${stat.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                                {stat.trend} vs yesterday
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Coming Soon */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-8 backdrop-blur-sm text-center shadow-sm">
                <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Analytics Dashboard</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed analytics and usage metrics coming soon</p>
            </div>
        </div>
    );
}

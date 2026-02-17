import { BarChart3, TrendingUp, Activity, Clock } from "lucide-react";

const stats = [
    { label: "Queries Today", value: "0", icon: Activity, trend: "+0%" },
    { label: "Avg Response Time", value: "0ms", icon: Clock, trend: "-0%" },
    { label: "API Calls", value: "0", icon: TrendingUp, trend: "+0%" },
    { label: "Documents Indexed", value: "0", icon: BarChart3, trend: "-0%" },
];

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
                <p className="text-gray-600 mt-1">Monitor your Second Brain usage and performance metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="rounded-xl border border-border bg-white/50 p-6 backdrop-blur-sm hover:border-accent/40 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                </div>
                                <div className="p-3 bg-accent/10 rounded-lg">
                                    <Icon className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                            <p className="text-xs text-emerald-600 mt-2">{stat.trend} vs yesterday</p>
                        </div>
                    );
                })}
            </div>

            {/* Coming Soon */}
            <div className="rounded-xl border border-border bg-white/50 p-8 backdrop-blur-sm text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h2 className="text-lg font-semibold text-gray-700">Analytics Dashboard</h2>
                <p className="text-gray-600 mt-1">Detailed analytics and usage metrics coming soon</p>
            </div>
        </div>
    );
}

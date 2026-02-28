"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CandlestickChart, Gauge, ShieldCheck, Brain, Zap, TrendingUp, BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";

export default function OverviewPage() {
    const { user } = useAuth();
    const { portfolio, signals, trades, loading, error } = useSupabaseData();



    const pauseStatus = useMemo(() => {
        return "Running";
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-16">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 transition-colors">Knowledge + Trading Hub</p>
                <h1 className="text-4xl font-semibold text-gray-900 dark:text-white transition-colors">
                    Second Brain Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl transition-colors">
                    Your integrated knowledge management and live trading operations center. Explore your memory graph, manage learning, and monitor real-time trading execution.
                </p>
            </header>

            {error && (
                <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-6 py-4 text-sm text-red-600 dark:text-red-400 transition-colors">
                    {error}
                </div>
            )}

            {/* Quick Access Sections */}
            <section className="grid gap-4 lg:grid-cols-2">
                {/* Second Brain Quick Actions */}
                <div className="glass-panel rounded-3xl p-6 border border-emerald-200/40 dark:border-emerald-900/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
                            <Brain className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                            Knowledge Management
                        </h2>
                    </div>
                    <div className="grid gap-3">
                        <ActionLink
                            href="/knowledge"
                            icon={<BookOpen className="h-4 w-4" />}
                            title="Knowledge Base"
                            description="Browse and search your collected intelligence"
                        />
                        <ActionLink
                            href="/memory-graph"
                            icon={<Zap className="h-4 w-4" />}
                            title="Memory Graph"
                            description="Visualize connections in your knowledge network"
                        />
                        <ActionLink
                            href="/documentation"
                            icon={<TrendingUp className="h-4 w-4" />}
                            title="Documents"
                            description="Access your learning resources and analysis"
                        />
                    </div>
                    <div className="mt-4 pt-4 border-t border-border dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 transition-colors">
                        <p>Manage your personal knowledge base and track learning progress.</p>
                    </div>
                </div>

                {/* Trading Operations Quick Status */}
                <div className="glass-panel rounded-3xl p-6 border border-amber-200/40 dark:border-amber-900/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
                            <CandlestickChart className="h-5 w-5 text-amber-700 dark:text-amber-400 transition-colors" />
                            Trading Operations
                        </h2>
                        <div className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${loading
                            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                            }`}>
                            {pauseStatus}
                        </div>
                    </div>
                    <div className="space-y-3 text-sm">
                        <MetricRow label="Status" value={loading ? "Loading..." : "Live"} />
                        <MetricRow label="Filled Orders" value={`${trades?.length ?? 0}`} />
                        <MetricRow label="Latest Signal" value={`${signals?.[0]?.signal_type ?? "N/A"}`} />
                        <MetricRow label="Last Fill" value={trades?.[0]?.price ? `$${trades[0].price.toFixed(2)}` : "N/A"} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-border dark:border-gray-700 transition-colors">
                        <Link href="/market" className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 font-semibold text-xs uppercase tracking-wide transition-colors">
                            View Operations Dashboard →
                        </Link>
                    </div>
                </div>
            </section>

            {/* Detailed Trading Metrics */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Live Execution Feed</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                        title="Latest Trade Symbol"
                        value={trades?.[0]?.symbol || "No trade yet"}
                        icon={<CandlestickChart className="h-5 w-5" />}
                        detail={trades?.[0] ? `Size: ${trades[0].size}` : "Awaiting data"}
                    />
                    <MetricCard
                        title="Strategy Signal"
                        value={signals?.[0]?.signal_type || "No intent"}
                        icon={<Activity className="h-5 w-5" />}
                        detail={signals?.[0]?.confidence ? `${(signals[0].confidence * 100).toFixed(1)}% confidence` : "Awaiting signal"}
                    />
                    <MetricCard
                        title="Portfolio Total (ETH)"
                        value={portfolio?.total_value_eth ? portfolio.total_value_eth.toFixed(4) : "N/A"}
                        icon={<ShieldCheck className="h-5 w-5" />}
                        detail={portfolio?.total_value_usd ? `$${portfolio.total_value_usd.toFixed(2)}` : "Awaiting sync"}
                    />
                </div>
            </section>

            {/* Info Cards */}
            <section className="grid gap-4 lg:grid-cols-2">
                <Card
                    title="About This Dashboard"
                    icon={<Brain className="h-5 w-5" />}
                >
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <p>
                            <strong className="text-gray-900 dark:text-white transition-colors">Second Brain</strong> is your personal knowledge management system. Store insights, track learning, and visualize connections in your knowledge graph.
                        </p>
                        <p>
                            Use the sidebar to explore your memory network, manage documents, and review analytics.
                        </p>
                    </div>
                </Card>

                <Card
                    title="A-Quant Integration"
                    icon={<Zap className="h-5 w-5" />}
                >
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <p>
                            Real-time trading data is streamed from your private a-quant services. All endpoints are read-only and authenticated.
                        </p>
                        <p>
                            Navigate to the Trading Operations section to monitor live execution, risk decisions, and market data.
                        </p>
                    </div>
                </Card>
            </section>
        </div>
    );
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="glass-panel rounded-3xl p-6 transition-colors">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">{title}</h3>
                <div className="text-emerald-700 dark:text-emerald-400 transition-colors">{icon}</div>
            </div>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function MetricCard({
    title,
    value,
    detail,
    icon,
}: {
    title: string;
    value: string;
    detail: string;
    icon: ReactNode;
}) {
    return (
        <div className="rounded-3xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-4 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 transition-colors">
                <span>{title}</span>
                <div className="text-emerald-700 dark:text-emerald-400 transition-colors">{icon}</div>
            </div>
            <div className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white transition-colors">{value}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 transition-colors">{detail}</div>
        </div>
    );
}

function MetricRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm transition-colors">
            <span className="text-gray-600 dark:text-gray-400 transition-colors">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-white transition-colors">{value}</span>
        </div>
    );
}

interface ActionLinkProps {
    href: string;
    icon: ReactNode;
    title: string;
    description: string;
}

function ActionLink({ href, icon, title, description }: ActionLinkProps) {
    return (
        <Link href={href} className="block min-w-0 overflow-hidden">
            <div className="group w-full rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3 w-full border-box">
                    <div className="text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300 transition-colors flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white transition-colors truncate">{title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate transition-colors">{description}</p>
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex-shrink-0">
                        →
                    </div>
                </div>
            </div>
        </Link>
    );
}


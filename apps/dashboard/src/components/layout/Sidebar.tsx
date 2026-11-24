"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Settings,
    LayoutDashboard,
    Brain,
    Network,
    BookOpen,
    DollarSign,
    Layers,
    CandlestickChart,
    Wallet,
    Gauge,
    ShieldCheck,
    Sparkles,
    ChevronLeft,
    Crosshair,
    BookMarked,
    Bell,
    ExternalLink,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardHref, dashboardPath, publicSiteUrl, stripDashboardBasePath } from "@/lib/public-site";
import { formatCompactCurrency, formatCurrency } from "@/lib/hummingbot-format";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useTradingStatus } from "@/components/trading/TradingStatusProvider";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import BtcMiniChart from "@/components/layout/BtcMiniChart";
import LiveTradeMonitor from "@/components/shared/LiveTradeMonitor";
import LiveStrategiesMonitor from "@/components/shared/LiveStrategiesMonitor";
import SidebarQuickActions from "@/components/shared/SidebarQuickActions";
import FloatingSidebarActions from "@/components/shared/FloatingSidebarActions";
import FloatingSidebarActionsCollapsed from "@/components/shared/FloatingSidebarActionsCollapsed";

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const menuSections = [
    {
        title: "Second Brain",
        items: [
            { name: "Knowledge Base", href: "/knowledge", icon: BookOpen },
            { name: "Memory Graph", href: "/memory-graph", icon: Network },
            { name: "Documents", href: "/documentation", icon: Layers },
            { name: "Agents", href: "/agents", icon: Brain },
            { name: "Analytics", href: "/usage", icon: DollarSign },
        ]
    },
    {
        title: "Trading Desk",
        items: [
            { name: "Command Center", href: "/command-center", icon: Crosshair },
            { name: "Trade Journal", href: "/journal", icon: BookMarked },
            { name: "Portfolio Tracker", href: "/portfolio", icon: Wallet },
            { name: "Market Feed", href: "/market", icon: CandlestickChart },
            { name: "Strategy Desk", href: "/strategy", icon: Sparkles },
            { name: "Risk View", href: "/risk", icon: ShieldCheck },
            { name: "Execution", href: "/execution", icon: Gauge },
        ]
    },
    {
        title: "Projects",
        items: [
            { name: "Project Directory", href: publicSiteUrl("/"), icon: LayoutDashboard },
            { name: "A-Quant", href: dashboardHref("/a-quant"), icon: CandlestickChart },
        ]
    },
    {
        title: "Account",
        items: [
            { name: "Notifications", href: "/notifications", icon: Bell },
            { name: "Settings", href: "/settings", icon: Settings },
        ]
    }
];

const notificationSeverityDot: Record<string, string> = {
    info: "bg-sky-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
};

/** Small notification link shown below the BTC chart in the sidebar footer. */
function NotificationLink({ collapsed }: { collapsed?: boolean }) {
    const { notifications } = useSupabaseData();
    const latestNotification = notifications[0] ?? null;
    const notificationHref = latestNotification?.metadata?.journal_id
        ? `/journal?id=${encodeURIComponent(latestNotification.metadata.journal_id)}`
        : "/notifications";

    if (collapsed) {
        const hasUnread = latestNotification !== null;
        const severity = latestNotification?.severity ?? "info";
        return (
            <div className="mx-2 mb-2">
                <Link
                    href={notificationHref}
                    prefetch={false}
                    className="w-full flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg text-[10px] text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group relative"
                    title={latestNotification?.title ?? "No notifications"}
                >
                    <span className="relative">
                        <Bell className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                        {hasUnread && (
                            <span className={cn(
                                "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                                notificationSeverityDot[severity] ?? "bg-gray-400",
                            )} />
                        )}
                    </span>
                    {/* Tooltip for collapsed state */}
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                        {latestNotification?.title ?? "No notifications"}
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-4">
            <Link
                href={notificationHref}
                prefetch={false}
                className="flex items-start gap-2 rounded-lg px-2 py-2 group hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
            >
                {latestNotification ? (
                    <>
                        <span
                            className={cn(
                                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                notificationSeverityDot[latestNotification.severity] ?? "bg-gray-400",
                            )}
                        />
                        <span className="flex-1 min-w-0 text-xs text-gray-700 dark:text-gray-300 truncate">
                            {latestNotification.title}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-gray-300" />
                    </>
                ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">No notifications yet</span>
                )}
            </Link>
        </div>
    );
}

/**
 * Pinned portfolio value readout — this is the primary metric the whole
 * dashboard exists to track, so it lives in the sticky header (not the
 * scrollable nav or the footer) and stays on screen at all times, in both
 * the expanded and collapsed sidebar states.
 */
function PortfolioValueIndicator({ collapsed }: { collapsed?: boolean }) {
    const { status } = useTradingStatus();
    const bybitValue = status?.bybit_portfolio_value;

    if (!bybitValue) return null;

    const totalUsd = bybitValue.total_usd ?? 0;
    const pnlUsd = bybitValue.unified.unrealized_pnl_usd;
    const hasPnl = bybitValue.unified.available && typeof pnlUsd === "number";
    const isPositive = (pnlUsd ?? 0) >= 0;
    const PnlIcon = isPositive ? TrendingUp : TrendingDown;

    if (collapsed) {
        return (
            <div className="mx-2 mb-1">
                <Link
                    href="/portfolio"
                    prefetch={false}
                    className="w-full flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors group relative"
                    title="Portfolio value"
                >
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-semibold text-gray-900 dark:text-white truncate max-w-full">
                        {formatCompactCurrency(totalUsd, 1)}
                    </span>
                    <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                        Portfolio: {formatCurrency(totalUsd, 2)}
                    </div>
                </Link>
            </div>
        );
    }

    return (
        <Link
            href="/portfolio"
            prefetch={false}
            className="mx-3 mb-1 flex items-center justify-between gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 px-3 py-2.5 transition-colors group"
        >
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                    Portfolio Value
                </p>
                <p className="text-lg font-bold leading-tight text-gray-900 dark:text-white truncate">
                    {formatCurrency(totalUsd, 2)}
                </p>
            </div>
            {hasPnl && (
                <span
                    className={cn(
                        "flex items-center gap-0.5 shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",
                        isPositive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    )}
                >
                    <PnlIcon className="h-3 w-3" />
                    {formatCurrency(Math.abs(pnlUsd ?? 0), 0)}
                </span>
            )}
        </Link>
    );
}

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const { user } = useAuth();
    const { status } = useTradingStatus();
    const ticker = status?.btc_ticker;

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const normalizedPath = stripDashboardBasePath(pathname || "/");

    // Mobile: hidden by default unless expanded; Desktop: always visible
    if (isMobile && isCollapsed) {
        return null;
    }

    return (
        <>
            {/* Mobile overlay when sidebar is open */}
            {isMobile && !isCollapsed && (
                <button
                    type="button"
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onToggle}
                    aria-label="Close sidebar"
                />
            )}

            <aside
                className={cn(
                    "flex flex-col h-screen overflow-y-auto bg-sidebar border-r border-border transition-all duration-300 ease-in-out",
                    // Mobile styles
                    isMobile
                        ? "fixed left-0 top-0 z-40 w-64 max-w-xs"
                        : isCollapsed
                            ? "w-20"
                            : "w-64"
                )}
            >
                {/* Header with Logo & Toggle */}
                <div className={cn("flex items-center justify-between sticky top-0 bg-sidebar border-b border-border min-h-16 transition-all duration-300", isCollapsed ? "px-2" : "px-4")}>
                    {!isCollapsed && (
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center accent-glow flex-shrink-0">
                                <Brain className="text-white w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tight truncate text-gray-900 dark:text-white">Second Brain</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Knowledge first</p>
                            </div>
                        </div>
                    )}

                    {isCollapsed && !isMobile && (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center accent-glow flex-shrink-0 mx-auto">
                            <Brain className="text-white w-5 h-5" />
                        </div>
                    )}

                    {/* Toggle button - only show on desktop when sidebar exists */}
                    {!isMobile && onToggle && (
                        <button
                            onClick={onToggle}
                            className={cn("p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors group relative", !isCollapsed && "ml-auto")}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <ChevronLeft
                                className={cn(
                                    "w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-300",
                                    isCollapsed ? "rotate-180" : ""
                                )}
                            />
                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                                    {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                </div>
                            )}
                        </button>
                    )}
                </div>

                {/* Portfolio value — pinned, always visible, independent of nav scroll */}
                {user && (
                    <div className={cn("sticky top-16 z-20 bg-sidebar pt-3", isCollapsed ? "px-0" : "")}>
                        <PortfolioValueIndicator collapsed={isCollapsed && !isMobile} />
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto">
                    {menuSections.map((section) => {
                        if (section.title === "Trading Operations" && !user) return null;

                        return (
                            <div key={section.title}>
                                {!isCollapsed && (
                                    <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                        {section.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = normalizedPath === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                prefetch={false}
                                                onClick={() => isMobile && onToggle?.()}
                                                className={cn(
                                                    "flex items-center justify-start px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group relative",
                                                    isCollapsed && "justify-center md:justify-start md:px-2",
                                                    isActive
                                                        ? "bg-accent text-accent-foreground shadow-md"
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                                                )}
                                                title={isCollapsed ? item.name : undefined}
                                                target={item.href.startsWith("http") ? "_blank" : undefined}
                                                rel={item.href.startsWith("http") ? "noreferrer noopener" : undefined}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        "h-5 w-5 flex-shrink-0",
                                                        isActive ? "text-white" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300",
                                                        !isCollapsed && "mr-3"
                                                    )}
                                                />
                                                {!isCollapsed && <span className="truncate">{item.name}</span>}

                                                {/* Tooltip for collapsed state */}
                                                {isCollapsed && !isMobile && (
                                                    <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-md py-1.5 px-2.5 whitespace-nowrap opacity-0 shadow-lg group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                                                        {item.name}
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Footer — BTC price chart + latest notification.
                    Only rendered once signed in: TradingStatusProvider and
                    SupabaseProvider both hold this data back until then. */}
                {user && (
                    <div className={cn("relative border-t border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-[#080b10]/80", isCollapsed ? "py-4" : "pt-2 pb-6")}>
                        {/* Floating "+" button centered over the top border */}
                        {!isCollapsed && (
                            <div className="relative -top-4 z-10">
                                <FloatingSidebarActions />
                            </div>
                        )}

                        {isCollapsed && !isMobile ? (
                            <div className="mx-2">
                                <BtcMiniChart collapsed onExpandSidebar={onToggle} />
                                <LiveTradeMonitor collapsed />
                                <LiveStrategiesMonitor collapsed />
                                <NotificationLink collapsed />
                            </div>
                        ) : (
                            <div>
                                <BtcMiniChart />
                                <LiveTradeMonitor collapsed={false} />
                                <LiveStrategiesMonitor collapsed={false} />
                                <SidebarQuickActions />
                                <NotificationLink />
                            </div>
                        )}
                    </div>
                )}
            </aside>

            {/* Floating "+" button for collapsed sidebar — positioned outside
                the scrollable <aside> so the menu isn't clipped by overflow-y.
                The collapsed sidebar is 80px (w-20) wide; the footer sits at
                the bottom, so we place the button at the bottom of the sidebar
                minus a small offset. */}
            {user && isCollapsed && !isMobile && (
                <FloatingSidebarActionsCollapsed />
            )}
        </>
    );
}

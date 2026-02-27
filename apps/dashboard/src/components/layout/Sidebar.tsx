"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Activity,
    CandlestickChart,
    Gauge,
    Settings,
    ShieldAlert,
    LayoutDashboard,
    Brain,
    Network,
    BookOpen,
    Zap,
    BarChart3,
    Layers,
    ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";

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
            { name: "Documents", href: "/documents", icon: Layers },
            { name: "Agents", href: "/agents", icon: Brain },
            { name: "Analytics", href: "/usage", icon: BarChart3 },
        ]
    },
    {
        title: "Trading Operations",
        items: [
            { name: "Overview", href: "/", icon: LayoutDashboard },
            { name: "Market Data", href: "/market", icon: CandlestickChart },
            { name: "Strategy", href: "/strategy", icon: Activity },
            { name: "Risk", href: "/risk", icon: ShieldAlert },
            { name: "Execution", href: "/execution", icon: Gauge },
        ]
    },
    {
        title: "Account",
        items: [
            { name: "Settings", href: "/settings", icon: Settings },
        ]
    }
];

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const [isMobile, setIsMobile] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const normalizedPath = pathname
        ? (pathname.startsWith("/my-second-brain")
            ? pathname.replace("/my-second-brain", "") || "/"
            : pathname)
        : "/";

    // Mobile: hidden by default unless expanded; Desktop: always visible
    if (isMobile && isCollapsed) {
        return null;
    }

    return (
        <>
            {/* Mobile overlay when sidebar is open */}
            {isMobile && !isCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onToggle}
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
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">+ A-Quant Ops</p>
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
                            className={cn("p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors", !isCollapsed && "ml-auto")}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <ChevronLeft
                                className={cn(
                                    "w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-300",
                                    isCollapsed ? "rotate-180" : ""
                                )}
                            />
                        </button>
                    )}
                </div>

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
                                                onClick={() => isMobile && onToggle?.()}
                                                className={cn(
                                                    "flex items-center justify-start px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group relative",
                                                    isCollapsed && "justify-center md:justify-start md:px-2",
                                                    isActive
                                                        ? "bg-accent text-accent-foreground shadow-md"
                                                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                                                )}
                                                title={isCollapsed ? item.name : undefined}
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
                                                    <div className="absolute left-16 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
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

                {/* Footer */}
                {!isCollapsed && (
                    <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-xs text-gray-600 dark:text-gray-400 space-y-2">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">🧠 Knowledge Hub</p>
                            <p className="text-gray-600 dark:text-gray-400">Your AI-powered knowledge engine</p>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}

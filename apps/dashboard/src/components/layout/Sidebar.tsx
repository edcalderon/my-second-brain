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
    Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Sidebar() {
    const pathname = usePathname();
    const normalizedPath = pathname?.startsWith("/my-second-brain")
        ? pathname.replace("/my-second-brain", "") || "/"
        : pathname || "/";

    return (
        <aside className="w-64 bg-sidebar border-r border-border flex flex-col h-full overflow-y-auto">
            <div className="p-6 flex items-center space-x-3 sticky top-0 bg-sidebar border-b border-border">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-amber-500 flex items-center justify-center accent-glow">
                    <Brain className="text-white w-5 h-5" />
                </div>
                <div>
                    <span className="text-lg font-semibold tracking-tight">Second Brain</span>
                    <p className="text-xs text-gray-500">+ A-Quant Ops</p>
                </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-6">
                {menuSections.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {section.title}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = normalizedPath === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                            isActive
                                                ? "bg-accent text-accent-foreground shadow-md"
                                                : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
                                        )}
                                    >
                                        <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-gray-500")} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-4 py-6 border-t border-border">
                <div className="rounded-xl border border-border bg-white/70 p-4 text-xs text-gray-600 space-y-2">
                    <p className="font-semibold text-gray-800">🧠 Knowledge Hub</p>
                    <p>Manage your learning, track trading operations, and explore market insights in one place.</p>
                </div>
            </div>
        </aside>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart2,
    BrainCircuit,
    Database,
    Settings,
    HelpCircle,
    LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Knowledge Base", href: "/knowledge", icon: Database },
    { name: "Memory Graph", href: "/memory-graph", icon: BrainCircuit },
    { name: "Agents", href: "/agents", icon: Settings },
    { name: "Usage", href: "/usage", icon: BarChart2 },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-sidebar border-r border-border flex flex-col h-full">
            <div className="p-6 flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center accent-glow">
                    <BrainCircuit className="text-accent-foreground w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight">Supermemory</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                                isActive
                                    ? "bg-accent text-accent-foreground shadow-md"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-white" : "text-gray-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-4 py-6 border-t border-border">
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors w-full">
                    <HelpCircle className="mr-3 h-5 w-5" />
                    Support
                </button>
            </div>
        </aside>
    );
}

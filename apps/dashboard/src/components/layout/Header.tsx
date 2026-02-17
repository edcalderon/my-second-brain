"use client";

import { Bell, LogOut, Menu, Search, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";

interface HeaderProps {
    onSidebarToggle?: () => void;
    isSidebarCollapsed?: boolean;
}

export default function Header({ onSidebarToggle, isSidebarCollapsed }: HeaderProps) {
    const { user, signOutUser } = useAuth();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return (
        <header className="h-16 border-b border-border bg-white/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
            {/* Mobile Menu Button */}
            {isMobile && (
                <button
                    onClick={onSidebarToggle}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-black/5 rounded-lg transition-colors mr-2"
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>
            )}

            {/* Search Bar - responsive width */}
            <div className="flex-1 flex items-center max-w-2xl min-w-0">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-accent transition-colors flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Search symbols, orders..."
                        className="w-full bg-white border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all hover:border-accent/40 truncate"
                    />
                </div>
            </div>

            {/* Right Section - Responsive spacing */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
                <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-black/5 relative flex-shrink-0">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
                </button>

                {/* User Info - Hidden on mobile */}
                <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-600 px-2 py-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium truncate max-w-[150px] md:max-w-none">
                        {user?.email || "Authenticated"}
                    </span>
                </div>

                {/* Sign Out Button - Mobile responsive */}
                <button
                    onClick={() => signOutUser()}
                    className="inline-flex items-center space-x-1 sm:space-x-2 rounded-full border border-border bg-white px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-accent/40 hover:text-gray-900 flex-shrink-0"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign out</span>
                </button>

                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-600 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                </div>
            </div>
        </header>
    );
}

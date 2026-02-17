"use client";

import { Bell, Menu, Search, LogOut, Settings, Moon, Sun, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";

interface HeaderProps {
    onSidebarToggle?: () => void;
    isSidebarCollapsed?: boolean;
}

export default function Header({ onSidebarToggle, isSidebarCollapsed }: HeaderProps) {
    const { user, signOutUser } = useAuth();
    const [isMobile, setIsMobile] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        // Check system preference and localStorage
        const isDarkMode = 
            localStorage.getItem("theme") === "dark" ||
            (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
        setIsDark(isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        if (newDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    return (
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
            {/* Mobile Menu Button */}
            {isMobile && (
                <button
                    onClick={onSidebarToggle}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors mr-2"
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-5 w-5" />
                </button>
            )}

            {/* Search Bar - responsive width */}
            <div className="flex-1 flex items-center max-w-2xl min-w-0">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 group-focus-within:text-accent transition-colors flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Search symbols, orders..."
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent transition-all hover:border-accent/40 dark:hover:border-accent/40 truncate"
                    />
                </div>
            </div>

            {/* Right Section - Responsive spacing */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
                {/* Notifications */}
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5 relative flex-shrink-0">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>

                {/* Avatar Dropdown */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 hover:border-accent/40 dark:hover:border-accent/40 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                                {user?.email?.[0].toUpperCase() || "U"}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform" style={{
                            transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)"
                        }} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-50">
                            {/* User Info */}
                            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {user?.email || "User"}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Authenticated
                                </p>
                            </div>

                            {/* Menu Items */}
                            <button className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <Settings className="h-4 w-4" />
                                <span>Settings</span>
                            </button>

                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                            {/* Sign Out */}
                            <button
                                onClick={() => {
                                    signOutUser();
                                    setIsDropdownOpen(false);
                                }}
                                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

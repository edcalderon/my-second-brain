"use client";

import { Bell, LogOut, Search, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Header() {
    const { user, signOutUser } = useAuth();

    return (
        <header className="h-16 border-b border-border bg-white/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex-1 flex items-center max-w-xl">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-accent transition-colors" />
                    <input
                        type="text"
                        placeholder="Search symbols, orders, events..."
                        className="w-full bg-white border border-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all hover:border-accent/40"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-full hover:bg-black/5 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full"></span>
                </button>
                <div className="hidden items-center space-x-2 text-xs text-gray-600 md:flex">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{user?.email || "Authenticated"}</span>
                </div>
                <button
                    onClick={() => signOutUser()}
                    className="inline-flex items-center space-x-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-accent/40 hover:text-gray-900"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                </button>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 via-emerald-500 to-teal-600 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                    <User className="h-4 w-4 text-white" />
                </div>
            </div>
        </header>
    );
}

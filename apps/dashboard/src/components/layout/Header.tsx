"use client";

import { Bell, Search, User } from "lucide-react";

export default function Header() {
    return (
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
            <div className="flex-1 flex items-center max-w-xl">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-accent transition-colors" />
                    <input
                        type="text"
                        placeholder="Search memories, agents, documents..."
                        className="w-full bg-white/5 border border-border rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all hover:bg-white/10"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                    <User className="h-4 w-4 text-white" />
                </div>
            </div>
        </header>
    );
}

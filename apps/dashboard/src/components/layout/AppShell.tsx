"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TradingAuthGate from "@/components/auth/TradingAuthGate";

export default function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const isAuthPage = pathname === "/login" || pathname === "/my-second-brain/login";

    // Detect screen size and set initial collapsed state
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsCollapsed(true); // Start collapsed on mobile
            }
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    if (isAuthPage) {
        return <div className="min-h-screen">{children}</div>;
    }

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <TradingAuthGate>
            <div className="flex h-screen overflow-hidden bg-background transition-colors duration-300">
                {/* Sidebar */}
                <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

                {/* Main Content Area */}
                <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                    <Header onSidebarToggle={toggleSidebar} isSidebarCollapsed={isCollapsed} />
                    
                    {/* Main Content - Responsive padding */}
                    <main className="flex-1 overflow-y-auto bg-background transition-colors duration-300">
                        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </main>

                    <Footer />
                </div>
            </div>
        </TradingAuthGate>
    );
}

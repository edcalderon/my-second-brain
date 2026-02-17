"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TradingAuthGate from "@/components/auth/TradingAuthGate";

export default function AppShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === "/login" || pathname === "/my-second-brain/login";

    if (isAuthPage) {
        return <div className="min-h-screen">{children}</div>;
    }

    return (
        <TradingAuthGate>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
                        {children}
                    </main>
                    <Footer />
                </div>
            </div>
        </TradingAuthGate>
    );
}

"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

// Trading operations pages that require authentication
const TRADING_ROUTES = ["/", "/market", "/strategy", "/risk", "/execution"];

export default function TradingAuthGate({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const normalizedPath = pathname?.startsWith("/my-second-brain")
        ? pathname.replace("/my-second-brain", "") || "/"
        : pathname || "/";

    const isTraditingRoute = TRADING_ROUTES.includes(normalizedPath);

    useEffect(() => {
        if (!loading && !user && isTraditingRoute) {
            router.replace("/login");
        }
    }, [loading, user, isTraditingRoute, router]);

    if (loading && isTraditingRoute) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span>Checking authentication...</span>
                </div>
            </div>
        );
    }

    if (!user && isTraditingRoute) {
        return null;
    }

    return <>{children}</>;
}

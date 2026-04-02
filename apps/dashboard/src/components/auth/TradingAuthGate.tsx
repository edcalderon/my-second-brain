"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { stripDashboardBasePath } from "@/lib/public-site";

// Trading operations pages that require authentication.
// The `/a-quant` workspace is also private because it exposes the trading portal inside the dashboard shell.
const PRIVATE_ROUTES = ["/", "/portfolio", "/market", "/strategy", "/risk", "/execution", "/a-quant"];

function normalizeRoute(pathname: string) {
    const stripped = stripDashboardBasePath(pathname || "/").replace(/\/+$/, "");
    return stripped || "/";
}

function isPrivateRoute(pathname: string) {
    const normalizedPath = normalizeRoute(pathname);

    return PRIVATE_ROUTES.some((route) => {
        if (route === "/") {
            return normalizedPath === "/";
        }

        return normalizedPath === route || normalizedPath.startsWith(`${route}/`);
    });
}

export default function TradingAuthGate({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isTradingRoute = isPrivateRoute(pathname || "/");

    useEffect(() => {
        if (!loading && !user && isTradingRoute) {
            router.replace("/login");
        }
    }, [loading, user, isTradingRoute, router]);

    if (loading && isTradingRoute) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span>Checking authentication...</span>
                </div>
            </div>
        );
    }

    if (!user && isTradingRoute) {
        return null;
    }

    return <>{children}</>;
}

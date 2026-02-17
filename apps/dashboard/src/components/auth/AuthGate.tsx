"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/my-second-brain/login", "/knowledge", "/memory-graph", "/documents", "/agents", "/usage"];

export default function AuthGate({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const normalizedPath = pathname?.startsWith("/my-second-brain")
        ? pathname.replace("/my-second-brain", "") || "/"
        : pathname || "/";

    const isPublic = PUBLIC_ROUTES.includes(normalizedPath);

    useEffect(() => {
        // Second Brain pages are public, trading pages require auth
        if (!loading && !user && !isPublic) {
            router.replace("/login");
        }
    }, [loading, user, isPublic, router]);

    if (loading && !isPublic) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span>Checking authentication...</span>
                </div>
            </div>
        );
    }

    if (!user && !isPublic) {
        return null;
    }

    return <>{children}</>;
}

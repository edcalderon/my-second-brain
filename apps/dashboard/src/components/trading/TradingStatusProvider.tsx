"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchTradingStatus, HummingbotStatus } from "@/lib/hummingbot-api";

const POLL_INTERVAL_MS = 15000;

type TradingStatusContextType = {
    status: HummingbotStatus | null;
    loading: boolean;
    error: string | null;
};

const TradingStatusContext = createContext<TradingStatusContextType>({
    status: null,
    loading: true,
    error: null,
});

// Single shared /trading/status poller, mounted once above AppShell (see
// app/layout.tsx) so the Sidebar's live-info widget, and anything else that
// wants the same data, don't each open their own interval on top of
// Command Center's existing 5s poll of the same endpoint. 15s is plenty for
// a sidebar glance -- Command Center's own poller stays authoritative for
// anything that needs tighter freshness.
export function TradingStatusProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Same auth-gating rationale as SupabaseProvider: this provider sits
        // above TradingAuthGate in the layout tree, so it must not fetch
        // trade-sensitive status (positions, PnL) before a user is confirmed
        // signed in -- including on /login.
        if (!user) {
            setStatus(null);
            setLoading(true);
            setError(null);
            return;
        }

        isMountedRef.current = true;

        async function poll() {
            try {
                const result = await fetchTradingStatus();
                if (!isMountedRef.current) return;
                setStatus(result);
                setError(null);
            } catch (err) {
                if (!isMountedRef.current) return;
                setError(err instanceof Error ? err.message : "Failed to fetch trading status");
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        }

        poll();
        const intervalId = setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            isMountedRef.current = false;
            clearInterval(intervalId);
        };
    }, [user]);

    return (
        <TradingStatusContext.Provider value={{ status, loading, error }}>
            {children}
        </TradingStatusContext.Provider>
    );
}

export function useTradingStatus() {
    return useContext(TradingStatusContext);
}

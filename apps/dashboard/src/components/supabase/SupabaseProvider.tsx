"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type PortfolioSnapshot = {
    time: string;
    total_value_eth: number | null;
    total_value_usd: number | null;
    s1_value_eth: number | null;
    s2_value_eth: number | null;
    s3_value_eth: number | null;
    reserve_eth: number | null;
    unrealized_pnl: number | null;
    realized_pnl: number | null;
    aave_health_factor: number | null;
};

export type Signal = {
    id: string;
    time: string;
    strategy_id: string;
    symbol: string;
    signal_type: string;
    confidence: number | null;
    indicators: Record<string, any> | null;
    executed: boolean;
    executor_id: string | null;
};

export type Trade = {
    id: string;
    time: string;
    strategy_id: string;
    symbol: string;
    side: string;
    size: number | null;
    price: number | null;
    fee: number;
    tx_hash: string | null;
    executor_id: string | null;
    protocol: string | null;
    pnl: number | null;
    status: string;
};

type SupabaseContextType = {
    portfolio: PortfolioSnapshot | null;
    signals: Signal[];
    trades: Trade[];
    loading: boolean;
    error: string | null;
};

const SupabaseContext = createContext<SupabaseContextType>({
    portfolio: null,
    signals: [],
    trades: [],
    loading: true,
    error: null,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchInitialData() {
            try {
                // Fetch the latest portfolio snapshot
                const { data: portData, error: portError } = await supabase
                    .from("portfolio_snapshots")
                    .select("*")
                    .order("time", { ascending: false })
                    .limit(1)
                    .single();

                if (portError && portError.code !== "PGRST116") throw portError; // Ignore 0 rows error

                // Fetch recent signals (last 50)
                const { data: sigData, error: sigError } = await supabase
                    .from("signals")
                    .select("*")
                    .order("time", { ascending: false })
                    .limit(50);

                if (sigError) throw sigError;

                // Fetch recent trades (last 50)
                const { data: tradeData, error: tradeError } = await supabase
                    .from("trades")
                    .select("*")
                    .order("time", { ascending: false })
                    .limit(50);

                if (tradeError) throw tradeError;

                if (isMounted) {
                    setPortfolio(portData);
                    setSignals(sigData || []);
                    setTrades(tradeData || []);
                    setLoading(false);
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Failed to load initial Supabase data");
                    setLoading(false);
                }
            }
        }

        fetchInitialData();

        // Subscribe to real-time events
        const channels = supabase
            .channel("dashboard-realtime")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "portfolio_snapshots" },
                (payload) => {
                    setPortfolio(payload.new as PortfolioSnapshot);
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "signals" },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setSignals((prev) => [payload.new as Signal, ...prev].slice(0, 50));
                    } else if (payload.eventType === "UPDATE") {
                        setSignals((prev) =>
                            prev.map((s) => ((s.id as any) === (payload.new as any).id ? (payload.new as Signal) : s))
                        );
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "trades" },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setTrades((prev) => [payload.new as Trade, ...prev].slice(0, 50));
                    } else if (payload.eventType === "UPDATE") {
                        setTrades((prev) =>
                            prev.map((t) => ((t.id as any) === (payload.new as any).id ? (payload.new as Trade) : t))
                        );
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("Supabase Realtime Subscribed");
                }
            });

        return () => {
            isMounted = false;
            supabase.removeChannel(channels);
        };
    }, []);

    return (
        <SupabaseContext.Provider value={{ portfolio, signals, trades, loading, error }}>
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabaseData() {
    return useContext(SupabaseContext);
}

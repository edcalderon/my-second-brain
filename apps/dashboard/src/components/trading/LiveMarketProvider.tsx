"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getHummingbotWsBase } from "@/lib/hummingbot-config";
import { LiveClient, LiveMessage } from "@/lib/live-client";

// How many strategy_event messages to keep around for a log/feed view --
// unbounded would leak memory across a long-running tab.
const MAX_STRATEGY_EVENTS = 50;

type LivePrice = { symbol: string; price: number; ts: number };
type LivePositionSnapshot = { positions: unknown[]; ts: number };
type LiveBacktestStatus = { run_id: string; status: string; [key: string]: unknown };

type LiveMarketContextType = {
    connected: boolean;
    price: LivePrice | null;
    positions: LivePositionSnapshot | null;
    strategyEvents: LiveMessage[];
    backtestStatus: Record<string, LiveBacktestStatus>;
};

const LiveMarketContext = createContext<LiveMarketContextType>({
    connected: false,
    price: null,
    positions: null,
    strategyEvents: [],
    backtestStatus: {},
});

// Single shared connection to the trading API's /ws/live route,
// mounted once above AppShell (see app/layout.tsx) alongside
// TradingStatusProvider, whose auth-gating rationale this mirrors exactly:
// this provider sits above TradingAuthGate in the layout tree, so it must
// not open an authenticated live-data socket before a user is confirmed
// signed in -- including on /login.
export function LiveMarketProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [connected, setConnected] = useState(false);
    const [price, setPrice] = useState<LivePrice | null>(null);
    const [positions, setPositions] = useState<LivePositionSnapshot | null>(null);
    const [strategyEvents, setStrategyEvents] = useState<LiveMessage[]>([]);
    const [backtestStatus, setBacktestStatus] = useState<Record<string, LiveBacktestStatus>>({});
    const clientRef = useRef<LiveClient | null>(null);

    useEffect(() => {
        if (!user) {
            clientRef.current?.disconnect();
            clientRef.current = null;
            setConnected(false);
            setPrice(null);
            setPositions(null);
            setStrategyEvents([]);
            setBacktestStatus({});
            return;
        }

        const client = new LiveClient(`${getHummingbotWsBase()}/ws/live`);
        clientRef.current = client;

        const unsubscribers = [
            client.on("connected", () => setConnected(true)),
            client.on("price", (msg) => setPrice(msg as unknown as LivePrice)),
            client.on("position_snapshot", (msg) =>
                setPositions({ positions: (msg.positions as unknown[]) ?? [], ts: msg.ts as number })
            ),
            client.on("strategy_event", (msg) =>
                setStrategyEvents((prev) => [msg, ...prev].slice(0, MAX_STRATEGY_EVENTS))
            ),
            client.on("backtest_status", (msg) => {
                const status = msg as unknown as LiveBacktestStatus;
                setBacktestStatus((prev) => ({ ...prev, [status.run_id]: status }));
            }),
        ];

        client.connect();

        return () => {
            setConnected(false);
            unsubscribers.forEach((unsubscribe) => unsubscribe());
            client.disconnect();
            clientRef.current = null;
        };
    }, [user]);

    return (
        <LiveMarketContext.Provider value={{ connected, price, positions, strategyEvents, backtestStatus }}>
            {children}
        </LiveMarketContext.Provider>
    );
}

export function useLiveMarket() {
    return useContext(LiveMarketContext);
}

"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { playPatternForNotification, severityFallbackPattern, startAlarmLoop } from "@/lib/notification-sounds";
import { loadNotificationPreferences, shouldNotify } from "@/lib/notification-preferences";

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

export type NotificationSeverity = "info" | "warning" | "critical";

export type AppNotification = {
    id: string;
    category: string;
    severity: NotificationSeverity;
    title: string;
    message: string;
    metadata: Record<string, any>;
    read_at: string | null;
    archived_at: string | null;
    created_at: string;
};

type SupabaseContextType = {
    portfolio: PortfolioSnapshot | null;
    portfolioHistory: PortfolioSnapshot[];
    signals: Signal[];
    trades: Trade[];
    notifications: AppNotification[];
    unreadCount: number;
    markNotificationReadLocally: (id: string) => void;
    markNotificationArchivedLocally: (id: string, archived: boolean) => void;
    alarmingNotifications: AppNotification[];
    dismissAlarm: (id: string) => void;
    loading: boolean;
    error: string | null;
};

const SupabaseContext = createContext<SupabaseContextType>({
    portfolio: null,
    portfolioHistory: [],
    signals: [],
    trades: [],
    notifications: [],
    unreadCount: 0,
    markNotificationReadLocally: () => {},
    markNotificationArchivedLocally: () => {},
    alarmingNotifications: [],
    dismissAlarm: () => {},
    loading: true,
    error: null,
});

export function SupabaseProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
    const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);
    const [signals, setSignals] = useState<Signal[]>([]);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [alarmingIds, setAlarmingIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedInitialNotifications = useRef(false);
    const alarmStopFns = useRef<Map<string, () => void>>(new Map());

    function dismissAlarm(id: string) {
        const stop = alarmStopFns.current.get(id);
        if (stop) {
            stop();
            alarmStopFns.current.delete(id);
        }
        setAlarmingIds((prev) => prev.filter((x) => x !== id));
    }

    // Stop every active alarm loop on unmount -- otherwise a repeating
    // interval would keep firing sound against a torn-down page.
    useEffect(() => {
        return () => {
            alarmStopFns.current.forEach((stop) => stop());
            alarmStopFns.current.clear();
        };
    }, []);

    function markNotificationReadLocally(id: string) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
        dismissAlarm(id);
    }

    function markNotificationArchivedLocally(id: string, archived: boolean) {
        setNotifications((prev) =>
            prev.map((n) =>
                n.id === id
                    ? { ...n, archived_at: archived ? new Date().toISOString() : null, read_at: archived ? n.read_at ?? new Date().toISOString() : n.read_at }
                    : n
            )
        );
        // Archiving a still-alarming critical notification must stop the
        // sound/overlay too -- without this, an archived notification could
        // keep sounding and stay in the CriticalAlertOverlay indefinitely,
        // since dismissAlarm was only ever wired to "mark read", not archive.
        if (archived) {
            dismissAlarm(id);
        }
    }

    useEffect(() => {
        // Notifications (and, defensively, the rest of this data) are meant
        // for an authenticated session -- fetching and subscribing before
        // TradingAuthGate has confirmed a user would otherwise pull trade
        // signal/risk-guard/journal content into a signed-out browser
        // (including on /login) purely because this provider sits above the
        // auth gate in the layout tree. Wait for auth to resolve; go back to
        // the unloaded state on sign-out instead of leaving stale data around.
        if (!user) {
            setPortfolio(null);
            setPortfolioHistory([]);
            setSignals([]);
            setTrades([]);
            setNotifications([]);
            hasLoadedInitialNotifications.current = false;
            setLoading(true);
            setError(null);
            return;
        }

        let isMounted = true;

        async function fetchInitialData() {
            try {
                // Fetch the latest portfolio snapshot
                const { data: portData, error: portError } = await supabase
                    .from("portfolio_snapshots")
                    .select("*")
                    .order("time", { ascending: false })
                    .limit(24);

                if (portError) throw portError;

                const portfolioRows = (portData || []) as PortfolioSnapshot[];
                const latestPortfolio = portfolioRows[0] || null;

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

                // Recent notifications (last 50) -- oldest-first pagination isn't
                // needed here, the bell dropdown only ever shows a recent window.
                const { data: notifData, error: notifError } = await supabase
                    .from("notifications")
                    .select("*")
                    .is("archived_at", null)
                    .order("created_at", { ascending: false })
                    .limit(50);

                if (notifError) throw notifError;

                if (isMounted) {
                    setPortfolio(latestPortfolio);
                    setPortfolioHistory(portfolioRows);
                    setSignals(sigData || []);
                    setTrades(tradeData || []);
                    setNotifications((notifData || []) as AppNotification[]);
                    hasLoadedInitialNotifications.current = true;
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
                    const nextSnapshot = payload.new as PortfolioSnapshot;
                    setPortfolio(nextSnapshot);
                    setPortfolioHistory((prev) => [nextSnapshot, ...prev].slice(0, 24));
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
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "notifications" },
                (payload) => {
                    const next = payload.new as AppNotification;
                    setNotifications((prev) => [next, ...prev].slice(0, 50));

                    // Only sound/push for events that arrive *after* the initial
                    // load -- otherwise reconnecting or reopening the tab would
                    // replay every recent alert as a fresh chime.
                    if (!hasLoadedInitialNotifications.current) return;
                    const prefs = loadNotificationPreferences();
                    if (!shouldNotify(prefs, next.category, next.severity)) return;

                    if (prefs.browserPushEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                        new Notification(next.title, { body: next.message, tag: next.id });
                    }

                    const persistence = prefs.alarmPersistence[next.severity] ?? "once";
                    if (persistence === "once" || prefs.muteAll) {
                        playPatternForNotification(next.category, next.severity, prefs.categorySounds, prefs.volume, prefs.muteAll);
                        return;
                    }

                    const pattern = prefs.categorySounds[next.category] ?? severityFallbackPattern(next.severity);
                    const stop = startAlarmLoop(pattern, prefs.volume, 4000);
                    alarmStopFns.current.set(next.id, stop);
                    setAlarmingIds((prev) => [...prev, next.id]);

                    if (persistence === "repeat-3x") {
                        window.setTimeout(() => dismissAlarm(next.id), 4000 * 3);
                    } else if (persistence === "repeat-5min") {
                        window.setTimeout(() => dismissAlarm(next.id), 5 * 60 * 1000);
                    }
                    // "repeat-until-dismissed": no auto-stop -- waits for
                    // markNotificationReadLocally (the CriticalAlertOverlay's
                    // Dismiss button, or clicking the notification anywhere).
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
    }, [user]);

    const unreadCount = notifications.filter((n) => !n.read_at).length;
    const alarmingNotifications = notifications.filter((n) => alarmingIds.includes(n.id));

    return (
        <SupabaseContext.Provider
            value={{
                portfolio, portfolioHistory, signals, trades, notifications, unreadCount,
                markNotificationReadLocally, markNotificationArchivedLocally,
                alarmingNotifications, dismissAlarm, loading, error,
            }}
        >
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabaseData() {
    return useContext(SupabaseContext);
}

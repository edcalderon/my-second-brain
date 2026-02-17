import { auth } from "@/lib/firebase-client";

const API_BASE = process.env.NEXT_PUBLIC_DASHBOARD_API_BASE || "";

async function getAuthToken(): Promise<string | null> {
    if (!auth?.currentUser) {
        return null;
    }
    return auth.currentUser.getIdToken();
}

async function fetchWithAuth<T>(path: string): Promise<T> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

export type SummaryResponse = {
    fills: number;
    rejected_or_timeouts: number;
    last_status: string;
    last_fill_price: number;
    paused: boolean;
    pause_reason: string;
    ws_connected: boolean;
    ws_reconnect_count: number;
};

export type MarketResponse = {
    tick: {
        symbol: string;
        bid: number;
        ask: number;
        last_trade: number;
        ts: string;
    } | null;
    candle: {
        symbol: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        window_s: number;
        close_ts: string;
    } | null;
};

export type StrategyResponse = {
    intent: {
        intent_id: string;
        symbol: string;
        action: string;
        confidence: number;
        expected_edge_bps: number;
        created_at: string;
    } | null;
};

export type RiskResponse = {
    decision: {
        intent_id: string;
        approved: boolean;
        reason: string;
        bankroll: number;
        notional: number;
        requires_revalidation: boolean;
    } | null;
};

export type ExecutionResponse = {
    reconciliation: {
        order_id: string;
        client_order_id: string;
        status: string;
        filled_qty: number;
        avg_fill_price: number;
        drift_detected: boolean;
        ts: string;
    } | null;
};

export async function fetchSummary() {
    return fetchWithAuth<SummaryResponse>("/api/summary");
}

export async function fetchMarket() {
    return fetchWithAuth<MarketResponse>("/api/market");
}

export async function fetchStrategy() {
    return fetchWithAuth<StrategyResponse>("/api/strategy");
}

export async function fetchRisk() {
    return fetchWithAuth<RiskResponse>("/api/risk");
}

export async function fetchExecution() {
    return fetchWithAuth<ExecutionResponse>("/api/execution");
}

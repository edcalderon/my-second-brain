import { authClient } from "@/components/auth/AuthProvider";

const API_BASE =
    process.env.NEXT_PUBLIC_HUMMINGBOT_API_BASE ||
    process.env.NEXT_PUBLIC_DASHBOARD_API_BASE ||
    (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");
const NORMALIZED_API_BASE = API_BASE.replace(/\/$/, "");

async function getAuthToken(): Promise<string | null> {
    return await authClient.getSessionToken();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getAuthToken();
    const response = await fetch(`${NORMALIZED_API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || `Hummingbot API request failed: ${response.status}`);
    }

    return response.json();
}

export type HummingbotCandle = {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    [key: string]: unknown;
};

export type HummingbotPreview = {
    trading_pair: string;
    connector_name: string;
    interval: string;
    signal: "LONG" | "SHORT" | "HOLD" | "INSUFFICIENT_DATA";
    confidence: number;
    expected_edge_bps: number;
    reason: string;
    latest_close?: number | null;
    ema_fast?: number | null;
    ema_slow?: number | null;
    rsi?: number | null;
    candles: HummingbotCandle[];
};

export type HummingbotStatus = {
    service: string;
    api_url: string;
    paper_mode: boolean;
    default_account: string;
    default_connector: string;
    connectors: string[];
    connector_count: number;
    portfolio_state: Record<string, unknown> | null;
    open_positions: HummingbotPosition[];
    open_positions_count: number;
};

export type HummingbotMarket = {
    trading_pair: string;
    connector_name: string;
    interval: string;
    candles: HummingbotCandle[];
    latest_candle: HummingbotCandle | null;
    latest_close: number | null;
    price_preview: {
        signal: string;
        confidence: number;
        expected_edge_bps: number;
    } | null;
};

export type HummingbotPosition = {
    trading_pair?: string;
    symbol?: string;
    side?: string;
    amount?: number;
    size?: number;
    entry_price?: number;
    open_price?: number;
    leverage?: number;
    unrealized_pnl?: number;
    status?: string;
    connector_name?: string;
    account_name?: string;
    [key: string]: unknown;
};

export type HummingbotPositionsResponse = {
    account_name: string;
    positions: HummingbotPosition[];
    position_count: number;
};

export type TradeRequest = {
    trading_pair: string;
    side: "BUY" | "SELL";
    amount: number;
    leverage: number;
    stop_loss_pct: number;
    take_profit_1_pct: number;
    take_profit_2_pct: number;
    account_name?: string;
    connector_name?: string;
};

export type BacktestRequest = {
    strategy_config: Record<string, unknown>;
    start_date: string;
    end_date: string;
};

export type TradingStatusResponse = HummingbotStatus;

export async function fetchTradingStatus() {
    return fetchJson<TradingStatusResponse>("/trading/status");
}

export async function fetchTradingMarket(params?: {
    trading_pair?: string;
    connector_name?: string;
    interval?: string;
    limit?: number;
}) {
    const search = new URLSearchParams();
    if (params?.trading_pair) search.set("trading_pair", params.trading_pair);
    if (params?.connector_name) search.set("connector_name", params.connector_name);
    if (params?.interval) search.set("interval", params.interval);
    if (params?.limit) search.set("limit", String(params.limit));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return fetchJson<HummingbotMarket>(`/trading/market${suffix}`);
}

export async function fetchTradingPositions(accountName?: string) {
    const suffix = accountName ? `?account_name=${encodeURIComponent(accountName)}` : "";
    return fetchJson<HummingbotPositionsResponse>(`/trading/positions${suffix}`);
}

export async function previewTrade(request: {
    trading_pair?: string;
    connector_name?: string;
    interval?: string;
    limit?: number;
    fast_ema?: number;
    slow_ema?: number;
    rsi_period?: number;
}) {
    return fetchJson<HummingbotPreview>("/trading/preview", {
        method: "POST",
        body: JSON.stringify({
            trading_pair: request.trading_pair || "ETH-USD",
            connector_name: request.connector_name,
            interval: request.interval || "1h",
            limit: request.limit || 120,
            fast_ema: request.fast_ema || 21,
            slow_ema: request.slow_ema || 55,
            rsi_period: request.rsi_period || 14,
        }),
    });
}

export async function openPaperTrade(request: TradeRequest) {
    return fetchJson<{ request: TradeRequest; result: unknown }>("/trading/open", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export async function closePaperTrade(request: TradeRequest) {
    return fetchJson<{ request: TradeRequest; result: unknown }>("/trading/close", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export async function runBacktest(request: BacktestRequest) {
    return fetchJson<{ request: BacktestRequest; result: unknown }>("/trading/backtest", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

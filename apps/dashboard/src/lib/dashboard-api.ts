import { authClient } from "@/components/auth/AuthProvider";

export const DEFAULT_A_QUANT_API_BASE = "https://api.a-quant.xyz";

function normalizeApiBase(base: string) {
    const trimmed = base.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

const API_BASE = normalizeApiBase(
    process.env.NEXT_PUBLIC_A_QUANT_API_BASE ||
        process.env.NEXT_PUBLIC_HUMMINGBOT_API_BASE ||
        DEFAULT_A_QUANT_API_BASE,
);

async function getAuthToken(): Promise<string | null> {
    return await authClient.getSessionToken();
}

async function fetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}

type TradingStatusResponse = {
    service: string;
    api_url: string;
    paper_mode: boolean;
    default_account: string;
    default_connector: string;
    wallet_address?: string;
    connectors: string[];
    connector_count: number;
    portfolio_state: Record<string, unknown> | null;
    portfolio_summary?: {
        snapshot_time?: string;
        wallet_address: string;
        account_name: string;
        connector_name: string;
        paper_mode: boolean;
        total_value_eth: number;
        total_value_usd: number;
        s1: number;
        s2: number;
        s3: number;
        reserve: number;
        unrealized_pnl: number;
        realized_pnl: number;
        aave_hf: number;
    };
    open_positions: Record<string, unknown>[];
    open_positions_count: number;
};

type TradingMarketResponse = {
    trading_pair: string;
    connector_name: string;
    interval: string;
    candles: Record<string, unknown>[];
    latest_candle: Record<string, unknown> | null;
    latest_close?: number | null;
    price_preview?: {
        signal: string;
        confidence: number;
        expected_edge_bps: number;
    };
};

type TradingPositionsResponse = {
    account_name: string;
    positions: Record<string, unknown>[];
    position_count: number;
};

type TradingPreviewResponse = {
    trading_pair: string;
    connector_name: string;
    interval: string;
    signal: string;
    confidence: number;
    expected_edge_bps: number;
    reason: string;
    latest_close: number;
    ema_fast: number;
    ema_slow: number;
    rsi: number;
    candles: Record<string, unknown>[];
};

function toNumber(value: unknown, fallback = 0) {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getLatestCandle(response: TradingMarketResponse) {
    return response.latest_candle || response.candles[response.candles.length - 1] || null;
}

async function fetchTradingStatus() {
    return fetchWithAuth<TradingStatusResponse>("/trading/status");
}

async function fetchTradingMarket() {
    const response = await fetchWithAuth<TradingMarketResponse>(
        "/trading/market?trading_pair=ETH-USD&interval=1h&limit=120",
    );
    const latest = getLatestCandle(response);
    const symbol = String(latest?.symbol || response.trading_pair || "ETH-USD");
    const close = toNumber(latest?.close ?? response.latest_close, 0);
    const timestamp = String(latest?.close_ts || latest?.time || new Date().toISOString());

    return {
        tick: latest
            ? {
                  symbol,
                  bid: close > 0 ? close * 0.9995 : 0,
                  ask: close > 0 ? close * 1.0005 : 0,
                  last_trade: close,
                  ts: timestamp,
              }
            : null,
        candle: latest
            ? {
                  symbol,
                  open: toNumber(latest.open),
                  high: toNumber(latest.high),
                  low: toNumber(latest.low),
                  close,
                  volume: toNumber(latest.volume),
                  window_s: toNumber(latest.window_s),
                  close_ts: timestamp,
              }
            : null,
    };
}

async function fetchTradingPositions(accountName?: string) {
    const query = accountName ? `?account_name=${encodeURIComponent(accountName)}` : "";
    return fetchWithAuth<TradingPositionsResponse>(`/trading/positions${query}`);
}

async function fetchTradingPreview() {
    const status = await fetchTradingStatus();
    return fetchWithAuth<TradingPreviewResponse>("/trading/preview", {
        method: "POST",
        body: JSON.stringify({
            trading_pair: "ETH-USD",
            connector_name: status.default_connector,
            interval: "1h",
            fast_ema: 21,
            slow_ema: 55,
            rsi_period: 14,
        }),
    });
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
    const [status, market] = await Promise.all([fetchTradingStatus(), fetchTradingMarket()]);
    const latestPrice = market.candle?.close ?? market.tick?.last_trade ?? 0;

    return {
        fills: status.open_positions_count,
        rejected_or_timeouts: 0,
        last_status: status.paper_mode ? "paper" : "live",
        last_fill_price: latestPrice,
        paused: false,
        pause_reason: "",
        ws_connected: true,
        ws_reconnect_count: 0,
    } satisfies SummaryResponse;
}

export async function fetchMarket() {
    return fetchTradingMarket() satisfies Promise<MarketResponse>;
}

export async function fetchStrategy() {
    const preview = await fetchTradingPreview();

    return {
        intent: {
            intent_id: `${preview.trading_pair}:${preview.connector_name}:${preview.signal}`,
            symbol: preview.trading_pair,
            action: preview.signal === "LONG" ? "BUY" : preview.signal === "SHORT" ? "SELL" : "HOLD",
            confidence: preview.confidence,
            expected_edge_bps: preview.expected_edge_bps,
            created_at: new Date().toISOString(),
        },
    } satisfies StrategyResponse;
}

export async function fetchRisk() {
    const [status, market] = await Promise.all([fetchTradingStatus(), fetchTradingMarket()]);
    const totalValueUsd = status.portfolio_summary?.total_value_usd ?? 0;
    const reserveEth = status.portfolio_summary?.reserve ?? 0;
    const latestPrice = market.candle?.close ?? market.tick?.last_trade ?? 0;
    const notional = Math.max(totalValueUsd - reserveEth * latestPrice, 0);

    return {
        decision: {
            intent_id: `${status.default_account}:${status.default_connector}`,
            approved: status.paper_mode,
            reason: status.paper_mode
                ? "Paper trading is enabled on the A-Quant backend."
                : "Live mode requires manual review before execution.",
            bankroll: totalValueUsd,
            notional,
            requires_revalidation: !status.paper_mode || status.connector_count === 0,
        },
    } satisfies RiskResponse;
}

export async function fetchExecution() {
    const status = await fetchTradingStatus();
    const positions = await fetchTradingPositions(status.default_account);
    const market = await fetchTradingMarket();
    const filledQty = positions.positions.reduce((total, position) => {
        const amount = toNumber(position.amount ?? position.size ?? position.quantity ?? position.position_size, 0);
        return total + Math.abs(amount);
    }, 0);
    const latestPrice = market.candle?.close ?? market.tick?.last_trade ?? 0;

    return {
        reconciliation: {
            order_id: `${status.default_account}:${status.default_connector}`,
            client_order_id: status.default_account,
            status: positions.position_count > 0 ? "tracking" : "idle",
            filled_qty: filledQty,
            avg_fill_price: latestPrice,
            drift_detected: false,
            ts: new Date().toISOString(),
        },
    } satisfies ExecutionResponse;
}

import { authClient } from "@/components/auth/AuthProvider";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";

const NORMALIZED_API_BASE = getHummingbotApiBase();

export type TradingServiceIssue = {
    dependency: string;
    message: string;
    recoverable?: boolean;
    source?: string;
};

export type TradingServiceHealth = {
    state: "healthy" | "degraded" | "offline";
    source?: string;
    fallback_active?: boolean;
    checked_at?: string;
    issues?: TradingServiceIssue[];
};

export type TradingOutageNotice = {
    state: "degraded" | "offline";
    title: string;
    message: string;
    endpointLabel: string;
    details: string[];
    statusCode: number | null;
};

type TradingApiErrorPayload = {
    message?: string;
    error?: string;
    detail?: string;
    reason?: string;
    service_health?: TradingServiceHealth;
    outage?: {
        message?: string;
        issues?: TradingServiceIssue[];
    };
    issues?: TradingServiceIssue[];
    [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }

    return null;
}

function extractIssuesFromPayload(payload: TradingApiErrorPayload | string | null): string[] {
    if (!payload || typeof payload === "string") {
        return payload ? [payload] : [];
    }

    const issues: string[] = [];
    const directIssues = payload.issues;
    if (Array.isArray(directIssues)) {
        for (const issue of directIssues) {
            if (issue && typeof issue.message === "string" && issue.message.trim()) {
                issues.push(`${issue.dependency || "trading"}: ${issue.message.trim()}`);
            }
        }
    }

    const healthIssues = payload.service_health?.issues;
    if (Array.isArray(healthIssues)) {
        for (const issue of healthIssues) {
            if (issue && typeof issue.message === "string" && issue.message.trim()) {
                issues.push(`${issue.dependency || "trading"}: ${issue.message.trim()}`);
            }
        }
    }

    if (issues.length) {
        return issues;
    }

    const outageMessage = firstString(payload.outage?.message, payload.message, payload.error, payload.detail, payload.reason);
    return outageMessage ? [outageMessage] : [];
}

function getPayloadMessage(payload: unknown): string | null {
    if (typeof payload === "string") {
        return payload.trim() || null;
    }

    if (!isRecord(payload)) {
        return null;
    }

    const outage = isRecord(payload.outage) ? payload.outage : null;
    return firstString(
        payload.message,
        payload.error,
        payload.detail,
        payload.reason,
        outage ? outage.message : null,
    );
}

function resolveRequestUrl(endpoint: string) {
    if (/^https?:\/\//i.test(endpoint)) {
        return endpoint;
    }

    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${NORMALIZED_API_BASE}${normalizedEndpoint}`;
}

async function readErrorPayload(response: Response): Promise<TradingApiErrorPayload | string | null> {
    const rawText = await response.text().catch(() => "");
    if (!rawText) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            return JSON.parse(rawText) as TradingApiErrorPayload;
        } catch {
            return rawText;
        }
    }

    try {
        return JSON.parse(rawText) as TradingApiErrorPayload;
    } catch {
        return rawText;
    }
}

export class TradingApiError extends Error {
    status: number;
    method: string;
    endpoint: string;
    requestUrl: string;
    payload: TradingApiErrorPayload | string | null;

    constructor(params: {
        message: string;
        status: number;
        method: string;
        endpoint: string;
        requestUrl: string;
        payload: TradingApiErrorPayload | string | null;
    }) {
        super(params.message);
        this.name = "TradingApiError";
        Object.setPrototypeOf(this, TradingApiError.prototype);
        this.status = params.status;
        this.method = params.method;
        this.endpoint = params.endpoint;
        this.requestUrl = params.requestUrl;
        this.payload = params.payload;
    }

    get endpointLabel() {
        return `${this.method} ${this.requestUrl}`;
    }
}

export function getTradingErrorPayload<T>(error: unknown): T | null {
    if (error instanceof TradingApiError) {
        if (isRecord(error.payload)) {
            return error.payload as T;
        }
        return null;
    }

    return null;
}

export function getTradingErrorMessage(error: unknown): string | null {
    if (error instanceof TradingApiError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return null;
}

export function buildTradingOutageNotice({
    status,
    error,
    endpoint = "/trading/status",
    method = "GET",
}: {
    status?: TradingServiceHealth | null;
    error?: unknown;
    endpoint?: string;
    method?: string;
}): TradingOutageNotice | null {
    const payload = getTradingErrorPayload<TradingApiErrorPayload>(error);
    const payloadHealth = payload?.service_health;
    const serviceHealth = status ?? payloadHealth ?? null;
    const statusState = serviceHealth?.state ?? null;

    if (!error && statusState === "healthy") {
        return null;
    }

    const requestUrl = error instanceof TradingApiError ? error.requestUrl : resolveRequestUrl(endpoint);
    const endpointLabel = error instanceof TradingApiError ? error.endpointLabel : `${method.toUpperCase()} ${requestUrl}`;
    const statusCode = error instanceof TradingApiError ? error.status : null;
    const issueMessages = [
        ...(serviceHealth?.issues?.length
            ? serviceHealth.issues.map((issue) => `${issue.dependency || "trading"}: ${issue.message}`)
            : []),
        ...extractIssuesFromPayload(payload),
    ];
    const uniqueIssueMessages = [...new Set(issueMessages)];

    const degradedByHealth = statusState === "degraded";
    const offlineByHealth = statusState === "offline";
    const offlineByResponse = statusCode !== null && statusCode >= 503;
    const state: "degraded" | "offline" = offlineByHealth || offlineByResponse ? "offline" : "degraded";
    const title = state === "offline" ? "Trading backend offline" : "Trading backend degraded";

    let message = "Trading data is temporarily degraded.";
    if (error instanceof TradingApiError) {
        const payloadMessage = getPayloadMessage(payload);
        message = `${endpointLabel} returned ${error.status}. ${payloadMessage || "The trading service could not complete the request."}`;
    } else if (serviceHealth?.state === "degraded") {
        message = issueMessages[0] || "The trading backend returned usable data with one or more missing dependencies.";
    } else if (serviceHealth?.state === "offline") {
        message = issueMessages[0] || "The trading backend could not assemble a usable response.";
    } else if (getTradingErrorMessage(error)) {
        message = getTradingErrorMessage(error) as string;
    }

    if (!uniqueIssueMessages.length && !degradedByHealth && !offlineByHealth && !error) {
        return null;
    }

    return {
        state,
        title,
        message,
        endpointLabel,
        details: uniqueIssueMessages,
        statusCode,
    };
}

async function getAuthToken(): Promise<string | null> {
    return await authClient.getSessionToken();
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method || "GET").toUpperCase();
    const requestUrl = `${NORMALIZED_API_BASE}${path}`;
    const token = await getAuthToken();
    const response = await fetch(requestUrl, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers || {}),
        },
    });

    if (!response.ok) {
        const payload = await readErrorPayload(response);
        const message =
            getPayloadMessage(payload) || `Hummingbot API request failed: ${method} ${path} (${response.status})`;
        throw new TradingApiError({
            message,
            status: response.status,
            method,
            endpoint: path,
            requestUrl,
            payload,
        });
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
    service_health?: TradingServiceHealth | null;
};

export type HummingbotStatus = {
    service: string;
    api_url: string;
    paper_mode: boolean;
    default_account: string;
    default_connector: string;
    wallet_address?: string;
    main_wallet?: HummingbotWalletSnapshot | null;
    connectors: string[];
    connector_count: number;
    portfolio_state: Record<string, unknown> | null;
    portfolio_summary?: HummingbotPortfolioSummary | null;
    open_positions: HummingbotPosition[];
    open_positions_count: number;
    service_health?: TradingServiceHealth | null;
    // Positions read directly from Bybit, bypassing Hummingbot -- for
    // markets its connector doesn't track (e.g. USDC-margined perpetuals).
    // Raw Bybit V5 position objects (symbol, side, size, avgPrice,
    // markPrice, unrealisedPnl, leverage, ...), not normalizable via
    // normalizePosition(). Read-only: no close action wired up, since
    // Hummingbot can't act on this market either.
    bybit_direct_positions?: Array<Record<string, unknown>>;
    // Real account value, read directly from Bybit (Unified Trading +
    // Funding) -- this is the actual portfolio value. portfolio_summary
    // above reflects Hummingbot's own tracked state against placeholder
    // wallet addresses, not this account, and should not be shown as "the"
    // portfolio value.
    bybit_portfolio_value?: {
        total_usd: number;
        unified: {
            available: boolean;
            total_equity_usd?: number;
            wallet_balance_usd?: number;
            unrealized_pnl_usd?: number;
            available_balance_usd?: number;
            error?: string;
        };
        funding: {
            available: boolean;
            total_usd?: number;
            error?: string;
        };
    };
};

export type HummingbotWalletSnapshot = {
    wallet_address: string;
    token_address: string;
    token_symbol: string;
    chain: string;
    balance: number;
    balance_usd: number;
    raw_balance?: number;
    decimals?: number;
    status?: string;
    error?: string;
    updated_at?: string;
};

export type HummingbotPortfolioSummary = {
    snapshot_time?: string;
    wallet_address: string;
    main_wallet_address?: string;
    main_wallet_usdc?: number;
    main_wallet_token_symbol?: string;
    main_wallet_token_address?: string;
    main_wallet_chain?: string;
    account_name: string;
    connector_name: string;
    paper_mode: boolean;
    total_value_eth: number;
    total_value_usd: number;
    current_balance_usd?: number;
    current_balance_eth?: number | null;
    s1: number;
    s2: number;
    s3: number;
    reserve: number;
    unrealized_pnl: number;
    realized_pnl: number;
    aave_hf: number;
};

export type HummingbotPortfolioTracker = {
    service: string;
    snapshot_time: string;
    wallet_address: string;
    main_wallet?: HummingbotWalletSnapshot | null;
    account_name: string;
    connector_name: string;
    paper_mode: boolean;
    portfolio_state: Record<string, unknown> | null;
    open_positions: HummingbotPosition[];
    open_positions_count: number;
    aave_status: {
        health_factor: number;
        status: string;
        state?: string;
        dependency?: string;
        issue?: string;
        source?: string;
        updated_at?: string;
    };
    summary: HummingbotPortfolioSummary;
    service_health?: TradingServiceHealth | null;
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
    service_health?: TradingServiceHealth | null;
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
    service_health?: TradingServiceHealth | null;
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

export async function fetchTradingStatus(init?: RequestInit) {
    return fetchJson<TradingStatusResponse>("/trading/status", init);
}

export async function fetchPortfolioTracker(init?: RequestInit) {
    return fetchJson<HummingbotPortfolioTracker>("/trading/portfolio", init);
}

export async function fetchTradingMarket(params?: {
    trading_pair?: string;
    connector_name?: string;
    interval?: string;
    limit?: number;
}, init?: RequestInit) {
    const search = new URLSearchParams();
    if (params?.trading_pair) search.set("trading_pair", params.trading_pair);
    if (params?.connector_name) search.set("connector_name", params.connector_name);
    if (params?.interval) search.set("interval", params.interval);
    if (params?.limit) search.set("limit", String(params.limit));

    const suffix = search.toString() ? `?${search.toString()}` : "";
    return fetchJson<HummingbotMarket>(`/trading/market${suffix}`, init);
}

export async function fetchTradingPositions(accountName?: string, init?: RequestInit) {
    const suffix = accountName ? `?account_name=${encodeURIComponent(accountName)}` : "";
    return fetchJson<HummingbotPositionsResponse>(`/trading/positions${suffix}`, init);
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

// ── Trade journal ("bitácora") ──────────────────────────────────────
// Deliberately routed through api-svc only, never direct Supabase access
// from the browser -- entries hold real strategy reasoning, unlike the
// portfolio_snapshots/signals/trades tables the rest of this app reads
// directly with the anon key.

export type JournalEntry = {
    id: string;
    trade_number: number;
    title: string;
    instrument: string;
    side: "long" | "short";
    entry_price: number | null;
    size: number | null;
    leverage: number | null;
    status: "open" | "closed";
    source: string;
    thesis: string | null;
    risk_plan: string | null;
    outcome: string | null;
    tags: string[];
    opened_at: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
};

export type JournalEntryCreate = {
    title: string;
    instrument: string;
    side: "long" | "short";
    entry_price?: number | null;
    size?: number | null;
    leverage?: number | null;
    status?: "open" | "closed";
    source?: string;
    thesis?: string | null;
    risk_plan?: string | null;
    outcome?: string | null;
    tags?: string[];
    opened_at?: string | null;
};

export type JournalEntryUpdate = Partial<JournalEntryCreate> & { closed_at?: string | null };

export type JournalListParams = {
    status?: "open" | "closed";
    side?: "long" | "short";
    search?: string;
    limit?: number;
    offset?: number;
};

export async function fetchJournalEntries(params: JournalListParams = {}) {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.side) search.set("side", params.side);
    if (params.search) search.set("search", params.search);
    search.set("limit", String(params.limit ?? 20));
    search.set("offset", String(params.offset ?? 0));

    return fetchJson<{ entries: JournalEntry[]; total: number; limit: number; offset: number }>(
        `/journal?${search.toString()}`,
    );
}

export async function fetchJournalEntry(id: string) {
    return fetchJson<JournalEntry>(`/journal/${id}`);
}

export async function createJournalEntry(request: JournalEntryCreate) {
    return fetchJson<JournalEntry>("/journal", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export async function updateJournalEntry(id: string, request: JournalEntryUpdate) {
    return fetchJson<JournalEntry>(`/journal/${id}`, {
        method: "PATCH",
        body: JSON.stringify(request),
    });
}

export type JournalCloseRequest = {
    closing_summary: string;
    outcome?: string | null;
    exit_price?: number | null;
    realized_pnl?: number | null;
};

export async function closeJournalEntry(id: string, request: JournalCloseRequest) {
    return fetchJson<{ entry: JournalEntry; closure_analysis: TradeAnalysis }>(`/journal/${id}/close`, {
        method: "POST",
        body: JSON.stringify(request),
    });
}

// ── Trade analysis log ──────────────────────────────────────────────
// Append-only history of analysis passes over a journal entry (ATR/stop
// recalculations, reconciliation checks, ...) -- unlike thesis/risk_plan
// (current-state fields meant to be edited), this is never overwritten.

export type TradeAnalysis = {
    id: string;
    journal_id: string;
    analysis_type: string;
    summary: string;
    details: string | null;
    metrics: Record<string, number | string>;
    created_at: string;
};

export async function fetchTradeAnalysis(journalId: string) {
    return fetchJson<{ entries: TradeAnalysis[]; count: number }>(`/journal/${journalId}/analysis`);
}

// ── Notifications ────────────────────────────────────────────────────
// The dashboard reads the `notifications` table directly via Supabase
// Realtime (SupabaseProvider) -- these two calls are the only writes,
// which need api-svc/service_role since anon only has SELECT (migration
// 008_notifications.sql).

export async function markNotificationRead(id: string) {
    return fetchJson<{ id: string; read_at: string }>(`/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead() {
    return fetchJson<{ marked_read: number }>(`/notifications/read-all`, { method: "POST" });
}

export async function archiveNotification(id: string) {
    return fetchJson<{ id: string; archived_at: string }>(`/notifications/${id}/archive`, { method: "POST" });
}

export async function unarchiveNotification(id: string) {
    return fetchJson<{ id: string; archived_at: string | null }>(`/notifications/${id}/unarchive`, { method: "POST" });
}

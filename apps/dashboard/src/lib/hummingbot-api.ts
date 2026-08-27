import { authClient } from "@/components/auth/AuthProvider";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";

const NORMALIZED_API_BASE = getHummingbotApiBase();

// Convert a frontend instrument string (e.g. "BTCUSDT") into the BASE-QUOTE
// format Hummingbot expects (e.g. "BTC-USDT").
export function toHummingbotPair(instrument: string): string {
    return instrument.replace(/(USDT|USDC|PERP)$/i, "-$1");
}

export type TradingServiceIssue = {
    dependency: string;
    message: string;
    recoverable?: boolean;
    source?: string;
    severity?: "critical" | "warning" | "info";
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
    infoDetails?: string[];  // Info-severity issues (secondary deps, not actionable)
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

    // Only critical/warning issues drive the offline/degraded state.
    // "info" issues are secondary dependencies (Aave, wallet snapshots)
    // that don't impact core trading functionality.
    const filterActionableIssues = (issues: TradingServiceIssue[] | undefined) =>
        issues?.filter((i) => i.severity !== "info") ?? [];

    const actionableHealthIssues = filterActionableIssues(serviceHealth?.issues);
    const actionablePayloadIssues = filterActionableIssues(payload?.issues);
    const actionableHealthState =
        actionableHealthIssues.length === 0 && !serviceHealth?.fallback_active
            ? "healthy"
            : serviceHealth?.state ?? null;

    const issueMessages = [
        ...(actionableHealthIssues.length
            ? actionableHealthIssues.map((issue) => `${issue.dependency || "trading"}: ${issue.message}`)
            : []),
        ...extractIssuesFromPayload(payload).filter((_, i) => {
            // extractIssuesFromPayload pulls from payload.issues + payload.service_health.issues
            // We already filtered actionablePayloadIssues above, but extractIssuesFromPayload is
            // called separately. Filter out info-severity messages from the raw extraction too.
            const allPayloadIssues = [
                ...(payload?.issues ?? []),
                ...(payload?.service_health?.issues ?? []),
            ];
            if (i < allPayloadIssues.length) {
                return allPayloadIssues[i]?.severity !== "info";
            }
            return true;
        }),
    ];
    const uniqueIssueMessages = [...new Set(issueMessages)];

    const degradedByHealth = actionableHealthState === "degraded";
    const offlineByHealth = actionableHealthState === "offline";
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

    // Also collect info-severity issues for the details list (shown below critical ones)
    const infoMessages = [
        ...(serviceHealth?.issues?.filter((i) => i.severity === "info").map((issue) => `${issue.dependency || "trading"}: ${issue.message}`) ?? []),
    ];

    if (!uniqueIssueMessages.length && !degradedByHealth && !offlineByHealth && !error && infoMessages.length === 0) {
        return null;
    }

    return {
        state: uniqueIssueMessages.length > 0 || degradedByHealth || offlineByHealth || error ? state : "degraded",
        title: uniqueIssueMessages.length > 0 || degradedByHealth || offlineByHealth || error ? title : "Trading service notice",
        message: uniqueIssueMessages.length > 0 ? message : "One or more secondary dependencies are unavailable.",
        endpointLabel,
        details: uniqueIssueMessages,
        infoDetails: infoMessages,
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
        // The backend stamps short-lived Cache-Control headers on some GET
        // routes (e.g. /trading/status: max-age=5, stale-while-revalidate=30)
        // for reverse-proxy/CDN benefit. The browser's fetch cache honors
        // that header too, which let a 5s-interval poller serve a response
        // up to ~35s stale. This is a live trading dashboard -- every call
        // through this wrapper should hit the network, not the browser
        // cache. Callers can still override via `init.cache` if a specific
        // call ever wants caching.
        cache: init?.cache ?? "no-store",
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
    // Authoritative dry-run/live flag -- paper_mode above is not enforced
    // anywhere in the backend's order-placement path. UI banners should
    // branch on this, not on paper_mode.
    live_trading_enabled: boolean;
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
    // Executor identity -- tells the dashboard which backend instance is
    // responding. See a-quant/apps/api-svc/src/core/config.py for the
    // EXECUTOR_ID/LABEL/PRIORITY env vars.
    executor_id?: string;
    executor_label?: string;
    executor_priority?: "primary" | "fallback" | "standby";
    // BTC last price + 24h change, read directly from Bybit's public
    // ticker endpoint (no API keys required). Powers the Sidebar's live
    // price widget. null if the ticker fetch failed.
    btc_ticker?: {
        symbol: string;
        last_price: number;
        // Fraction, not percent -- e.g. 0.0123 == +1.23%.
        price_24h_pcnt: number;
    } | null;
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
    // Client-generated UUID (crypto.randomUUID() at call time). A repeat
    // within 24h returns the backend's cached result instead of placing a
    // second real order -- see /trading/open's idempotency check.
    client_request_id?: string;
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

export type NextReconcileResponse = {
    // ISO timestamp of the real, already-scheduled close-guard reconcile
    // job's next fire (see api-svc main.py, APScheduler job id
    // "close_guard_reconcile") -- null if the scheduler wasn't reachable or
    // the guard is disabled. Not a fabricated timer: this is the literal
    // next_run_time of the job that actually re-checks every open position.
    next_run_at: string | null;
    interval_minutes: number;
    enabled: boolean;
};

export async function fetchNextReconcile(init?: RequestInit) {
    return fetchJson<NextReconcileResponse>("/trading/next-reconcile", init);
}

export type ConnectivityState = "healthy" | "degraded" | "offline" | "unknown";

export type MonitorStatusResponse = {
    // Same close-guard timing as NextReconcileResponse, plus the real
    // internet/Bybit connectivity monitor state (services/connectivity_monitor.py)
    // -- backs the execution monitor's status card.
    next_reconcile_at: string | null;
    reconcile_interval_minutes: number;
    reconcile_enabled: boolean;
    connectivity_state: ConnectivityState | null;
    connectivity_last_check_at: string | null;
    connectivity_last_success_at: string | null;
};

export async function fetchMonitorStatus(init?: RequestInit) {
    return fetchJson<MonitorStatusResponse>("/trading/monitor-status", init);
}

// Manual "check now" controls -- both call the exact same code path as
// their scheduled counterpart, just on demand (see trading_routes.py).
export async function triggerReconcileNow() {
    return fetchJson<{ closed: number; [key: string]: unknown }>("/trading/reconcile-closes", { method: "POST" });
}

export async function triggerConnectivityCheckNow() {
    return fetchJson<{ connectivity_state: ConnectivityState; checked_at: string | null }>(
        "/trading/connectivity-check-now",
        { method: "POST" },
    );
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

// ── AI Setup Suggest ────────────────────────────────────────────────

export type AiSuggestRequest = {
    instruments?: string[];
    interval?: string;
    limit?: number;
    fast_ema?: number;
    slow_ema?: number;
    rsi_period?: number;
    side_preference?: "long" | "short" | "neutral";
};

export type AiSuggestResult = {
    instrument: string;
    side: "long" | "short";
    title: string;
    reasoning: string;
    thesis: string;
    risk_plan: string;
    stop_loss_pct: number;
    tp1_pct: number;
    tp2_pct: number;
    confidence: number;
};

export async function aiSetupSuggest(request: AiSuggestRequest) {
    return fetchJson<AiSuggestResult>("/strategy/ai-suggest", {
        method: "POST",
        body: JSON.stringify({
            instruments: request.instruments || ["BTCUSDT", "ETHUSDT"],
            interval: request.interval || "1h",
            limit: request.limit || 120,
            fast_ema: request.fast_ema || 21,
            slow_ema: request.slow_ema || 55,
            rsi_period: request.rsi_period || 14,
            side_preference: request.side_preference || "neutral",
        }),
    });
}

// Named for what they actually do: both hit real live endpoints on the
// backend (gated server-side by LIVE_TRADING_ENABLED, not by this client).
// Previously named openPaperTrade/closePaperTrade, which was misleading.
export async function submitTradeOpen(request: TradeRequest) {
    return fetchJson<{ request: TradeRequest; result: unknown }>("/trading/open", {
        method: "POST",
        body: JSON.stringify(request),
    });
}

export async function submitTradeClose(request: TradeRequest) {
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

export type JournalEntryType = "trade" | "setup" | "lesson";

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
    // Migration 011 outcome fields
    exit_price: number | null;
    realized_pnl: number | null;
    fees_paid: number | null;
    funding_paid: number | null;
    close_reason: string | null;
    duration_hours: number | null;
    mae: number | null;
    mfe: number | null;
    mae_at: string | null;
    mfe_at: string | null;
    post_mortem_at: string | null;
    // Trade setups (migration 014)
    entry_type: JournalEntryType;
    reasoning: string | null;
    parent_setup_id: string | null;
    // Trigger Setup (migration 015)
    scenario_label: string | null;
    market_snapshot: MarketSnapshot | null;
};

// Captured from HummingbotPreview at setup save-time -- used to detect
// drift (price/signal) before a setup is triggered into a live order.
export type MarketSnapshot = {
    latest_close?: number | null;
    rsi?: number | null;
    ema_fast?: number | null;
    ema_slow?: number | null;
    signal?: string | null;
    funding_rate?: number | null;
    [key: string]: unknown;
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
    // Trade setups (migration 014)
    entry_type?: JournalEntryType;
    reasoning?: string | null;
    parent_setup_id?: string | null;
    // Trigger Setup (migration 015)
    scenario_label?: string | null;
    market_snapshot?: MarketSnapshot | null;
};

export type JournalEntryUpdate = Partial<JournalEntryCreate> & { closed_at?: string | null };

export type JournalListParams = {
    status?: "open" | "closed";
    side?: "long" | "short";
    entry_type?: JournalEntryType;
    search?: string;
    limit?: number;
    offset?: number;
};

export async function fetchJournalEntries(params: JournalListParams = {}) {
    const search = new URLSearchParams();
    if (params.status) search.set("status", params.status);
    if (params.side) search.set("side", params.side);
    if (params.entry_type) search.set("entry_type", params.entry_type);
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

// Freshness verdict from evaluateSetupFreshness() (lib/setup-freshness.ts),
// re-run against the live preview at Trigger Setup confirm-time.
export type SetupFreshness = "aligned" | "drifted" | "flipped" | "unknown";

export type JournalPromoteRequest = {
    entry_price?: number | null;
    size?: number | null;
    leverage?: number | null;
    title?: string | null;
    // Trigger Setup (migration 015)
    scenario_label?: string | null;
    stop_loss_price?: number | null;
    take_profit_price?: number | null;
    freshness_status?: SetupFreshness | null;
    freshness_reason?: string | null;
};

export async function promoteJournalEntry(id: string, request: JournalPromoteRequest = {}) {
    return fetchJson<{ setup: string; trade: JournalEntry }>(`/journal/${id}/promote`, {
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

// ── AI cost & budget tracking ────────────────────────────────────────
// Backs the "Cost & Budget" page (app/usage/page.tsx). See
// a-quant/docs/ai-cost-tracking.md for the design these mirror.

export type LlmSpendByModel = { model: string; cost_usd: number; calls: number };
export type LlmSpendByFeature = { feature: string; cost_usd: number; calls: number };
export type LlmSpendDaily = { date: string; cost_usd: number; calls: number };

export type LlmSpendSummary = {
    days: number;
    total_cost_usd: number;
    total_calls: number;
    ok_calls: number;
    error_calls: number;
    by_model: LlmSpendByModel[];
    by_feature: LlmSpendByFeature[];
    daily: LlmSpendDaily[];
    month_to_date_usd: number;
};

export type AiBudgetStatus = {
    monthly_budget_usd: number;
    alert_threshold_pct: number;
    spent_this_month: number;
    remaining: number;
    pct_used: number;
    status: "ok" | "warning" | "over";
    active_model: string | null;
    enabled: boolean;
};

export type AiCostSummary = {
    spend: LlmSpendSummary;
    budget: AiBudgetStatus;
};

export type LlmUsageEntry = {
    id: string;
    created_at: string;
    feature: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens: number;
    cache_read_tokens: number;
    cost_usd: number;
    journal_id: string | null;
    latency_ms: number | null;
    ok: boolean;
    error: string | null;
};

export type AiSettings = {
    monthly_budget_usd: number;
    alert_threshold_pct: number;
    active_model: string;
    enabled: boolean;
};

export type AiSettingsUpdate = Partial<AiSettings>;

export type AiModelPricing = {
    model: string;
    input: number;
    output: number;
    cache_write: number;
    cache_read: number;
    active: boolean;
};

export async function fetchAiCostSummary(days = 30) {
    return fetchJson<AiCostSummary>(`/ai/cost/summary?days=${days}`);
}

export async function fetchAiCostUsage(params: { limit?: number; offset?: number; feature?: string; model?: string } = {}) {
    const search = new URLSearchParams();
    search.set("limit", String(params.limit ?? 50));
    search.set("offset", String(params.offset ?? 0));
    if (params.feature) search.set("feature", params.feature);
    if (params.model) search.set("model", params.model);

    return fetchJson<{ entries: LlmUsageEntry[]; total: number }>(`/ai/cost/usage?${search.toString()}`);
}

export async function fetchAiSettings() {
    return fetchJson<AiSettings>("/ai/cost/settings");
}

export async function updateAiSettings(update: AiSettingsUpdate) {
    return fetchJson<AiSettings>("/ai/cost/settings", {
        method: "PUT",
        body: JSON.stringify(update),
    });
}

export async function fetchAiCostModels() {
    return fetchJson<{ active_model: string; models: AiModelPricing[] }>("/ai/cost/models");
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

// ── Strategy automation ────────────────────────────────────────
// Backs the Strategy panel on the command-center page.
// See a-quant/apps/api-svc/src/services/strategy_automation.md.

export type StrategyRiskParams = {
    margin_usd: number;
    leverage: number;
    atr_stop_mult: number;
    atr_target_mult: number;
    big_trade_notional_usd: number;
};

export type StrategyEntryFilters = {
    min_adx_for_trend: number;
    rsi_overbought: number;
    rsi_oversold: number;
    require_regime: boolean;
    // 5M timing thresholds (dual-timeframe entries).
    pullback_rsi_long: number;
    pullback_rsi_short: number;
    range_rsi_long: number;
    range_rsi_short: number;
};

export type StrategyState = {
    id: string;
    enabled: boolean;
    phase: "idle" | "armed" | "in_position";
    symbol: string;
    category: string;
    settle_coin: string;
    risk_params: StrategyRiskParams;
    entry_filters: StrategyEntryFilters;
    current_journal_id: string | null;
    armed_at: string | null;
    entered_at: string | null;
    last_evaluated_at: string | null;
    last_reason: string | null;
    updated_at: string;
};

export async function fetchStrategyStatus(): Promise<StrategyState> {
    return fetchJson<StrategyState>("/strategy/status");
}

export async function updateStrategySettings(
    update: { risk_params?: Partial<StrategyRiskParams>; entry_filters?: Partial<StrategyEntryFilters> },
): Promise<StrategyState> {
    return fetchJson<StrategyState>("/strategy/settings", {
        method: "PUT",
        body: JSON.stringify(update),
    });
}

// Agent activity -- in-memory registry of what each background service
// (thesis_monitor, risk_guard, strategy_runner, position_defender) is
// doing right now. No persistence -- a restart resets to idle.
export type AgentActivityState = "idle" | "thinking" | "writing" | "monitoring";

export type AgentActivityEntry = {
    state: AgentActivityState;
    detail: string | null;
    updated_at: string | null;
};

export type AgentStatusResponse = Record<string, AgentActivityEntry>;

export async function fetchAgentStatus(): Promise<AgentStatusResponse> {
    return fetchJson<AgentStatusResponse>("/agents/status");
}

export async function activateStrategy(): Promise<StrategyState> {
    return fetchJson<StrategyState>("/strategy/activate", { method: "POST" });
}

export async function deactivateStrategy(): Promise<StrategyState> {
    return fetchJson<StrategyState>("/strategy/deactivate", { method: "POST" });
}

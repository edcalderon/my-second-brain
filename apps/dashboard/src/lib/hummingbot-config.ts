const DEFAULT_HUMMINGBOT_API_BASE =
    process.env.NODE_ENV === "development" ? "http://localhost:8001" : "https://api.a-quant.xyz";

function normalizeApiBase(base: string) {
    const trimmed = base.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

export function getHummingbotApiBase() {
    const base = process.env.NEXT_PUBLIC_HUMMINGBOT_API_BASE || DEFAULT_HUMMINGBOT_API_BASE;
    return normalizeApiBase(base);
}

/** Base URL for the trading API's WebSocket routes (/ws/live).
 * NEXT_PUBLIC_HUMMINGBOT_WS_BASE overrides directly; otherwise derived from
 * the same API base this module already resolves, swapping the scheme
 * (http -> ws, https -> wss) so it tracks NEXT_PUBLIC_HUMMINGBOT_API_BASE
 * automatically instead of needing its own separate env var in the common
 * case. */
export function getHummingbotWsBase() {
    const override = process.env.NEXT_PUBLIC_HUMMINGBOT_WS_BASE;
    if (override) return normalizeApiBase(override);
    return getHummingbotApiBase().replace(/^http/, "ws");
}

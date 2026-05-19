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

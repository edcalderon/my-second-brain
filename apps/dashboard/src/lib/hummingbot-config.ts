export const DEFAULT_HUMMINGBOT_API_BASE = "https://api.a-quant.xyz";

export function getHummingbotApiBase() {
    const base = process.env.NEXT_PUBLIC_HUMMINGBOT_API_BASE || DEFAULT_HUMMINGBOT_API_BASE;
    return base.replace(/\/$/, "");
}

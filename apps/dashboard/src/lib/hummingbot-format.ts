import type { HummingbotPosition } from "@/lib/hummingbot-api";

type AnyRecord = Record<string, unknown>;

export function readField<T = unknown>(value: AnyRecord, keys: string[], fallback?: T): T | undefined {
    for (const key of keys) {
        const current = value[key];
        if (current !== undefined && current !== null && current !== "") {
            return current as T;
        }
    }
    return fallback;
}

export function normalizePosition(position: HummingbotPosition) {
    const rawSide = String(readField(position, ["side", "position_side", "direction", "trade_side"], "UNKNOWN")).toUpperCase();
    const side = rawSide === "LONG" ? "BUY" : rawSide === "SHORT" ? "SELL" : rawSide;
    const tradingPair = String(readField(position, ["trading_pair", "symbol", "pair"], "--"));
    const amount = Number(readField(position, ["amount", "size", "quantity", "position_size"], 0));
    const entryPrice = Number(readField(position, ["entry_price", "open_price", "avg_price", "price"], 0));
    const leverage = Number(readField(position, ["leverage", "effective_leverage"], 0));
    const unrealizedPnl = Number(readField(position, ["unrealized_pnl", "pnl", "profit", "unrealized_profit"], 0));
    const status = String(readField(position, ["status", "state"], "open"));

    return {
        tradingPair,
        side,
        amount,
        entryPrice,
        leverage,
        unrealizedPnl,
        status,
        raw: position,
    };
}

export function formatNumber(value: unknown, fractionDigits = 6): string {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
        return String(value);
    }

    return num.toLocaleString(undefined, {
        minimumFractionDigits: Math.min(2, fractionDigits),
        maximumFractionDigits: fractionDigits,
    });
}

export function formatPercent(value: unknown, fractionDigits = 2): string {
    if (value === null || value === undefined || value === "") {
        return "--";
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
        return String(value);
    }

    return `${num.toFixed(fractionDigits)}%`;
}

export function formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

export function formatJson(value: unknown): string {
    if (value === undefined) {
        return "--";
    }
    if (value === null) {
        return "null";
    }

    try {
        return JSON.stringify(value, null, 2) || "--";
    } catch {
        return String(value);
    }
}

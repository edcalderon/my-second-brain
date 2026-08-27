"use client";

// Normalizes the two live-position sources (Hummingbot-tracked positions and
// raw Bybit direct positions) into one flat, provider-tagged array. Pulled
// out of Sidebar.tsx's old LiveInfoWidget (which only ever looked at
// allPositions[0]) so any component -- the sidebar's LiveTradeMonitor today,
// potentially the execution page or a header widget later -- can render
// *every* open position without re-deriving this merge logic, and so a
// future additional provider only needs one more branch here, not a
// UI-level rewrite.

import { useTradingStatus } from "@/components/trading/TradingStatusProvider";

export type LivePosition = {
    /** Stable React key -- not guaranteed unique across exchanges long-term,
     * but sufficient while "bybit" is the only direct-provider source. */
    key: string;
    symbol: string;
    side: "long" | "short";
    size: number | null;
    entryPrice: number | null;
    leverage: number | null;
    unrealizedPnl: number | null;
    /** Hummingbot's connector_name for connector-tracked positions, or
     * "bybit" for positions read directly (see bybit_direct_positions on
     * HummingbotStatus). This is the seam a future second exchange/provider
     * plugs into. */
    provider: string;
};

function toSide(raw: unknown): "long" | "short" {
    const s = String(raw ?? "").toLowerCase();
    return s === "short" || s === "sell" ? "short" : "long";
}

function toNumber(raw: unknown): number | null {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function useLivePositions(): LivePosition[] {
    const { status } = useTradingStatus();

    const humPositions: LivePosition[] = (status?.open_positions ?? [])
        .filter((p) => toNumber(p.size ?? p.amount) !== null && toNumber(p.size ?? p.amount) !== 0)
        .map((p) => {
            const symbol = String(p.symbol ?? p.trading_pair ?? "—");
            const side = toSide(p.side);
            return {
                key: `${p.connector_name ?? "hummingbot"}:${symbol}:${side}`,
                symbol,
                side,
                size: toNumber(p.size ?? p.amount),
                entryPrice: toNumber(p.entry_price ?? p.open_price),
                leverage: toNumber(p.leverage),
                unrealizedPnl: toNumber(p.unrealized_pnl),
                provider: p.connector_name ?? "hummingbot",
            };
        });

    const bybitPositions: LivePosition[] = (status?.bybit_direct_positions ?? [])
        .filter((p) => toNumber(p.size) !== null && toNumber(p.size) !== 0)
        .map((p) => {
            const symbol = String(p.symbol ?? "—");
            const side = toSide(p.side);
            return {
                key: `bybit:${symbol}:${side}`,
                symbol,
                side,
                size: toNumber(p.size),
                entryPrice: toNumber(p.avgPrice),
                leverage: toNumber(p.leverage),
                unrealizedPnl: toNumber(p.unrealisedPnl),
                provider: "bybit",
            };
        });

    return [...humPositions, ...bybitPositions];
}

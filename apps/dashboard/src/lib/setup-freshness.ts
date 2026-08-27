// Pure client-side check for whether a saved setup's market_snapshot still
// matches current conditions. Used both at-rest (a dot on the collapsed
// SetupCard) and at Trigger Setup confirm-time (the freshness panel).

import type { HummingbotPreview, JournalEntry, SetupFreshness } from "@/lib/hummingbot-api";

// Price drift beyond this fraction of the snapshot price is a "drift" flag,
// even if the signal direction hasn't flipped yet.
const PRICE_DRIFT_THRESHOLD = 0.015; // 1.5%

export type FreshnessResult = {
    status: SetupFreshness;
    priceDriftPct: number | null;
    signalFlipped: boolean;
    reason: string;
};

function signalImpliesSide(signal: string | null | undefined): "long" | "short" | null {
    if (signal === "LONG") return "long";
    if (signal === "SHORT") return "short";
    return null;
}

export function evaluateSetupFreshness(
    setup: JournalEntry,
    currentPreview: HummingbotPreview | null,
): FreshnessResult {
    const snapshot = setup.market_snapshot;

    if (!snapshot || !currentPreview) {
        return {
            status: "unknown" as SetupFreshness,
            priceDriftPct: null,
            signalFlipped: false,
            reason: "No market snapshot captured for this setup — freshness can't be checked.",
        };
    }

    let priceDriftPct: number | null = null;
    if (typeof snapshot.latest_close === "number" && snapshot.latest_close !== 0 && typeof currentPreview.latest_close === "number") {
        priceDriftPct = Math.abs(currentPreview.latest_close - snapshot.latest_close) / Math.abs(snapshot.latest_close);
    }

    const snapshotImpliedSide = signalImpliesSide(snapshot.signal ?? null);
    const currentImpliedSide = signalImpliesSide(currentPreview.signal);
    const signalFlipped =
        snapshotImpliedSide !== null &&
        currentImpliedSide !== null &&
        currentImpliedSide !== setup.side &&
        snapshotImpliedSide === setup.side;

    if (signalFlipped) {
        return {
            status: "flipped",
            priceDriftPct,
            signalFlipped: true,
            reason: `Signal has flipped: setup was ${setup.side} on a ${snapshot.signal} read, current signal is ${currentPreview.signal}.`,
        };
    }

    if (priceDriftPct !== null && priceDriftPct > PRICE_DRIFT_THRESHOLD) {
        return {
            status: "drifted",
            priceDriftPct,
            signalFlipped: false,
            reason: `Price has moved ${(priceDriftPct * 100).toFixed(2)}% since this setup was saved (snapshot $${snapshot.latest_close}, now $${currentPreview.latest_close}).`,
        };
    }

    return {
        status: "aligned",
        priceDriftPct,
        signalFlipped: false,
        reason: "Conditions still align with this setup.",
    };
}

export type RiskTagValues = {
    stopLossPct: number | null;
    tp1Pct: number | null;
    tp2Pct: number | null;
};

// Setups persist their stop/target as percentage tags ("stop:2.0%", written
// by the Setup Builder) rather than dedicated columns. Trigger Setup reads
// them back off the setup itself so it never falls back to stale global
// builder state.
export function parseRiskTags(tags: string[] | null | undefined): RiskTagValues {
    const find = (prefix: string): number | null => {
        const tag = (tags ?? []).find((t) => t.startsWith(prefix));
        if (!tag) return null;
        const match = tag.slice(prefix.length).match(/-?[\d.]+/);
        return match ? Number(match[0]) / 100 : null;
    };
    return {
        stopLossPct: find("stop:"),
        tp1Pct: find("tp1:"),
        tp2Pct: find("tp2:"),
    };
}

// Computes the exact stop-loss / take-profit prices a Trigger Setup order
// would send, from the setup's own persisted risk tags and a reference
// price (the live preview close, falling back to the setup's snapshot).
export function computeRiskPrices(
    side: "long" | "short",
    referencePrice: number | null,
    risk: RiskTagValues,
): { stopLossPrice: number | null; takeProfitPrice: number | null } {
    if (referencePrice == null) return { stopLossPrice: null, takeProfitPrice: null };
    const sign = side === "long" ? 1 : -1;
    const stopLossPrice = risk.stopLossPct != null ? referencePrice * (1 - sign * risk.stopLossPct) : null;
    const takeProfitPrice = risk.tp1Pct != null ? referencePrice * (1 + sign * risk.tp1Pct) : null;
    return { stopLossPrice, takeProfitPrice };
}

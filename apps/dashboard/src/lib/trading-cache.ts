import type { BalancePoint } from "@/lib/balance-series";
import type { HummingbotPortfolioTracker, HummingbotStatus } from "@/lib/hummingbot-api";

const STORAGE_KEY = "edward.dashboard.portfolio-live-cache.v1";

export type PortfolioLiveCache = {
    status: HummingbotStatus | null;
    tracker: HummingbotPortfolioTracker | null;
    liveSamples: BalancePoint[];
    savedAt: string;
};

function isBrowser() {
    return typeof window !== "undefined";
}

export function readPortfolioLiveCache(): PortfolioLiveCache | null {
    if (!isBrowser()) {
        return null;
    }

    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as PortfolioLiveCache;
        if (!parsed || typeof parsed.savedAt !== "string") {
            return null;
        }

        return {
            status: parsed.status ?? null,
            tracker: parsed.tracker ?? null,
            liveSamples: Array.isArray(parsed.liveSamples) ? parsed.liveSamples : [],
            savedAt: parsed.savedAt,
        };
    } catch {
        return null;
    }
}

export function writePortfolioLiveCache(snapshot: PortfolioLiveCache) {
    if (!isBrowser()) {
        return;
    }

    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
        // Ignore storage quota / privacy mode failures.
    }
}

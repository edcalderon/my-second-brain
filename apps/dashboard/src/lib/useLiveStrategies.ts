"use client";

// "Which strategies are running right now" -- rows of GET /strategies that
// are activated (armed) or holding a position, excluding read-only legacy
// rows. Polls only while a user is signed in (same gating rationale as
// TradingStatusProvider) and keeps the last good data on a failed poll.
//
// The sidebar renders both an expanded and a collapsed variant but only one
// at a time, and the live page mounts its own copy -- so the poller is
// shared at module level (ref-counted): any number of hook instances means
// one interval and one request per cycle.

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchStrategies, type StrategyListItem } from "@/lib/hummingbot-api";

const POLL_INTERVAL_MS = 20000;

export function isLiveStrategy(s: StrategyListItem): boolean {
    return !s.read_only && (Boolean(s.enabled) || s.phase === "in_position");
}

type Snapshot = {
    strategies: StrategyListItem[];
    loading: boolean;
    error: string | null;
};

let snapshot: Snapshot = { strategies: [], loading: true, error: null };
const listeners = new Set<(s: Snapshot) => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

function publish(next: Snapshot) {
    snapshot = next;
    listeners.forEach((l) => l(snapshot));
}

async function poll() {
    if (inFlight) return;
    inFlight = true;
    try {
        const res = await fetchStrategies();
        publish({ strategies: res.strategies ?? [], loading: false, error: null });
    } catch (err) {
        // Keep the last good list; just surface the error.
        publish({
            ...snapshot,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to fetch strategies",
        });
    } finally {
        inFlight = false;
    }
}

/** Force an immediate refresh (e.g. right after activating/deactivating). */
export function refreshLiveStrategies() {
    void poll();
}

export function useLiveStrategies(): {
    live: StrategyListItem[];
    all: StrategyListItem[];
    loading: boolean;
    error: string | null;
} {
    const { user } = useAuth();
    const [state, setState] = useState<Snapshot>(snapshot);

    useEffect(() => {
        if (!user) {
            setState({ strategies: [], loading: true, error: null });
            return;
        }
        setState(snapshot);
        listeners.add(setState);
        if (listeners.size === 1) {
            void poll();
            timer = setInterval(poll, POLL_INTERVAL_MS);
        }
        return () => {
            listeners.delete(setState);
            if (listeners.size === 0 && timer) {
                clearInterval(timer);
                timer = null;
                // Next mount starts from a clean slate rather than stale data.
                snapshot = { strategies: [], loading: true, error: null };
            }
        };
    }, [user]);

    return {
        live: state.strategies.filter(isLiveStrategy),
        all: state.strategies,
        loading: state.loading,
        error: state.error,
    };
}

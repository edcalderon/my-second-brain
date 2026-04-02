export type BalanceHistoryEntry = {
    time: string;
    total_value_usd: number | null;
    total_value_eth: number | null;
};

export type BalancePoint = {
    time: string;
    totalValueUsd: number;
    totalValueEth: number;
    source: "live" | "snapshot";
};

export function hasMeaningfulBalance(point: Pick<BalancePoint, "totalValueUsd" | "totalValueEth">) {
    return Math.abs(toFiniteNumber(point.totalValueUsd)) > 0 || Math.abs(toFiniteNumber(point.totalValueEth)) > 0;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function sortAndDedupe(points: BalancePoint[]): BalancePoint[] {
    const seen = new Map<string, BalancePoint>();

    for (const point of points) {
        if (!point.time) {
            continue;
        }

        seen.set(point.time, {
            ...point,
            totalValueUsd: toFiniteNumber(point.totalValueUsd),
            totalValueEth: toFiniteNumber(point.totalValueEth),
        });
    }

    const sorted = Array.from(seen.values()).sort((left, right) => Date.parse(left.time) - Date.parse(right.time));

    if (sorted.length === 1) {
        const [single] = sorted;
        return [
            single,
            {
                ...single,
                time: new Date(Date.parse(single.time) + 1).toISOString(),
            },
        ];
    }

    return sorted;
}

export function mapHistoryToBalancePoints(history: BalanceHistoryEntry[]): BalancePoint[] {
    return sortAndDedupe(
        history.map((snapshot) => ({
            time: snapshot.time,
            totalValueUsd: toFiniteNumber(snapshot.total_value_usd),
            totalValueEth: toFiniteNumber(snapshot.total_value_eth),
            source: "snapshot" as const,
        })),
    );
}

export function combineBalanceSeries(history: BalanceHistoryEntry[], liveSamples: BalancePoint[]): BalancePoint[] {
    return sortAndDedupe([
        ...mapHistoryToBalancePoints(history),
        ...liveSamples,
    ]);
}

export function appendBalanceSample(previous: BalancePoint[], sample: BalancePoint, limit = 36): BalancePoint[] {
    return sortAndDedupe([...previous.filter((point) => point.time !== sample.time), sample]).slice(-limit);
}

export function createLiveBalanceSample(snapshotTime: string | undefined, totalValueUsd: unknown, totalValueEth: unknown): BalancePoint | null {
    if (!snapshotTime) {
        return null;
    }

    return {
        time: snapshotTime,
        totalValueUsd: toFiniteNumber(totalValueUsd),
        totalValueEth: toFiniteNumber(totalValueEth),
        source: "live",
    };
}

export function summarizeBalanceSeries(points: BalancePoint[]) {
    if (!points.length) {
        return null;
    }

    const first = points[0];
    const latest = points[points.length - 1];
    const min = points.reduce((acc, point) => Math.min(acc, point.totalValueUsd), Number.POSITIVE_INFINITY);
    const max = points.reduce((acc, point) => Math.max(acc, point.totalValueUsd), Number.NEGATIVE_INFINITY);
    const delta = latest.totalValueUsd - first.totalValueUsd;
    const deltaPct = first.totalValueUsd > 0 ? (delta / first.totalValueUsd) * 100 : 0;

    return {
        first,
        latest,
        min,
        max,
        delta,
        deltaPct,
        changeIsPositive: delta > 0,
    };
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
    createChart, ColorType, CrosshairMode,
    createSeriesMarkers,
    type IChartApi, type ISeriesApi,
    type ISeriesMarkersPluginApi,
    CandlestickSeries, LineSeries, HistogramSeries,
    type Time, type CandlestickData, type HistogramData,
    type SeriesMarker,
} from "lightweight-charts";
import { getHummingbotApiBase } from "@/lib/hummingbot-config";
import { getHummingbotWsBase } from "@/lib/hummingbot-config";
import { LiveClient } from "@/lib/live-client";
import { authClient } from "@/components/auth/AuthProvider";

// ── Timeframe helpers ──────────────────────────────────────────────────

const TIMEFRAMES = [
    { label: "1m", value: "1" },
    { label: "3m", value: "3" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "30m", value: "30" },
    { label: "1h", value: "60" },
];

function intervalMs(interval: string): number {
    switch (interval) {
        case "1": return 60_000;
        case "3": return 180_000;
        case "5": return 300_000;
        case "15": return 900_000;
        case "30": return 1_800_000;
        case "60": return 3_600_000;
        default: return 300_000;
    }
}

function alignToInterval(date: Date, intervalStr: string): number {
    const ms = date.getTime();
    return Math.floor(ms / intervalMs(intervalStr)) * intervalMs(intervalStr);
}

function secondsUntilClose(nowMs: number, interval: string): number {
    const openMs = alignToInterval(new Date(nowMs), interval);
    const closeMs = openMs + intervalMs(interval);
    return Math.max(0, Math.ceil((closeMs - nowMs) / 1000));
}

function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Data types ─────────────────────────────────────────────────────────

type Kline = { time: number; open: number; high: number; low: number; close: number; volume: number };
type StrategyEvent = { type: string; event: string; journal_id?: string; symbol?: string; side?: string; entry_price?: number; exit_price?: number; close_reason?: string; dry_run?: boolean; [key: string]: unknown };

const CHART_HEIGHT = 420;
const VOLUME_HEIGHT = 80;

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<Kline[]> {
    const token = await authClient.getSessionToken();
    const resp = await fetch(
        `${getHummingbotApiBase()}/trading/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
        { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!resp.ok) throw new Error(`klines fetch failed: ${resp.status}`);
    const data = await resp.json();
    return (data.klines as Kline[]) ?? [];
}

// ── Open interest / liquidity badge ─────────────────────────────────────

type OpenInterestPoint = { ts: number; open_interest: number };

async function fetchOpenInterest(symbol: string, limit = 50): Promise<OpenInterestPoint[]> {
    const token = await authClient.getSessionToken();
    const resp = await fetch(
        `${getHummingbotApiBase()}/trading/open-interest?symbol=${encodeURIComponent(symbol)}&interval=5min&limit=${limit}`,
        { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!resp.ok) throw new Error(`open interest fetch failed: ${resp.status}`);
    const data = await resp.json();
    return (data.open_interest as OpenInterestPoint[]) ?? [];
}

const OI_REFRESH_MS = 30_000; // OI moves far slower than price -- no point polling as fast as klines/live ticks

/** Coarse liquidity-positioning read: rising OI = new money entering
 * (trend building), falling OI = positions unwinding/closing. */
function OpenInterestBadge({ symbol }: { symbol: string }) {
    const [points, setPoints] = useState<OpenInterestPoint[]>([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const oi = await fetchOpenInterest(symbol);
                if (!cancelled) { setPoints(oi); setError(false); }
            } catch {
                if (!cancelled) setError(true);
            }
        }
        load();
        const id = setInterval(load, OI_REFRESH_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, [symbol]);

    if (error || points.length < 2) return null;

    const latest = points[points.length - 1].open_interest;
    const first = points[0].open_interest;
    const pctChange = first > 0 ? ((latest - first) / first) * 100 : 0;
    const rising = pctChange > 0.05;
    const falling = pctChange < -0.05;
    const label = rising ? "Building" : falling ? "Unwinding" : "Flat";
    const color = rising
        ? "text-emerald-600 dark:text-emerald-400"
        : falling
        ? "text-rose-600 dark:text-rose-400"
        : "text-gray-500";

    return (
        <span className={`flex items-center gap-1.5 font-mono text-xs ${color}`} title="Open interest over the last ~4h -- a coarse liquidity/positioning read">
            <span className="uppercase tracking-wider text-[10px] text-gray-400">OI</span>
            {latest.toLocaleString(undefined, { maximumFractionDigits: 1, notation: "compact" })}
            <span>{rising ? "▲" : falling ? "▼" : "•"} {label}</span>
        </span>
    );
}

// ── Strategy overlay: EMA fast/slow ────────────────────────────────────
// Same periods the live strategy actually trades on -- see
// the backend preview defaults, which both backends share.
// Computed client-side from the same klines already on screen rather than
// a second backend round-trip -- a standard EMA over close prices needs no
// server-side indexing/state.
const EMA_FAST_PERIOD = 21;
const EMA_SLOW_PERIOD = 55;

function computeEma(values: number[], period: number): (number | null)[] {
    if (values.length < period) return values.map(() => null);
    const k = 2 / (period + 1);
    const out: (number | null)[] = new Array(values.length).fill(null);
    // Seed with a simple average of the first `period` closes, same as
    // pandas_ta's default EMA seeding.
    let seed = 0;
    for (let i = 0; i < period; i++) seed += values[i];
    seed /= period;
    out[period - 1] = seed;
    let prev = seed;
    for (let i = period; i < values.length; i++) {
        const next = values[i] * k + prev * (1 - k);
        out[i] = next;
        prev = next;
    }
    return out;
}

// ── Timeframe selector ─────────────────────────────────────────────────

function TimeframeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
            {TIMEFRAMES.map((tf) => (
                <button
                    key={tf.value}
                    type="button"
                    onClick={() => onChange(tf.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        value === tf.value
                            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                >
                    {tf.label}
                </button>
            ))}
        </div>
    );
}

// ── Countdown display ──────────────────────────────────────────────────

function CandleCountdown({ interval }: { interval: string }) {
    const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilClose(Date.now(), interval));

    useEffect(() => {
        const tick = () => setSecondsLeft(secondsUntilClose(Date.now(), interval));
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [interval]);

    // Reset immediately when interval changes
    useEffect(() => {
        setSecondsLeft(secondsUntilClose(Date.now(), interval));
    }, [interval]);

    const urgent = secondsLeft < 30;

    return (
        <span className={`font-mono text-xs tabular-nums ${urgent ? "text-amber-500 animate-pulse" : "text-gray-400"}`} title="time until candle closes">
            closes in {formatCountdown(secondsLeft)}
        </span>
    );
}

// ── Main chart ─────────────────────────────────────────────────────────

export function CandleChart({ symbol = "BTCUSDC", interval = "5", limit = 500 }: { symbol?: string; interval?: string; limit?: number }) {
    const containerId = `lc-chart-${useId().replace(/:/g, "")}`;
    const [tf, setTf] = useState(interval);

    return (
        <div className="glass-panel rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <TimeframeSelector value={tf} onChange={setTf} />
                    <CandleCountdown interval={tf} />
                </div>
                <OpenInterestBadge symbol={symbol} />
            </div>
            <CandleChartInner key={`${symbol}-${tf}-${limit}`} symbol={symbol} interval={tf} limit={limit} containerId={containerId} />
        </div>
    );
}

function CandleChartInner({ symbol, interval, limit, containerId }: { symbol: string; interval: string; limit: number; containerId: string }) {
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const liveLineRef = useRef<ISeriesApi<"Line"> | null>(null);
    const emaFastRef = useRef<ISeriesApi<"Line"> | null>(null);
    const emaSlowRef = useRef<ISeriesApi<"Line"> | null>(null);
    // EMA state as of the last fully-closed bar (seeded from the historical
    // calc below). Live ticks preview forward from this without mutating it
    // until the forming candle actually rolls over -- see the WS effect.
    const emaCommittedRef = useRef<{ fast: number | null; slow: number | null }>({ fast: null, slow: null });
    const emaFormingTimeRef = useRef<Time | null>(null);
    const emaPreviewRef = useRef<{ fast: number | null; slow: number | null }>({ fast: null, slow: null });
    const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const clientRef = useRef<LiveClient | null>(null);
    const [statusText, setStatusText] = useState("loading");
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    const markersRef = useRef<StrategyEvent[]>([]);
    const darkRef = useRef(false);

    // Dark-mode observer
    useEffect(() => {
        const check = () => document.documentElement.classList.contains("dark");
        darkRef.current = check();
        const obs = new MutationObserver(() => {
            darkRef.current = check();
            if (chartRef.current) {
                chartRef.current.applyOptions({
                    layout: {
                        background: { type: ColorType.Solid, color: darkRef.current ? "#0d1117" : "#ffffff" },
                        textColor: darkRef.current ? "#c9d1d9" : "#334155",
                    },
                });
            }
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
    }, []);

    // Chart creation + historical data
    useEffect(() => {
        let cancelled = false;
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "";
        const chart = createChart(container, {
            width: container.clientWidth,
            height: CHART_HEIGHT + VOLUME_HEIGHT + 16,
            layout: {
                background: { type: ColorType.Solid, color: darkRef.current ? "#0d1117" : "#ffffff" },
                textColor: darkRef.current ? "#c9d1d9" : "#334155",
                fontSize: 12,
            },
            grid: {
                vertLines: { color: darkRef.current ? "#21262d" : "#e2e8f0" },
                horzLines: { color: darkRef.current ? "#21262d" : "#e2e8f0" },
            },
            crosshair: { mode: CrosshairMode.Normal },
            timeScale: { timeVisible: true, secondsVisible: false },
            rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.25 } },
        });
        chartRef.current = chart;

        const candles = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e", downColor: "#ef4444",
            borderUpColor: "#22c55e", borderDownColor: "#ef4444",
            wickUpColor: "#22c55e", wickDownColor: "#ef4444",
        });
        candleSeriesRef.current = candles;

        // v5 markers plugin (replaces series.setMarkers)
        const markersApi = createSeriesMarkers<Time>(candles, []);
        markersApiRef.current = markersApi;

        const volume = chart.addSeries(HistogramSeries, {
            priceFormat: { type: "volume" },
            priceScaleId: "vol",
        });
        volumeSeriesRef.current = volume;
        chart.priceScale("vol").applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
        });

        const liveLine = chart.addSeries(LineSeries, {
            color: "#3b82f6", lineWidth: 1, lineStyle: 2,
            crosshairMarkerVisible: false, lastValueVisible: false,
            priceLineVisible: false,
        });
        liveLineRef.current = liveLine;

        // Strategy overlay -- the same EMA(21)/EMA(55) the live signal
        // engine crosses to decide LONG/SHORT (see the backend
        // preview builder). Shown so the chart reads the same trend the
        // strategy is actually reacting to, not a generic indicator.
        const emaFast = chart.addSeries(LineSeries, {
            color: "#f59e0b", lineWidth: 2, lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false, title: `EMA ${EMA_FAST_PERIOD}`,
        });
        emaFastRef.current = emaFast;

        const emaSlow = chart.addSeries(LineSeries, {
            color: "#8b5cf6", lineWidth: 2, lastValueVisible: false, priceLineVisible: false,
            crosshairMarkerVisible: false, title: `EMA ${EMA_SLOW_PERIOD}`,
        });
        emaSlowRef.current = emaSlow;

        const ro = new ResizeObserver(() => {
            chart.applyOptions({ width: container.clientWidth });
        });
        ro.observe(container);

        fetchKlines(symbol, interval, limit)
            .then((data) => {
                if (cancelled) return;
                const chartData: CandlestickData[] = data.map((k) => ({
                    time: k.time as Time, open: k.open, high: k.high,
                    low: k.low, close: k.close,
                }));
                candles.setData(chartData);

                const volData: HistogramData[] = data.map((k) => ({
                    time: k.time as Time,
                    value: k.volume,
                    color: k.close >= k.open
                        ? "rgba(34,197,94,0.35)"
                        : "rgba(239,68,68,0.35)",
                }));
                volume.setData(volData);

                const closes = data.map((k) => k.close);
                const fastValues = computeEma(closes, EMA_FAST_PERIOD);
                const slowValues = computeEma(closes, EMA_SLOW_PERIOD);
                emaFast.setData(
                    data
                        .map((k, i) => ({ time: k.time as Time, value: fastValues[i] }))
                        .filter((p): p is { time: Time; value: number } => p.value !== null),
                );
                emaSlow.setData(
                    data
                        .map((k, i) => ({ time: k.time as Time, value: slowValues[i] }))
                        .filter((p): p is { time: Time; value: number } => p.value !== null),
                );
                // Seed the live rolling window one bar back from the end --
                // the last fetched bar may still be forming, so its own EMA
                // point gets recomputed live from this committed base plus
                // streamed ticks, rather than double-applying the formula
                // once here and again on the first live tick.
                emaCommittedRef.current = {
                    fast: fastValues[fastValues.length - 2] ?? null,
                    slow: slowValues[slowValues.length - 2] ?? null,
                };
                emaFormingTimeRef.current = data.length > 0 ? (data[data.length - 1].time as Time) : null;

                if (data.length > 0) {
                    const last = data[data.length - 1];
                    liveLine.setData([{ time: last.time as Time, value: last.close }]);
                    setLastPrice(last.close);
                }
                setStatusText(`loaded ${data.length} bars`);
            })
            .catch((err) => {
                if (cancelled) return;
                setStatusText(`fetch error: ${err.message}`);
            });

        return () => {
            cancelled = true;
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
            liveLineRef.current = null;
            emaFastRef.current = null;
            emaSlowRef.current = null;
            emaFormingTimeRef.current = null;
            markersApiRef.current = null;
        };
    }, [containerId, symbol, interval, limit]);

    // WebSocket live feed
    useEffect(() => {
        if (!candleSeriesRef.current || !liveLineRef.current || !volumeSeriesRef.current || !markersApiRef.current) return;

        const client = new LiveClient(`${getHummingbotWsBase()}/ws/live`);
        clientRef.current = client;

        const candleMap = new Map<Time, CandlestickData>();
        const initialData = candleSeriesRef.current.data();
        if (Array.isArray(initialData)) {
            for (const bar of initialData) {
                candleMap.set(bar.time as Time, bar);
            }
        }

        client.on("connected", () => setStatusText("live connected"));
        client.on("price", (msg) => {
            const price = msg.price as number;
            const ts = msg.ts as number;
            setLastPrice(price);

            const seconds = Math.floor(ts);
            liveLineRef.current?.update({ time: seconds as Time, value: price });

            const now = new Date(ts * 1000);
            const candleTime = alignToInterval(now, interval) as Time;
            const existing = candleMap.get(candleTime);
            if (existing) {
                existing.close = price;
                if (price > existing.high) existing.high = price;
                if (price < existing.low) existing.low = price;
                candleSeriesRef.current?.update(existing);
            } else {
                const newBar: CandlestickData = {
                    time: candleTime, open: price, high: price, low: price, close: price,
                };
                candleMap.set(candleTime, newBar);
                candleSeriesRef.current?.update(newBar);
            }

            // Roll the forming bar over into `committed` the instant a new
            // bar starts -- the preview left on the just-closed bar becomes
            // its final EMA point, and the new bar starts previewing fresh
            // from it. Same fast/slow periods the strategy trades on.
            if (emaFormingTimeRef.current !== null && candleTime !== emaFormingTimeRef.current) {
                emaCommittedRef.current = { ...emaPreviewRef.current };
            }
            emaFormingTimeRef.current = candleTime;

            const kFast = 2 / (EMA_FAST_PERIOD + 1);
            const kSlow = 2 / (EMA_SLOW_PERIOD + 1);
            const { fast: committedFast, slow: committedSlow } = emaCommittedRef.current;
            const previewFast = committedFast === null ? null : price * kFast + committedFast * (1 - kFast);
            const previewSlow = committedSlow === null ? null : price * kSlow + committedSlow * (1 - kSlow);
            emaPreviewRef.current = { fast: previewFast, slow: previewSlow };
            if (previewFast !== null) emaFastRef.current?.update({ time: candleTime, value: previewFast });
            if (previewSlow !== null) emaSlowRef.current?.update({ time: candleTime, value: previewSlow });
        });

        client.on("strategy_event", (msg) => {
            const evt = msg as unknown as StrategyEvent;
            markersRef.current = [...markersRef.current, evt];
            rebuildMarkers();
        });

        client.connect();

        return () => {
            client.disconnect();
            clientRef.current = null;
        };
    }, [symbol, interval]);

    function rebuildMarkers() {
        if (!markersApiRef.current) return;
        const markers: SeriesMarker<Time>[] = markersRef.current
            .filter((evt) => evt.event === "entered" || evt.event === "exited")
            .map((evt) => {
                const evtPrice = evt.event === "entered" ? evt.entry_price : evt.exit_price;
                const t = evtPrice ? findNearestCandleTime(evtPrice) : null;
                const color = evt.event === "entered" ? (evt.side === "long" ? "#22c55e" : "#ef4444") : "#94a3b8";
                const text = evt.event === "entered"
                    ? `${evt.side?.toUpperCase() ?? "ENTER"}${evt.dry_run ? " (dry)" : ""}`
                    : `EXIT (${evt.close_reason ?? "closed"})`;
                return {
                    time: (t ?? Math.floor(Date.now() / 1000)) as Time,
                    position: evt.event === "entered" ? "belowBar" : "aboveBar",
                    color,
                    shape: evt.event === "entered" ? "arrowUp" : "arrowDown",
                    text,
                };
            });
        markersApiRef.current.setMarkers(markers);
    }

    function findNearestCandleTime(price: number): number | null {
        const data = candleSeriesRef.current?.data();
        if (!data || !Array.isArray(data)) return null;
        const recent = [...data].sort((a, b) => (a.time as number) - (b.time as number)).slice(-20);
        let best: CandlestickData | null = null;
        let bestDist = Infinity;
        for (const bar of recent) {
            const dist = Math.abs(bar.close - price);
            if (dist < bestDist) { bestDist = dist; best = bar; }
        }
        return best ? (best.time as number) : null;
    }

    // Derive display symbol from the raw symbol (BTCUSDC → BTC/USDC)
    const displaySymbol = symbol.replace("USDC", "/USDC").replace("USDT", "/USDT");

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {displaySymbol}
                        {lastPrice && (
                            <span className="ml-2 font-mono text-sm text-emerald-600 dark:text-emerald-400">
                                ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-gray-500">
                        {TIMEFRAMES.find((t) => t.value === interval)?.label ?? `${interval}m`} candles · {statusText}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                        <span className="inline-block h-0.5 w-3 rounded-full bg-[#f59e0b]" />
                        EMA {EMA_FAST_PERIOD}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                        <span className="inline-block h-0.5 w-3 rounded-full bg-[#8b5cf6]" />
                        EMA {EMA_SLOW_PERIOD}
                    </span>
                    <span
                        className={`inline-block h-2 w-2 rounded-full ${
                            statusText.includes("live") ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                    />
                    <span className="text-gray-500">{statusText}</span>
                </div>
            </div>
            <div id={containerId} style={{ height: CHART_HEIGHT + VOLUME_HEIGHT + 16 }} />
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
    AlertTriangle,
    ArrowDownUp,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Loader2,
    Trash2,
    Zap,
} from "lucide-react";
import {
    type JournalEntry,
    type HummingbotPreview,
    type SetupFreshness,
    previewTrade,
    toHummingbotPair,
} from "@/lib/hummingbot-api";
import { JournalMarkdown } from "@/components/journal/JournalMarkdown";
import { computeRiskPrices, evaluateSetupFreshness, parseRiskTags, type FreshnessResult } from "@/lib/setup-freshness";
import { formatNumber } from "@/lib/hummingbot-format";

const DEFAULT_PAIR = "BTCUSDT";
const DEFAULT_INTERVAL = "1h";
const DEFAULT_FAST_EMA = 21;
const DEFAULT_SLOW_EMA = 55;
const DEFAULT_RSI = 14;

const SCENARIO_COLORS = [
    "bg-sky-50 text-sky-700 border-sky-200",
    "bg-violet-50 text-violet-700 border-violet-200",
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-pink-50 text-pink-700 border-pink-200",
    "bg-cyan-50 text-cyan-700 border-cyan-200",
    "bg-lime-50 text-lime-700 border-lime-200",
];

function scenarioColorClass(label: string): string {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    }
    return SCENARIO_COLORS[hash % SCENARIO_COLORS.length];
}

const FRESHNESS_DOT: Record<SetupFreshness, string> = {
    aligned: "bg-emerald-500",
    drifted: "bg-amber-500",
    flipped: "bg-red-500",
    unknown: "bg-gray-400",
};

const FRESHNESS_BANNER: Record<SetupFreshness, string> = {
    aligned: "border-emerald-200 bg-emerald-50 text-emerald-800",
    drifted: "border-amber-200 bg-amber-50 text-amber-800",
    flipped: "border-red-200 bg-red-50 text-red-800",
    unknown: "border-gray-300 bg-gray-50 text-gray-600",
};

type ActiveSetupsTabProps = {
    setups: JournalEntry[];
    loading: boolean;
    globalPreview: HummingbotPreview | null;
    onTrigger: (setup: JournalEntry, freshness: FreshnessResult) => Promise<void>;
    onDiscard: (setupId: string) => void;
};

export function ActiveSetupsTab({
    setups,
    loading,
    globalPreview,
    onTrigger,
    onDiscard,
}: ActiveSetupsTabProps) {
    const [expandedSetup, setExpandedSetup] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Loading active setups...</p>
            </div>
        );
    }

    if (!setups.length) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">No active setups. Create one in the Setup Builder tab.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {setups.map((setup) => (
                <SetupCard
                    key={setup.id}
                    setup={setup}
                    globalPreview={globalPreview}
                    isExpanded={expandedSetup === setup.id}
                    onToggle={() => setExpandedSetup((prev) => (prev === setup.id ? null : setup.id))}
                    onTrigger={(freshness) => onTrigger(setup, freshness)}
                    onDiscard={() => onDiscard(setup.id)}
                />
            ))}
        </div>
    );
}

function SetupCard({
    setup,
    globalPreview,
    isExpanded,
    onToggle,
    onTrigger,
    onDiscard,
}: {
    setup: JournalEntry;
    globalPreview: HummingbotPreview | null;
    isExpanded: boolean;
    onToggle: () => void;
    onTrigger: (freshness: FreshnessResult) => Promise<void>;
    onDiscard: () => void;
}) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [triggerError, setTriggerError] = useState<string | null>(null);
    const [cardPreview, setCardPreview] = useState<HummingbotPreview | null>(null);

    useEffect(() => {
        if (!isExpanded) return;
        const instrument = setup.instrument || DEFAULT_PAIR;
        const tradingPair = toHummingbotPair(instrument);
        previewTrade({
            trading_pair: tradingPair,
            interval: DEFAULT_INTERVAL,
            fast_ema: DEFAULT_FAST_EMA,
            slow_ema: DEFAULT_SLOW_EMA,
            rsi_period: DEFAULT_RSI,
        })
            .then(setCardPreview)
            .catch(() => setCardPreview(null));
    }, [isExpanded, setup.instrument]);

    const activePreview = cardPreview ?? globalPreview;
    const freshness = evaluateSetupFreshness(setup, activePreview);
    const referencePrice = activePreview?.latest_close ?? setup.market_snapshot?.latest_close ?? setup.entry_price ?? null;
    const risk = parseRiskTags(setup.tags);
    const { stopLossPrice, takeProfitPrice } = computeRiskPrices(setup.side, referencePrice, risk);
    const notional =
        referencePrice != null && setup.size != null && setup.leverage != null
            ? referencePrice * setup.size * setup.leverage
            : null;

    async function handleConfirm() {
        setBusy(true);
        setTriggerError(null);
        try {
            await onTrigger(freshness);
            setShowConfirm(false);
        } catch (err) {
            setTriggerError(err instanceof Error ? err.message : "Failed to trigger setup");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
                <div className="flex items-center gap-3">
                    <span
                        title={freshness.reason}
                        className={`h-2 w-2 shrink-0 rounded-full ${FRESHNESS_DOT[freshness.status]}`}
                    />
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            setup.side === "long"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                        }`}
                    >
                        {setup.side === "long" ? (
                            <ArrowDownUp className="h-3 w-3 rotate-180" />
                        ) : (
                            <ArrowDownUp className="h-3 w-3" />
                        )}
                        {setup.side.toUpperCase()}
                    </span>
                    {setup.scenario_label && (
                        <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${scenarioColorClass(
                                setup.scenario_label
                            )}`}
                        >
                            {setup.scenario_label}
                        </span>
                    )}
                    <span className="text-sm font-medium text-gray-900">{setup.title}</span>
                    <span className="text-xs text-gray-400">#{setup.trade_number}</span>
                    {setup.reasoning && (
                        <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {setup.reasoning.slice(0, 60)}...
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                />
            </button>

            {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-3">
                    {setup.reasoning && (
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Reasoning</p>
                            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 max-h-48 overflow-y-auto">
                                <JournalMarkdown>{setup.reasoning}</JournalMarkdown>
                            </div>
                        </div>
                    )}
                    {setup.thesis && (
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Thesis</p>
                            <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 max-h-48 overflow-y-auto">
                                <JournalMarkdown>{setup.thesis}</JournalMarkdown>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Instrument: {setup.instrument}</span>
                        {setup.leverage && <span>· Leverage: {setup.leverage}x</span>}
                        {setup.opened_at && (
                            <span>· {new Date(setup.opened_at).toLocaleString()}</span>
                        )}
                    </div>

                    {!showConfirm && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                            >
                                <Zap className="h-3 w-3" />
                                Trigger Setup
                            </button>
                            <button
                                type="button"
                                onClick={onDiscard}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-600"
                            >
                                <Trash2 className="h-3 w-3" />
                                Discard
                            </button>
                        </div>
                    )}

                    {showConfirm && (
                        <div className="space-y-3 rounded-xl border border-border bg-gray-50 p-4">
                            <div
                                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${FRESHNESS_BANNER[freshness.status]}`}
                            >
                                {freshness.status === "aligned" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                ) : freshness.status === "unknown" ? (
                                    <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                )}
                                <span>
                                    {freshness.status === "aligned"
                                        ? "Conditions still align with this setup."
                                        : freshness.status === "unknown"
                                          ? freshness.reason
                                          : `Market has moved — ${freshness.reason} Proceed anyway?`}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-white border border-border px-3 py-3 text-xs text-gray-700 sm:grid-cols-3">
                                <div>
                                    <span className="text-gray-400">Instrument</span>
                                    <br />
                                    {setup.instrument}
                                </div>
                                <div>
                                    <span className="text-gray-400">Side</span>
                                    <br />
                                    {setup.side.toUpperCase()}
                                </div>
                                <div>
                                    <span className="text-gray-400">Size</span>
                                    <br />
                                    {setup.size ?? "—"}
                                </div>
                                <div>
                                    <span className="text-gray-400">Leverage</span>
                                    <br />
                                    {setup.leverage ?? "—"}x
                                </div>
                                <div>
                                    <span className="text-gray-400">Notional</span>
                                    <br />
                                    {notional != null ? `$${formatNumber(notional, 2)}` : "—"}
                                </div>
                                <div>
                                    <span className="text-gray-400">Ref. price</span>
                                    <br />
                                    {referencePrice != null ? `$${formatNumber(referencePrice, 2)}` : "—"}
                                </div>
                                <div>
                                    <span className="text-gray-400">Stop-loss</span>
                                    <br />
                                    {stopLossPrice != null ? `$${formatNumber(stopLossPrice, 2)}` : "—"}
                                </div>
                                <div>
                                    <span className="text-gray-400">Target</span>
                                    <br />
                                    {takeProfitPrice != null ? `$${formatNumber(takeProfitPrice, 2)}` : "—"}
                                </div>
                            </div>

                            {triggerError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                    {triggerError}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                    {busy ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Zap className="h-3 w-3" />
                                    )}
                                    {busy ? "Placing order..." : "Confirm — place live order"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowConfirm(false);
                                        setTriggerError(null);
                                    }}
                                    disabled={busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

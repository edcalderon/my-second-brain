"use client";

import { useEffect, useState } from "react";
import {
    type AgentStatusResponse,
    type HummingbotPosition,
    type HummingbotPreview,
    type HummingbotStatus,
    type JournalEntry,
    type JournalEntryCreate,
    type JournalPromoteRequest,
    type StrategyState,
    createJournalEntry,
    fetchAgentStatus,
    fetchJournalEntries,
    fetchStrategyStatus,
    fetchTradingPositions,
    fetchTradingStatus,
    getTradingErrorPayload,
    previewTrade,
    promoteJournalEntry,
    submitTradeOpen,
    updateJournalEntry,
    aiSetupSuggest,
    toHummingbotPair,
    buildTradingOutageNotice,
} from "@/lib/hummingbot-api";
import { TradingOutageBanner } from "@/components/trading/TradingOutageBanner";
import { JournalMarkdown } from "@/components/journal/JournalMarkdown";
import { computeRiskPrices, evaluateSetupFreshness, parseRiskTags, type FreshnessResult } from "@/lib/setup-freshness";

// Tab components
import { StrategyTabs, type StrategyTab } from "@/components/strategy/StrategyTabs";
import { MarketDataTab } from "@/components/strategy/MarketDataTab";
import { SetupBuilderTab } from "@/components/strategy/SetupBuilderTab";
import { ActiveSetupsTab } from "@/components/strategy/ActiveSetupsTab";
import { AgentActivityTab } from "@/components/strategy/AgentActivityTab";
import { PositionsTab } from "@/components/strategy/PositionsTab";

const SCENARIO_PRESETS = ["Oversold bounce", "Breakdown continuation", "Range fade", "Breakout"];

const SUPPORTED_INSTRUMENTS = ["BTCUSDT", "ETHUSDT"] as const;
const DEFAULT_PAIR = "BTCUSDT";
const DEFAULT_INTERVAL = "1h";
const DEFAULT_FAST_EMA = 21;
const DEFAULT_SLOW_EMA = 55;
const DEFAULT_RSI = 14;
const DEFAULT_AMOUNT = 0.01;
const DEFAULT_LEVERAGE = 3;
const DEFAULT_STOP_LOSS = 0.02;
const DEFAULT_TP1 = 0.03;
const DEFAULT_TP2 = 0.06;

// Best-effort: /trading/open's response shape varies with the Hummingbot
// connector's fill report. Checks the common key names rather than assuming
// one -- returns null (no reconciliation) if none match, which is safe.
function extractFillPrice(result: unknown): number | null {
    if (!result || typeof result !== "object") return null;
    const order = (result as Record<string, unknown>).order ?? result;
    if (!order || typeof order !== "object") return null;
    for (const key of ["average_price", "fill_price", "avg_price", "price", "entry_price"]) {
        const value = (order as Record<string, unknown>)[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
            return Number(value);
    }
    return null;
}

export default function StrategyPage() {
    // Tab state
    const [activeTab, setActiveTab] = useState<StrategyTab>("market");

    // Market data
    const [status, setStatus] = useState<HummingbotStatus | null>(null);
    const [preview, setPreview] = useState<HummingbotPreview | null>(null);
    const [positions, setPositions] = useState<HummingbotPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<unknown>(null);

    // Setup builder state
    const [setupTitle, setSetupTitle] = useState("");
    const [setupSide, setSetupSide] = useState<"long" | "short" | "neutral">("long");
    const [setupInstrument, setSetupInstrument] = useState(DEFAULT_PAIR);
    const [setupScenario, setSetupScenario] = useState("");
    const [setupReasoning, setSetupReasoning] = useState("");
    const [setupThesis, setSetupThesis] = useState("");
    const [setupRiskPlan, setSetupRiskPlan] = useState("");
    const [setupAmount, setSetupAmount] = useState(DEFAULT_AMOUNT);
    const [setupLeverage, setSetupLeverage] = useState(DEFAULT_LEVERAGE);
    const [setupStopLoss, setSetupStopLoss] = useState(DEFAULT_STOP_LOSS);
    const [setupTP1, setSetupTP1] = useState(DEFAULT_TP1);
    const [setupTP2, setSetupTP2] = useState(DEFAULT_TP2);
    const [setupBusy, setSetupBusy] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [aiSuggestBusy, setAiSuggestBusy] = useState(false);
    const [aiSuggestError, setAiSuggestError] = useState<string | null>(null);
    const [aiConfirmOpen, setAiConfirmOpen] = useState(false);
    const [aiLetAllDecide, setAiLetAllDecide] = useState(false);

    // Active setups
    const [activeSetups, setActiveSetups] = useState<JournalEntry[]>([]);
    const [setupsLoading, setSetupsLoading] = useState(false);

    // Cadence
    const [todayTrades, setTodayTrades] = useState(0);
    const [targetTrades, setTargetTrades] = useState(3);

    // Agent activity
    const [agentStatus, setAgentStatus] = useState<AgentStatusResponse | null>(null);
    const [strategyState, setStrategyState] = useState<StrategyState | null>(null);
    const [agentsLoading, setAgentsLoading] = useState(true);

    // Strategy config
    const [fastEma, setFastEma] = useState(DEFAULT_FAST_EMA);
    const [slowEma, setSlowEma] = useState(DEFAULT_SLOW_EMA);
    const [rsiPeriod, setRsiPeriod] = useState(DEFAULT_RSI);

    // Refresh
    const [refreshCounter, setRefreshCounter] = useState(0);

    async function loadWorkspace() {
        setRefreshing(true);
        const failures: unknown[] = [];
        const statusResult = await fetchTradingStatus().catch((err) => {
            failures.push(err);
            return getTradingErrorPayload<HummingbotStatus>(err);
        });

        const nextStatus = statusResult || null;
        if (nextStatus) {
            setStatus(nextStatus);
        }

        const [previewResult, positionsResult] = await Promise.allSettled([
            previewTrade({
                trading_pair: toHummingbotPair(DEFAULT_PAIR),
                interval: DEFAULT_INTERVAL,
                fast_ema: fastEma,
                slow_ema: slowEma,
                rsi_period: rsiPeriod,
            }),
            fetchTradingPositions(),
        ]);

        if (previewResult.status === "fulfilled") {
            setPreview(previewResult.value);
        } else {
            failures.push(previewResult.reason);
        }

        if (positionsResult.status === "fulfilled") {
            setPositions(positionsResult.value.positions ?? []);
        } else {
            failures.push(positionsResult.reason);
        }

        setError(failures.length ? failures[0] : null);
        setLoading(false);
        setRefreshing(false);
    }

    async function loadActiveSetups() {
        setSetupsLoading(true);
        try {
            const result = await fetchJournalEntries({
                entry_type: "setup",
                status: "open",
                limit: 20,
            });
            setActiveSetups(result.entries);
        } catch {
            // Silently ignore — setups are secondary
        } finally {
            setSetupsLoading(false);
        }
    }

    async function loadTodayTrades() {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const result = await fetchJournalEntries({
                entry_type: "trade",
                status: "open",
                limit: 50,
            });
            // Count trades opened today
            const todayCount = result.entries.filter((e) => e.opened_at?.startsWith(today)).length;
            setTodayTrades(todayCount);
        } catch {
            // Ignore
        }
    }

    async function loadAgentActivity() {
        const [agentsResult, strategyResult] = await Promise.allSettled([
            fetchAgentStatus(),
            fetchStrategyStatus(),
        ]);
        setAgentsLoading(false);
        if (agentsResult.status === "fulfilled") setAgentStatus(agentsResult.value);
        if (strategyResult.status === "fulfilled") setStrategyState(strategyResult.value);
    }

    useEffect(() => {
        let isMounted = true;

        async function loadAll() {
            await Promise.all([loadWorkspace(), loadActiveSetups(), loadTodayTrades()]);
        }

        loadAll();
        const intervalId = setInterval(loadAll, 30000); // Refresh every 30s
        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [fastEma, slowEma, rsiPeriod, refreshCounter]);

    useEffect(() => {
        loadAgentActivity();
        const intervalId = setInterval(loadAgentActivity, 20000); // Refresh every 20s
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    function showAiConfirm() {
        setAiConfirmOpen(true);
        setAiLetAllDecide(false);
    }

    async function executeAiSuggest() {
        setAiConfirmOpen(false);
        setAiSuggestBusy(true);
        setAiSuggestError(null);
        try {
            const result = await aiSetupSuggest({
                instruments: aiLetAllDecide ? undefined : [...SUPPORTED_INSTRUMENTS],
                interval: aiLetAllDecide ? undefined : DEFAULT_INTERVAL,
                limit: aiLetAllDecide ? undefined : 120,
                fast_ema: aiLetAllDecide ? undefined : fastEma,
                slow_ema: aiLetAllDecide ? undefined : slowEma,
                rsi_period: aiLetAllDecide ? undefined : rsiPeriod,
                side_preference: aiLetAllDecide ? "neutral" : setupSide,
            });
            // Populate the form with the AI suggestion
            setSetupInstrument(result.instrument);
            setSetupSide(result.side);
            setSetupTitle(result.title);
            setSetupReasoning(result.reasoning);
            setSetupThesis(result.thesis);
            setSetupRiskPlan(result.risk_plan);
            setSetupStopLoss(result.stop_loss_pct);
            setSetupTP1(result.tp1_pct);
            setSetupTP2(result.tp2_pct);
        } catch (err) {
            setAiSuggestError(err instanceof Error ? err.message : "AI analysis failed");
        } finally {
            setAiSuggestBusy(false);
        }
    }

    async function handleSaveSetup(mode: "setup" | "trade") {
        setSetupBusy(mode);
        setSetupError(null);
        try {
            const resolvedSide = setupSide === "neutral" ? "long" : setupSide;
            const payload: JournalEntryCreate = {
                title: setupTitle || `${resolvedSide.toUpperCase()} ${setupInstrument} setup`,
                instrument: setupInstrument,
                side: resolvedSide,
                status: "open",
                source: "manual",
                reasoning: setupReasoning || undefined,
                thesis: setupThesis || undefined,
                risk_plan: setupRiskPlan || undefined,
                entry_type: mode === "trade" ? "trade" : "setup",
                scenario_label: setupScenario || undefined,
                // Snapshot the market read this setup was written against
                market_snapshot: preview
                    ? {
                          latest_close: preview.latest_close ?? null,
                          rsi: preview.rsi ?? null,
                          ema_fast: preview.ema_fast ?? null,
                          ema_slow: preview.ema_slow ?? null,
                          signal: preview.signal ?? null,
                      }
                    : undefined,
            };

            // Size/leverage/risk are persisted for setups too
            payload.size = setupAmount;
            payload.leverage = setupLeverage;
            payload.tags = [
                `stop:${(setupStopLoss * 100).toFixed(1)}%`,
                `tp1:${(setupTP1 * 100).toFixed(1)}%`,
                `tp2:${(setupTP2 * 100).toFixed(1)}%`,
            ];
            if (mode === "trade") {
                payload.entry_price = preview?.latest_close ?? undefined;
            }

            await createJournalEntry(payload);

            // Reset the form
            setSetupTitle("");
            setSetupScenario("");
            setSetupReasoning("");
            setSetupThesis("");
            setSetupRiskPlan("");
            setRefreshCounter((v) => v + 1);
            loadActiveSetups();
            loadTodayTrades();
        } catch (err) {
            setSetupError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSetupBusy(null);
        }
    }

    async function handleTriggerSetup(setup: JournalEntry, freshness: FreshnessResult) {
        const referencePrice =
            preview?.latest_close ?? setup.market_snapshot?.latest_close ?? setup.entry_price ?? null;
        const risk = parseRiskTags(setup.tags);
        const { stopLossPrice, takeProfitPrice } = computeRiskPrices(setup.side, referencePrice, risk);

        const promoteReq: JournalPromoteRequest = {
            entry_price: referencePrice ?? undefined,
            size: setup.size ?? undefined,
            leverage: setup.leverage ?? undefined,
            scenario_label: setup.scenario_label ?? undefined,
            stop_loss_price: stopLossPrice ?? undefined,
            take_profit_price: takeProfitPrice ?? undefined,
            freshness_status: freshness.status,
            freshness_reason: freshness.reason,
        };

        // Promote first
        const { trade } = await promoteJournalEntry(setup.id, promoteReq);

        try {
            const { result } = await submitTradeOpen({
                trading_pair: toHummingbotPair(setup.instrument),
                side: setup.side === "long" ? "BUY" : "SELL",
                amount: setup.size ?? DEFAULT_AMOUNT,
                leverage: setup.leverage ?? DEFAULT_LEVERAGE,
                stop_loss_pct: risk.stopLossPct ?? DEFAULT_STOP_LOSS,
                take_profit_1_pct: risk.tp1Pct ?? DEFAULT_TP1,
                take_profit_2_pct: risk.tp2Pct ?? DEFAULT_TP2,
                client_request_id: crypto.randomUUID(),
            });

            // Reconcile with the real fill price if it differs
            const fillPrice = extractFillPrice(result);
            if (fillPrice != null && fillPrice !== referencePrice) {
                await updateJournalEntry(trade.id, { entry_price: fillPrice });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Order failed";
            await updateJournalEntry(trade.id, {
                status: "closed",
                tags: [...(trade.tags ?? []), "failed"],
                outcome: message,
            }).catch(() => {
                // Best-effort cleanup only
            });
            throw err;
        } finally {
            setRefreshCounter((v) => v + 1);
            loadActiveSetups();
            loadTodayTrades();
        }
    }

    async function handleDiscardSetup(setupId: string) {
        try {
            const existing = activeSetups.find((s) => s.id === setupId);
            const oldTags = existing?.tags ?? [];
            const tags = oldTags.includes("discarded") ? oldTags : [...oldTags, "discarded"];
            await updateJournalEntry(setupId, {
                status: "closed",
                tags,
            });
            setActiveSetups((prev) => prev.filter((s) => s.id !== setupId));
        } catch {
            // Ignore
        }
    }

    const outageNotice = buildTradingOutageNotice({
        status: status?.service_health ?? preview?.service_health ?? null,
        error,
        endpoint: "/trading/status",
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Strategy Desk</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Strategy Desk</h1>
                        <p className="text-sm text-gray-600">
                            Write your reasoning, log setups, and open trades — every decision tracked.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                            {preview?.signal || "HOLD"}
                        </span>
                        <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                            {DEFAULT_PAIR}
                        </span>
                        {status?.live_trading_enabled !== undefined && (
                            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                                {status.live_trading_enabled ? "Live" : "Dry-run"}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <TradingOutageBanner notice={outageNotice} />

            <StrategyTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                setupCount={activeSetups.length}
                positionCount={positions.length}
            >
                {activeTab === "market" && (
                    <MarketDataTab preview={preview} loading={loading} onRefresh={() => setRefreshCounter((v) => v + 1)} />
                )}

                {activeTab === "builder" && (
                    <SetupBuilderTab
                        onSaveSetup={handleSaveSetup}
                        onAiSuggest={executeAiSuggest}
                        aiSuggestBusy={aiSuggestBusy}
                        aiSuggestError={aiSuggestError}
                        setupError={setupError}
                        setupTitle={setupTitle}
                        setupSide={setupSide}
                        setupInstrument={setupInstrument}
                        setupScenario={setupScenario}
                        setupReasoning={setupReasoning}
                        setupNotes={setupRiskPlan}
                        setSetupTitle={setSetupTitle}
                        setSetupSide={setSetupSide}
                        setSetupInstrument={setSetupInstrument}
                        setSetupScenario={setSetupScenario}
                        setSetupReasoning={setSetupReasoning}
                        setSetupNotes={setSetupRiskPlan}
                    />
                )}

                {activeTab === "setups" && (
                    <ActiveSetupsTab
                        setups={activeSetups}
                        loading={setupsLoading}
                        globalPreview={preview}
                        onTrigger={handleTriggerSetup}
                        onDiscard={handleDiscardSetup}
                    />
                )}

                {activeTab === "activity" && (
                    <AgentActivityTab
                        agentStatus={agentStatus}
                        strategyState={strategyState}
                        loading={agentsLoading}
                    />
                )}

                {activeTab === "cadence" && (
                    <PositionsTab
                        positions={positions}
                        todayTrades={todayTrades}
                        targetTrades={targetTrades}
                        onTargetChange={setTargetTrades}
                        activeSetupsCount={activeSetups.length}
                    />
                )}

                {activeTab === "positions" && (
                    <PositionsTab
                        positions={positions}
                        todayTrades={todayTrades}
                        targetTrades={targetTrades}
                        onTargetChange={setTargetTrades}
                        activeSetupsCount={activeSetups.length}
                    />
                )}
            </StrategyTabs>
        </div>
    );
}

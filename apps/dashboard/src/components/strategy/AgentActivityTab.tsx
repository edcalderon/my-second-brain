"use client";

import { Loader2 } from "lucide-react";
import { type AgentStatusResponse, type StrategyState } from "@/lib/hummingbot-api";
import { AgentStatusChip } from "@/components/shared/AgentStatusChip";

type AgentActivityTabProps = {
    agentStatus: AgentStatusResponse | null;
    strategyState: StrategyState | null;
    loading: boolean;
};

const STATIC_AGENT_LABELS: { key: string; label: string }[] = [
    { key: "thesis_monitor", label: "Thesis Monitor" },
    { key: "risk_guard", label: "Risk Guard" },
];

const POSITION_DEFENDER_PREFIX = "position_defender:";
const STRATEGY_RUNNER_PREFIX = "strategy_runner:";

function positionDefenderLabel(key: string): string {
    const symbol = key.slice(POSITION_DEFENDER_PREFIX.length).split(":")[0];
    return symbol ? `Position Defender (${symbol})` : "Position Defender";
}

function strategyRunnerLabel(key: string): string {
    const stateId = key.slice(STRATEGY_RUNNER_PREFIX.length);
    return stateId ? `Strategy Runner (${stateId})` : "Strategy Runner";
}

export function AgentActivityTab({
    agentStatus,
    strategyState,
    loading,
}: AgentActivityTabProps) {
    if (loading || !agentStatus) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Loading agent activity...</p>
            </div>
        );
    }

    // Collect dynamic keys for position defenders and strategy runners.
    const defenderKeys = Object.keys(agentStatus)
        .filter((key) => key.startsWith(POSITION_DEFENDER_PREFIX))
        .sort();
    const runnerKeys = Object.keys(agentStatus)
        .filter((key) => key.startsWith(STRATEGY_RUNNER_PREFIX))
        .sort();

    return (
        <div className="space-y-6">
            {/* Agent Status Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STATIC_AGENT_LABELS.map(({ key, label }) => (
                    <AgentStatusChip
                        key={key}
                        label={label}
                        entry={agentStatus[key] ?? null}
                    />
                ))}
                {/* Per-instance strategy runner cards (btc_default, demo rows, ...) */}
                {runnerKeys.map((key) => (
                    <AgentStatusChip
                        key={key}
                        label={strategyRunnerLabel(key)}
                        entry={agentStatus[key] ?? null}
                        detailOverride={
                            key === "strategy_runner:btc_default"
                                ? strategyState?.last_reason ?? null
                                : null
                        }
                    />
                ))}
                {/* Per-instance position defender cards */}
                {defenderKeys.map((key) => (
                    <AgentStatusChip
                        key={key}
                        label={positionDefenderLabel(key)}
                        entry={agentStatus[key] ?? null}
                    />
                ))}
                {/* Fallbacks when no dynamic instances are registered yet */}
                {runnerKeys.length === 0 && (
                    <AgentStatusChip
                        label="Strategy Runner"
                        entry={null}
                        detailOverride="No strategy runner registered."
                    />
                )}
                {defenderKeys.length === 0 && (
                    <AgentStatusChip
                        label="Position Defender"
                        entry={null}
                        detailOverride="No position currently being defended."
                    />
                )}
            </div>

            {/* Strategy State Details (btc_default singleton — legacy detail view) */}
            {strategyState && (
                <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">Strategy Runner State — btc_default</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                {strategyState.phase}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Last Update</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {strategyState.updated_at
                                    ? new Date(strategyState.updated_at).toLocaleString()
                                    : "—"}
                            </p>
                        </div>
                        {strategyState.current_journal_id && (
                            <div className="rounded-lg border border-border bg-white px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Active Trade</p>
                                <p className="mt-1 text-sm text-gray-900">#{strategyState.current_journal_id}</p>
                            </div>
                        )}
                    </div>
                    {strategyState.last_reason && (
                        <div className="rounded-lg border border-border bg-white px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Last Reason</p>
                            <p className="text-sm text-gray-700">{strategyState.last_reason}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

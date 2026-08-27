"use client";

import { useState } from "react";
import { Zap, Loader2, Lightbulb } from "lucide-react";
import type { JournalEntry } from "@/lib/hummingbot-api";

type SetupBuilderTabProps = {
    onSaveSetup: (mode: "setup" | "trade") => Promise<void>;
    onAiSuggest: () => Promise<void>;
    aiSuggestBusy: boolean;
    aiSuggestError: string | null;
    setupError: string | null;
    // Form state
    setupTitle: string;
    setupSide: "long" | "short" | "neutral";
    setupInstrument: string;
    setupScenario: string;
    setupReasoning: string;
    setupNotes: string;
    // Form setters
    setSetupTitle: (v: string) => void;
    setSetupSide: (v: "long" | "short" | "neutral") => void;
    setSetupInstrument: (v: string) => void;
    setSetupScenario: (v: string) => void;
    setSetupReasoning: (v: string) => void;
    setSetupNotes: (v: string) => void;
};

const SCENARIO_PRESETS = [
    "Oversold bounce",
    "Breakdown continuation",
    "Range fade",
    "Breakout",
];

export function SetupBuilderTab({
    onSaveSetup,
    onAiSuggest,
    aiSuggestBusy,
    aiSuggestError,
    setupError,
    // Form state
    setupTitle,
    setupSide,
    setupInstrument,
    setupScenario,
    setupReasoning,
    setupNotes,
    // Setters
    setSetupTitle,
    setSetupSide,
    setSetupInstrument,
    setSetupScenario,
    setSetupReasoning,
    setSetupNotes,
}: SetupBuilderTabProps) {
    const [saving, setSaving] = useState(false);

    async function handleSave(mode: "setup" | "trade") {
        setSaving(true);
        try {
            await onSaveSetup(mode);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* AI Auto-Setup Button */}
            <section className="glass-panel rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Trade Setup Builder</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Write your reasoning or let AI analyze the market for you.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onAiSuggest}
                            disabled={aiSuggestBusy}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Analyze current market data and auto-fill the setup form"
                        >
                            {aiSuggestBusy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing…
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    AI Auto-Setup
                                </>
                            )}
                        </button>
                        <Lightbulb className="h-5 w-5 text-emerald-700" />
                    </div>
                </div>

                {aiSuggestError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                        {aiSuggestError}
                    </div>
                )}

                {setupError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {setupError}
                    </div>
                )}

                {/* Form Fields */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Title">
                        <input
                            value={setupTitle}
                            onChange={(e) => setSetupTitle(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                            placeholder="e.g. BTC break above 105k"
                        />
                    </Field>
                    <Field label="Side">
                        <select
                            value={setupSide}
                            onChange={(e) => setSetupSide(e.target.value as "long" | "short" | "neutral")}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        >
                            <option value="long">Long</option>
                            <option value="short">Short</option>
                            <option value="neutral">Neutral — AI decides</option>
                        </select>
                    </Field>
                    <Field label="Instrument">
                        <select
                            value={setupInstrument}
                            onChange={(e) => setSetupInstrument(e.target.value)}
                            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        >
                            <option value="BTCUSDT">BTCUSDT</option>
                            <option value="ETHUSDT">ETHUSDT</option>
                        </select>
                    </Field>
                </div>

                <Field label="Scenario (distinguishes concurrent setups on the same instrument)">
                    <div className="flex flex-wrap gap-2">
                        {SCENARIO_PRESETS.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setSetupScenario(preset)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                    ${
                                        setupScenario === preset
                                            ? "bg-emerald-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                    }
                                `}
                            >
                                {preset}
                            </button>
                        ))}
                        <input
                            value={setupScenario}
                            onChange={(e) => setSetupScenario(e.target.value)}
                            className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm text-gray-900 min-w-[200px]"
                            placeholder="Custom scenario..."
                        />
                    </div>
                </Field>

                <Field label="Reasoning (thesis, invalidation, targets)">
                    <textarea
                        value={setupReasoning}
                        onChange={(e) => setSetupReasoning(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900 min-h-[120px]"
                        placeholder="Why this setup? What invalidates it? Where are you taking profit?"
                    />
                </Field>

                <Field label="Notes (optional)">
                    <textarea
                        value={setupNotes}
                        onChange={(e) => setSetupNotes(e.target.value)}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900 min-h-[80px]"
                        placeholder="Additional context, risk factors, etc."
                    />
                </Field>

                <div className="flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => handleSave("setup")}
                        disabled={saving || !setupTitle || !setupReasoning}
                        className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? "Saving…" : "Save as Setup"}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave("trade")}
                        disabled={saving || !setupTitle || !setupReasoning}
                        className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                    >
                        {saving ? "Saving…" : "Save & Trigger Trade"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                {label}
            </label>
            {children}
        </div>
    );
}

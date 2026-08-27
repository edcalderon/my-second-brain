"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
    Archive,
    BookMarked,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Eye,
    LayoutGrid,
    Loader2,
    Minus,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Table as TableIcon,
    TrendingDown,
    TrendingUp,
    X,
} from "lucide-react";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "@uiw/react-md-editor/markdown-editor.css";
import {
    AgentStatusResponse,
    closeJournalEntry,
    createJournalEntry,
    fetchAgentStatus,
    fetchJournalEntries,
    fetchJournalEntry,
    fetchNextReconcile,
    fetchTradeAnalysis,
    fetchTradingStatus,
    getTradingErrorPayload,
    JournalEntry,
    JournalEntryCreate,
    JournalEntryType,
    TradeAnalysis,
    updateJournalEntry,
} from "@/lib/hummingbot-api";
import { formatCurrency, formatRelativeTime, formatTime } from "@/lib/hummingbot-format";
import { JournalMarkdown } from "@/components/journal/JournalMarkdown";
import { AiGeneratedBadge } from "@/components/ui/AiGeneratedBadge";
import { AGENT_STATE_STYLES } from "@/components/shared/AgentStatusChip";

// @uiw/react-md-editor touches browser globals at module scope -- load it
// client-only, or the static export build breaks during prerender.
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const PAGE_SIZE = 20;
// singleDollarTextMath: false -- required so single "$" currency amounts
// ("$62,800") render as literal text instead of being read as inline math
// delimiters. See JournalMarkdown.tsx for the full explanation; this must
// stay in sync with that component's remark-math config since both render
// the same content (this one live while editing, that one for the saved
// view).
const MD_PREVIEW_OPTIONS: { remarkPlugins: PluggableList; rehypePlugins: PluggableList } = {
    remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: false }]],
    rehypePlugins: [rehypeKatex],
};

type FormState = {
    title: string;
    instrument: string;
    side: "long" | "short";
    entry_price: string;
    size: string;
    leverage: string;
    status: "open" | "closed";
    source: string;
    thesis: string;
    risk_plan: string;
    outcome: string;
    tags: string;
    entry_type: "trade" | "setup" | "lesson";
    reasoning: string;
};

const EMPTY_FORM: FormState = {
    title: "",
    instrument: "",
    side: "long",
    entry_price: "",
    size: "",
    leverage: "",
    status: "open",
    source: "manual",
    thesis: "",
    risk_plan: "",
    outcome: "",
    tags: "",
    entry_type: "trade",
    reasoning: "",
};

function entryToForm(entry: JournalEntry): FormState {
    return {
        title: entry.title,
        instrument: entry.instrument,
        side: entry.side,
        entry_price: entry.entry_price?.toString() ?? "",
        size: entry.size?.toString() ?? "",
        leverage: entry.leverage?.toString() ?? "",
        status: entry.status,
        source: entry.source,
        thesis: entry.thesis ?? "",
        risk_plan: entry.risk_plan ?? "",
        outcome: entry.outcome ?? "",
        tags: entry.tags.join(", "),
        entry_type: entry.entry_type || "trade",
        reasoning: entry.reasoning ?? "",
    };
}

function formToPayload(form: FormState): JournalEntryCreate {
    return {
        title: form.title,
        instrument: form.instrument,
        side: form.side,
        entry_price: form.entry_price ? Number(form.entry_price) : null,
        size: form.size ? Number(form.size) : null,
        leverage: form.leverage ? Number(form.leverage) : null,
        status: form.status,
        source: form.source || "manual",
        thesis: form.thesis || null,
        risk_plan: form.risk_plan || null,
        outcome: form.outcome || null,
        tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        entry_type: form.entry_type,
        reasoning: form.reasoning || null,
    };
}

export default function JournalPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Set when arriving via a "Journal ↗" deep link (?id=...) from another
    // page (Execution, Agent Activity) whose target entry may not be on the
    // current page of `entries` -- read directly with window.location.search
    // instead of useSearchParams() so this page doesn't need a Suspense
    // boundary for static export.
    const [deepLinkEntry, setDeepLinkEntry] = useState<JournalEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [mode, setMode] = useState<"view" | "edit" | "create">("view");
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | "open" | "closed">("");
    const [sideFilter, setSideFilter] = useState<"" | "long" | "short">("");
    const [entryTypeFilter, setEntryTypeFilter] = useState<"" | JournalEntryType>("");

    // Debounce search input so we're not firing a request per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            setSearch(searchInput);
            setPage(0);
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput]);

    async function load(preserveSelection = true, pageOverride?: number) {
        setRefreshing(true);
        try {
            // pageOverride exists because setPage() is async -- a caller that
            // just called setPage(0) and immediately calls load() would
            // otherwise still read the *old* `page` from this closure and
            // fetch the wrong offset (see save(), which needs page 0 right
            // after creating an entry, before the next render has run).
            const effectivePage = pageOverride ?? page;
            const result = await fetchJournalEntries({
                status: statusFilter || undefined,
                side: sideFilter || undefined,
                entry_type: entryTypeFilter || undefined,
                search: search || undefined,
                limit: PAGE_SIZE,
                offset: effectivePage * PAGE_SIZE,
            });
            setEntries(result.entries);
            setTotal(result.total);
            setError(null);
            if (!preserveSelection || (!selectedId && result.entries.length)) {
                setSelectedId(result.entries[0]?.id ?? null);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        load(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search, statusFilter, sideFilter, entryTypeFilter]);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) return;
        setSelectedId(id);
        fetchJournalEntry(id)
            .then(setDeepLinkEntry)
            .catch(() => {
                // Ignore -- falls back to whatever the default list selects.
            });
        // Only run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selected = entries.find((e) => e.id === selectedId) ?? (deepLinkEntry?.id === selectedId ? deepLinkEntry : null);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Re-fetch one entry fresh from the backend and splice it into whichever
    // local state currently holds it (the paginated list, or the deep-linked
    // single entry). This is what makes "manual refresh" on a live trade
    // actually able to notice a status flip (open -> closed) that happened
    // in the background (a reconcile sweep, or a manual close) -- unlike the
    // list-level Refresh button, which only helps if this entry is on the
    // currently loaded page.
    async function refreshSingleEntry(id: string) {
        const fresh = await fetchJournalEntry(id);
        setEntries((prev) => (prev.some((e) => e.id === id) ? prev.map((e) => (e.id === id ? fresh : e)) : prev));
        setDeepLinkEntry((prev) => (prev && prev.id === id ? fresh : prev));
        return fresh;
    }

    function startEdit() {
        if (!selected) return;
        setForm(entryToForm(selected));
        setSaveError(null);
        setMode("edit");
    }

    function startCreate() {
        setForm(EMPTY_FORM);
        setSaveError(null);
        setMode("create");
    }

    function cancelEdit() {
        setSaveError(null);
        setMode("view");
    }

    async function closeEntry(id: string, payload: { closing_summary: string; outcome?: string; exit_price?: number; realized_pnl?: number }) {
        await closeJournalEntry(id, payload);
        await load();
        setSelectedId(id);
    }

    async function save() {
        setSaving(true);
        setSaveError(null);
        try {
            const payload = formToPayload(form);
            if (mode === "create") {
                const created = await createJournalEntry(payload);
                setPage(0);
                await load(false, 0);
                setSelectedId(created.id);
            } else if (selected) {
                const updated = await updateJournalEntry(selected.id, payload);
                await load();
                setSelectedId(updated.id);
            }
            setMode("view");
        } catch (err) {
            const payload = getTradingErrorPayload<{ message?: string; detail?: string }>(err);
            setSaveError(payload?.message || payload?.detail || String(err));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-16">
            <header className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Trading Desk</p>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold text-gray-900">Trade journal</h1>
                        <p className="text-sm text-gray-600">
                            The bitácora — thesis, risk plan, and outcome for every trade, manual or automated.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => load()}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-gray-700"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={startCreate}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New entry
                        </button>
                    </div>
                </div>
            </header>

            {error !== null && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Couldn&apos;t load journal entries — check the backend connection.
                </div>
            )}

            <section className="@container grid gap-6 @3xl:grid-cols-[0.9fr_1.1fr]">
                <div className="glass-panel rounded-2xl p-4 space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search title, instrument, tags..."
                                className="w-full min-w-0 rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-sm text-gray-900"
                            />
                        </div>
                        <div className="flex rounded-lg border border-border bg-white p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode("cards")}
                                title="Card view"
                                className={`rounded-md p-1.5 ${viewMode === "cards" ? "bg-emerald-600 text-white" : "text-gray-500"}`}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                title="Table view"
                                className={`rounded-md p-1.5 ${viewMode === "table" ? "bg-emerald-600 text-white" : "text-gray-500"}`}
                            >
                                <TableIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <FilterSelect
                            value={statusFilter}
                            onChange={(v) => {
                                setStatusFilter(v as "" | "open" | "closed");
                                setPage(0);
                            }}
                            options={[
                                { value: "", label: "All statuses" },
                                { value: "open", label: "Open" },
                                { value: "closed", label: "Closed" },
                            ]}
                        />
                        <FilterSelect
                            value={sideFilter}
                            onChange={(v) => {
                                setSideFilter(v as "" | "long" | "short");
                                setPage(0);
                            }}
                            options={[
                                { value: "", label: "Long & short" },
                                { value: "long", label: "Long" },
                                { value: "short", label: "Short" },
                            ]}
                        />
                        <FilterSelect
                            value={entryTypeFilter}
                            onChange={(v) => {
                                setEntryTypeFilter(v as "" | JournalEntryType);
                                setPage(0);
                            }}
                            options={[
                                { value: "", label: "All types" },
                                { value: "trade", label: "Trades" },
                                { value: "setup", label: "Setups" },
                                { value: "lesson", label: "Lessons" },
                            ]}
                        />
                        <p className="ml-auto self-center text-xs text-gray-500">
                            {loading ? "Loading..." : `${total} ${total === 1 ? "entry" : "entries"}`}
                        </p>
                    </div>

                    {viewMode === "cards" ? (
                        <div className="space-y-1 max-h-[55vh] overflow-y-auto">
                            {entries.map((entry) => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(entry.id);
                                        setMode("view");
                                    }}
                                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                                        entry.id === selectedId
                                            ? "border-emerald-600 bg-emerald-50"
                                            : "border-border bg-white hover:border-emerald-200"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-semibold text-gray-500">#{entry.trade_number}</span>
                                            {entry.entry_type && entry.entry_type !== "trade" && (
                                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                    entry.entry_type === "setup"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-blue-100 text-blue-700"
                                                }`}>
                                                    {entry.entry_type}
                                                </span>
                                            )}
                                            {(!entry.entry_type || entry.entry_type === "trade") && entry.status === "open" && (
                                                <span className="relative flex h-1.5 w-1.5" title="Live position">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                                                </span>
                                            )}
                                        </div>
                                        <StatusPill status={entry.status} />
                                    </div>
                                    <p className="mt-1 truncate text-sm font-medium text-gray-900">{entry.title}</p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {entry.side === "short" ? "Short" : "Long"} · {entry.instrument}
                                    </p>
                                </button>
                            ))}
                            {!loading && !entries.length && (
                                <p className="px-2 py-6 text-center text-sm text-gray-500">No matching entries.</p>
                            )}
                        </div>
                    ) : (
                        <div className="max-h-[55vh] overflow-auto rounded-xl border border-border">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="sticky top-0 bg-gray-50">
                                    <tr>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">#</th>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">Type</th>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">Title</th>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">Side</th>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">Status</th>
                                        <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">Opened</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {entries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            onClick={() => {
                                                setSelectedId(entry.id);
                                                setMode("view");
                                            }}
                                            className={`cursor-pointer ${entry.id === selectedId ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                                        >
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">{entry.trade_number}</td>
                                            <td className="whitespace-nowrap px-3 py-2">
                                                {entry.entry_type && entry.entry_type !== "trade" ? (
                                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                        entry.entry_type === "setup"
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-blue-100 text-blue-700"
                                                    }`}>
                                                        {entry.entry_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">trade</span>
                                                )}
                                            </td>
                                            <td className="max-w-[220px] truncate px-3 py-2 font-medium text-gray-900">{entry.title}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{entry.side}</td>
                                            <td className="whitespace-nowrap px-3 py-2">
                                                <div className="flex items-center gap-1.5">
                                                    <StatusPill status={entry.status} />
                                                    {(!entry.entry_type || entry.entry_type === "trade") && entry.status === "open" && (
                                                        <span className="relative flex h-1.5 w-1.5" title="Live position">
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                                                {entry.opened_at ? formatTime(entry.opened_at) : "--"}
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && !entries.length && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                                                No matching entries.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3">
                        <button
                            type="button"
                            disabled={page === 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                        </button>
                        <span className="text-xs text-gray-500">
                            Page {page + 1} of {pageCount}
                        </span>
                        <button
                            type="button"
                            disabled={page >= pageCount - 1}
                            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-6 space-y-4 min-w-0">
                    {mode === "view" && selected && (
                        <EntryView entry={selected} onEdit={startEdit} onClose={closeEntry} onRefreshEntry={refreshSingleEntry} />
                    )}

                    {(mode === "edit" || mode === "create") && (
                        <EntryForm
                            form={form}
                            setForm={setForm}
                            saving={saving}
                            saveError={saveError}
                            isNew={mode === "create"}
                            onCancel={cancelEdit}
                            onSave={save}
                        />
                    )}

                    {mode === "view" && !selected && (
                        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-gray-400">
                            <BookMarked className="h-8 w-8" />
                            <p className="text-sm">{loading ? "Loading..." : "Select an entry, or start a new one."}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function StatusPill({ status }: { status: "open" | "closed" }) {
    return (
        <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
            }`}
        >
            {status}
        </span>
    );
}

function FilterSelect({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-gray-700"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

function EntryView({
    entry,
    onEdit,
    onClose,
    onRefreshEntry,
}: {
    entry: JournalEntry;
    onEdit: () => void;
    onClose: (id: string, payload: { closing_summary: string; outcome?: string; exit_price?: number; realized_pnl?: number }) => Promise<void>;
    onRefreshEntry: (id: string) => Promise<JournalEntry>;
}) {
    const [analysis, setAnalysis] = useState<TradeAnalysis[]>([]);
    const [analysisLoading, setAnalysisLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [closeForm, setCloseForm] = useState({ closing_summary: "", outcome: "", exit_price: "", realized_pnl: "" });
    const [submittingClose, setSubmittingClose] = useState(false);
    // Live unrealized PnL for still-open trades, read straight from Bybit
    // (bybit_direct_positions) -- the journal row itself has no live PnL
    // field, only realized_pnl once closed. null while unknown/loading.
    const [livePnl, setLivePnl] = useState<number | null>(null);
    // True once a *successful* poll of bybit_direct_positions completed and
    // found no position for this instrument, while the journal row still
    // says "open". This is the real, exchange-truth signal that the trade
    // was actually closed (manually, by an emergency trigger, by the
    // reconcile sweep, whatever) but this journal entry hasn't caught up
    // yet -- distinct from livePnl simply being null because a poll hasn't
    // landed yet or failed transiently.
    const [positionMissing, setPositionMissing] = useState(false);
    // Real agent_status state for this position's PositionDefender, if one
    // is registered under position_defender:{symbol}:{journal_id} (see
    // services/agent_status.py). null means "no entry found" -- which is
    // NOT proof the monitor is down: agent_status is in-memory and
    // per-process, so a defender started by a standalone script (not the
    // api-svc server itself, e.g. scripts/start_smoke_test_position_monitor.py)
    // never appears here at all. Treated as "can't confirm from here", not
    // "confirmed dead" -- positionMissing above is the authoritative signal.
    const [agentStatus, setAgentStatus] = useState<{ state: string; detail: string | null; updated_at: string | null } | null>(null);
    const [agentStatusChecked, setAgentStatusChecked] = useState(false);
    const [manualRefreshing, setManualRefreshing] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
    // Real next_run_time of the backend's close-guard reconcile job (the
    // thing that actually re-checks this exact position against the
    // exchange) -- null while unknown. Paired with `now`, ticked every
    // second, to render a live countdown without polling every second.
    const [nextReconcileAt, setNextReconcileAt] = useState<string | null>(null);
    const [now, setNow] = useState(() => Date.now());

    const isLiveTrade = entry.entry_type !== "setup" && entry.status === "open";

    // Collapsible sections state -- "analysis" starts open (and gets
    // relabeled "Live reasoning" below) for a live trade, since new
    // reasoning can land on it in real time; closed/setup entries keep it
    // collapsed as a plain historical log.
    const [sections, setSections] = useState<Record<string, boolean>>({
        overview: true,
        reasoning: true,
        thesis: false,
        risk_plan: false,
        outcome: false,
        analysis: isLiveTrade,
    });

    function toggleSection(key: string) {
        setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    useEffect(() => {
        let isMounted = true;
        setAnalysisLoading(true);
        fetchTradeAnalysis(entry.id)
            .then((res) => {
                if (isMounted) setAnalysis(res.entries);
            })
            .catch(() => {
                if (isMounted) setAnalysis([]);
            })
            .finally(() => {
                if (isMounted) setAnalysisLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [entry.id]);

    useEffect(() => {
        setClosing(false);
        setCloseError(null);
        setCloseForm({ closing_summary: "", outcome: "", exit_price: "", realized_pnl: "" });
        setLivePnl(null);
        setPositionMissing(false);
        setAgentStatus(null);
        setAgentStatusChecked(false);
        setLastCheckedAt(null);
        // Reset sections to default
        setSections({
            overview: true,
            reasoning: true,
            thesis: false,
            risk_plan: false,
            outcome: false,
            analysis: isLiveTrade,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry.id]);

    // The three real-state checks below (Bybit position, agent_status,
    // reconcile timer) are each defined once here so the same functions
    // back both the interval-driven auto-poll effects and the manual
    // "Recheck now" button -- one code path, not two copies that could
    // drift. mountedRef guards all three against setting state after this
    // entry has been swapped out or the view unmounted.
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, [entry.id]);

    async function pollLivePnl() {
        try {
            const status = await fetchTradingStatus();
            const positions = status.bybit_direct_positions ?? [];
            const match = positions.find(
                (p) => String(p.symbol ?? "").toUpperCase() === entry.instrument.toUpperCase()
            );
            if (mountedRef.current) {
                const pnl = match?.unrealisedPnl;
                setLivePnl(pnl != null ? Number(pnl) : null);
                // A successful poll that simply finds nothing is the real
                // "this position is gone on the exchange" signal -- distinct
                // from the catch block below, where we genuinely don't know.
                setPositionMissing(!match);
            }
        } catch {
            // Live PnL is a nice-to-have overlay -- leave the last known
            // value (or null) rather than erroring the whole entry view.
        }
    }

    // Real agent_status state for this position's defender, if the process
    // serving /agents/status happens to be the one running it (true for
    // strategy_runner-launched defenders; NOT true for a defender started
    // by a standalone script such as
    // scripts/start_smoke_test_position_monitor.py, which lives in its own
    // process with its own in-memory registry -- see agent_status.py).
    async function pollAgentStatus() {
        try {
            const status: AgentStatusResponse = await fetchAgentStatus();
            const key = Object.keys(status).find(
                (k) => k.startsWith("position_defender:") && k.endsWith(`:${entry.id}`)
            );
            if (mountedRef.current) {
                setAgentStatus(key ? status[key] : null);
                setAgentStatusChecked(true);
            }
        } catch {
            // Leave last known value -- this is a secondary signal, not the
            // authoritative one (positionMissing/entry.status are).
        }
    }

    // Refetch the real reconcile job's next_run_time -- the on-screen
    // countdown itself ticks locally every second between refetches (see
    // the `now` effect below).
    async function pollNextReconcile() {
        try {
            const res = await fetchNextReconcile();
            if (mountedRef.current) setNextReconcileAt(res.next_run_at);
        } catch {
            // Countdown is a nice-to-have -- keep the last known value.
        }
    }

    useEffect(() => {
        if (!isLiveTrade) return;
        pollLivePnl();
        const interval = setInterval(pollLivePnl, 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLiveTrade, entry.instrument, entry.id]);

    useEffect(() => {
        if (!isLiveTrade) return;
        pollAgentStatus();
        const interval = setInterval(pollAgentStatus, 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLiveTrade, entry.id]);

    useEffect(() => {
        if (!isLiveTrade) return;
        pollNextReconcile();
        const interval = setInterval(pollNextReconcile, 60000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLiveTrade, entry.id]);

    // Local 1s tick to animate the countdown between the 60s refetches above.
    useEffect(() => {
        if (!isLiveTrade) {
            return;
        }
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(tick);
    }, [isLiveTrade]);

    // Manual "Recheck now" -- re-runs all three live-state polls plus a
    // fresh fetch of this exact journal row (which the 15s/60s pollers
    // above don't do), so a click here can catch a status flip
    // (open -> closed) that happened server-side since this row was last
    // loaded -- the actual gap the stale "OPEN / PnL loading" card was
    // hitting when the position had already been closed and reconciled.
    async function handleManualRefresh() {
        setManualRefreshing(true);
        try {
            await Promise.allSettled([
                pollLivePnl(),
                pollAgentStatus(),
                pollNextReconcile(),
                onRefreshEntry(entry.id),
            ]);
        } finally {
            if (mountedRef.current) {
                setLastCheckedAt(Date.now());
                setManualRefreshing(false);
            }
        }
    }

    async function submitClose() {
        if (!closeForm.closing_summary.trim()) {
            setCloseError("Closing summary is required.");
            return;
        }
        setSubmittingClose(true);
        setCloseError(null);
        try {
            await onClose(entry.id, {
                closing_summary: closeForm.closing_summary,
                outcome: closeForm.outcome || undefined,
                exit_price: closeForm.exit_price ? Number(closeForm.exit_price) : undefined,
                realized_pnl: closeForm.realized_pnl ? Number(closeForm.realized_pnl) : undefined,
            });
            setClosing(false);
        } catch (err) {
            const payload = getTradingErrorPayload<{ message?: string; detail?: string }>(err);
            setCloseError(payload?.message || payload?.detail || String(err));
        } finally {
            setSubmittingClose(false);
        }
    }

    const isSetup = entry.entry_type === "setup";
    const hasReasoning = !!entry.reasoning;
    const hasThesis = !!entry.thesis;
    const hasRiskPlan = !!entry.risk_plan;
    const hasOutcome = !!entry.outcome;

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                            {isSetup ? "Setup" : "Trade"} #{entry.trade_number}
                        </p>
                        {isSetup && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                setup
                            </span>
                        )}
                        {entry.entry_type === "lesson" && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                lesson
                            </span>
                        )}
                        {!isSetup && entry.status === "open" && (
                            <Link
                                href="/execution"
                                title="Open position on the exchange right now -- view live status"
                                className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 hover:bg-red-200"
                            >
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                                </span>
                                Live &middot; Monitor
                            </Link>
                        )}
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-gray-900">{entry.title}</h2>
                </div>
                <div className="flex gap-2">
                    {!isSetup && entry.status === "open" && (
                        <button
                            type="button"
                            onClick={() => setClosing((v) => !v)}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                            <Archive className="h-3.5 w-3.5" />
                            Close & archive
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                    </button>
                </div>
            </div>

            {closing && (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                        Close & archive #{entry.trade_number}
                    </p>
                    <p className="text-xs text-emerald-700">
                        Marks this entry closed, tags it finished/archived, and writes a final sublog entry.
                    </p>
                    <textarea
                        value={closeForm.closing_summary}
                        onChange={(e) => setCloseForm((f) => ({ ...f, closing_summary: e.target.value }))}
                        placeholder="Closing summary (required)"
                        rows={3}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                        <input
                            value={closeForm.outcome}
                            onChange={(e) => setCloseForm((f) => ({ ...f, outcome: e.target.value }))}
                            placeholder="win/loss/breakeven"
                            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                            value={closeForm.exit_price}
                            onChange={(e) => setCloseForm((f) => ({ ...f, exit_price: e.target.value }))}
                            placeholder="Exit price"
                            type="number"
                            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                        />
                        <input
                            value={closeForm.realized_pnl}
                            onChange={(e) => setCloseForm((f) => ({ ...f, realized_pnl: e.target.value }))}
                            placeholder="Realized PnL ($)"
                            type="number"
                            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                        />
                    </div>
                    {closeError && <p className="text-xs text-red-600">{closeError}</p>}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={submitClose}
                            disabled={submittingClose}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                            {submittingClose ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                            Confirm close
                        </button>
                        <button
                            type="button"
                            onClick={() => setClosing(false)}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Quick summary pills */}
            <div className="flex flex-wrap items-center gap-2">
                <Pill>{entry.side === "short" ? "Short" : "Long"}</Pill>
                <Pill>{entry.instrument}</Pill>
                <Pill tone={entry.status === "open" ? "positive" : "default"}>{entry.status}</Pill>
                <Pill>{entry.source}</Pill>
                {entry.entry_price != null && <Pill>Entry: ${entry.entry_price.toLocaleString()}</Pill>}
                {entry.size != null && <Pill>Size: {entry.size}</Pill>}
                {entry.leverage != null && <Pill>{entry.leverage}x</Pill>}
                {entry.tags.map((tag) => (
                    <Pill key={tag}>#{tag}</Pill>
                ))}
                {!isSetup && (entry.status === "closed" || isLiveTrade) && (
                    <PnlIndicator
                        value={entry.status === "closed" ? entry.realized_pnl : livePnl}
                        live={isLiveTrade}
                    />
                )}
            </div>

            {!isSetup && <LifecycleTimeline entry={entry} />}
            {isLiveTrade && (
                <LiveStatusPanel
                    instrument={entry.instrument}
                    nextReconcileAt={nextReconcileAt}
                    now={now}
                    latest={analysis[0] ?? null}
                    loading={analysisLoading}
                    agentStatus={agentStatus}
                    agentStatusChecked={agentStatusChecked}
                    positionMissing={positionMissing}
                    manualRefreshing={manualRefreshing}
                    lastCheckedAt={lastCheckedAt}
                    onRefresh={handleManualRefresh}
                />
            )}
            {isSetup && (
                <p className="text-xs text-gray-400">
                    Logged {entry.opened_at ? formatTime(entry.opened_at) : formatTime(entry.created_at)}
                    {entry.closed_at ? ` · Closed ${formatTime(entry.closed_at)}` : ""}
                </p>
            )}

            {/* Collapsible: Reasoning (setups) */}
            {hasReasoning && (
                <CollapsibleSection
                    title="Reasoning"
                    isOpen={sections.reasoning}
                    onToggle={() => toggleSection("reasoning")}
                    badge="pre-trade analysis"
                >
                    <JournalMarkdown>{entry.reasoning!}</JournalMarkdown>
                </CollapsibleSection>
            )}

            {/* Collapsible: Thesis */}
            {hasThesis && (
                <CollapsibleSection
                    title="Thesis"
                    isOpen={sections.thesis}
                    onToggle={() => toggleSection("thesis")}
                >
                    <JournalMarkdown>{entry.thesis!}</JournalMarkdown>
                </CollapsibleSection>
            )}

            {/* Collapsible: Risk Plan */}
            {hasRiskPlan && (
                <CollapsibleSection
                    title="Risk Plan"
                    isOpen={sections.risk_plan}
                    onToggle={() => toggleSection("risk_plan")}
                >
                    <JournalMarkdown>{entry.risk_plan!}</JournalMarkdown>
                </CollapsibleSection>
            )}

            {/* Collapsible: Outcome */}
            {hasOutcome && (
                <CollapsibleSection
                    title="Outcome"
                    isOpen={sections.outcome}
                    onToggle={() => toggleSection("outcome")}
                >
                    <JournalMarkdown>{entry.outcome!}</JournalMarkdown>
                </CollapsibleSection>
            )}
            {!hasOutcome && !isSetup && (
                <CollapsibleSection
                    title="Outcome"
                    isOpen={false}
                    onToggle={() => toggleSection("outcome")}
                >
                    <span className="text-sm text-gray-400">Not filled in yet — add this when the trade closes.</span>
                </CollapsibleSection>
            )}

            {/* Collapsible: Analysis log -- for a live trade this doubles as
                the "live reasoning" feed: new entries can land on it while
                the position is open, so it's expanded by default and newest
                first (the API already returns them ORDER BY created_at DESC;
                rendered here in that same order, no re-sort needed). */}
            <CollapsibleSection
                title={isLiveTrade ? "Live reasoning" : "Analysis log"}
                isOpen={sections.analysis}
                onToggle={() => toggleSection("analysis")}
                badge={
                    isLiveTrade
                        ? `${analysis.length} · updating live`
                        : analysis.length > 0
                          ? `${analysis.length} entries`
                          : undefined
                }
            >
                {analysisLoading && <p className="text-sm text-gray-400">Loading...</p>}
                {!analysisLoading && !analysis.length && (
                    <p className="text-sm text-gray-400">
                        {isLiveTrade ? "No reasoning logged yet -- newest will appear at the top." : "No analysis logged yet."}
                    </p>
                )}
                <div className="space-y-3">
                    {analysis.map((item) => (
                        <AnalysisEntry key={item.id} item={item} />
                    ))}
                </div>
            </CollapsibleSection>
        </div>
    );
}

function AnalysisEntry({ item }: { item: TradeAnalysis }) {
    const [expanded, setExpanded] = useState(false);
    const metricEntries = Object.entries(item.metrics ?? {});

    return (
        <div className="rounded-lg border border-border bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {item.analysis_type}
                </span>
                <span className="text-xs text-gray-400">{formatTime(item.created_at)}</span>
            </div>
            <p className="mt-2 text-sm text-gray-800">{item.summary}</p>
            {metricEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {metricEntries.map(([key, value]) => (
                        <span key={key}>
                            <span className="text-gray-400">{key}:</span>{" "}
                            <span className="font-medium text-gray-700">{typeof value === "number" ? value.toLocaleString() : value}</span>
                        </span>
                    ))}
                </div>
            )}
            {item.details && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-2 text-xs font-semibold text-emerald-700"
                >
                    {expanded ? "Hide details" : "Show full details"}
                </button>
            )}
            {expanded && item.details && (
                <div className="mt-2 border-t border-border pt-2">
                    <JournalMarkdown>{item.details}</JournalMarkdown>
                </div>
            )}
        </div>
    );
}

function JournalSection({ title, body, placeholder }: { title: string; body: string | null; placeholder?: string }) {
    return (
        <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
            <div className="mt-2">
                {body ? <JournalMarkdown>{body}</JournalMarkdown> : <span className="text-sm text-gray-400">{placeholder ?? "—"}</span>}
            </div>
        </div>
    );
}

function CollapsibleSection({
    title,
    isOpen,
    onToggle,
    badge,
    children,
}: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    badge?: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">{title}</span>
                    {badge && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-border px-4 py-3">
                    {children}
                </div>
            )}
        </div>
    );
}

function EntryForm({
    form,
    setForm,
    saving,
    saveError,
    isNew,
    onCancel,
    onSave,
}: {
    form: FormState;
    setForm: (updater: (prev: FormState) => FormState) => void;
    saving: boolean;
    saveError: string | null;
    isNew: boolean;
    onCancel: () => void;
    onSave: () => void;
}) {
    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const editorPreviewOptions = useMemo(() => MD_PREVIEW_OPTIONS, []);

    return (
        <div className="space-y-4" data-color-mode="light">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{isNew ? "New journal entry" : "Edit entry"}</h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                    >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving || !form.title || !form.instrument}
                        onClick={onSave}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                    </button>
                </div>
            </div>

            {saveError && <p className="text-xs text-rose-700">{saveError}</p>}

            <div className="grid grid-cols-1 @xs:grid-cols-3 gap-3">
                <Field label="Type">
                    <select
                        value={form.entry_type}
                        onChange={(e) => set("entry_type", e.target.value as "trade" | "setup" | "lesson")}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="trade">Trade</option>
                        <option value="setup">Setup</option>
                        <option value="lesson">Lesson</option>
                    </select>
                </Field>
                <Field label="Title">
                    <input
                        value={form.title}
                        onChange={(e) => set("title", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        placeholder="e.g. BTC breakout above 105k"
                    />
                </Field>
                <Field label="Instrument">
                    <input
                        value={form.instrument}
                        onChange={(e) => set("instrument", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        placeholder="BTCUSDT"
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 @xs:grid-cols-2 gap-3">
                <Field label="Side">
                    <select
                        value={form.side}
                        onChange={(e) => set("side", e.target.value as "long" | "short")}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                    </select>
                </Field>
                <Field label="Source">
                    <input
                        value={form.source}
                        onChange={(e) => set("source", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        placeholder="manual, bot:S2, strategy_engine"
                    />
                </Field>
            </div>

            <div className="grid grid-cols-2 @sm:grid-cols-4 gap-3">
                <Field label="Entry price">
                    <input
                        type="number"
                        value={form.entry_price}
                        onChange={(e) => set("entry_price", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    />
                </Field>
                <Field label="Size">
                    <input
                        type="number"
                        value={form.size}
                        onChange={(e) => set("size", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    />
                </Field>
                <Field label="Leverage">
                    <input
                        type="number"
                        value={form.leverage}
                        onChange={(e) => set("leverage", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    />
                </Field>
                <Field label="Status">
                    <select
                        value={form.status}
                        onChange={(e) => set("status", e.target.value as "open" | "closed")}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                    </select>
                </Field>
            </div>

            <Field label="Tags (comma-separated)">
                <input
                    value={form.tags}
                    onChange={(e) => set("tags", e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="btc, manual, countertrend"
                />
            </Field>

            {form.entry_type === "setup" && (
                <Field label="Reasoning (pre-trade analysis)">
                    <MDEditor
                        value={form.reasoning}
                        onChange={(v) => set("reasoning", v ?? "")}
                        preview="live"
                        height={200}
                        {...editorPreviewOptions}
                    />
                </Field>
            )}

            <Field label="Thesis">
                <MDEditor
                    value={form.thesis}
                    onChange={(v) => set("thesis", v ?? "")}
                    height={260}
                    preview="live"
                    previewOptions={editorPreviewOptions}
                    textareaProps={{ placeholder: "What's the analysis and intention behind this trade? Markdown + $LaTeX$ supported." }}
                />
            </Field>

            <Field label="Risk plan">
                <MDEditor
                    value={form.risk_plan}
                    onChange={(v) => set("risk_plan", v ?? "")}
                    height={200}
                    preview="live"
                    previewOptions={editorPreviewOptions}
                    textareaProps={{ placeholder: "Stop-loss doctrine, sizing rationale, liquidation buffer..." }}
                />
            </Field>

            <Field label="Outcome (fill in when closed)">
                <MDEditor
                    value={form.outcome}
                    onChange={(v) => set("outcome", v ?? "")}
                    height={160}
                    preview="live"
                    previewOptions={editorPreviewOptions}
                    textareaProps={{ placeholder: "What happened, and what did we learn?" }}
                />
            </Field>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-1">
            <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
            {children}
        </label>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
        </div>
    );
}

function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "positive" }) {
    return (
        <span
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                tone === "positive"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-border bg-gray-50 text-gray-600"
            }`}
        >
            {children}
        </span>
    );
}

// Color-coded win/loss indicator -- green for profit, red for loss, gray
// when there's nothing to show yet (still-open trade with no live read, or
// a closed trade with no realized_pnl recorded). `live` marks it as reading
// off the exchange in real time rather than a fixed, closed-trade number.
function PnlIndicator({ value, live = false }: { value: number | null | undefined; live?: boolean }) {
    if (value == null || Number.isNaN(value)) {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <Minus className="h-3 w-3" />
                {live ? "PnL loading…" : "No PnL yet"}
            </span>
        );
    }

    const isWin = value > 0;
    const isFlat = value === 0;
    const Icon = isFlat ? Minus : isWin ? TrendingUp : TrendingDown;
    const tone = isFlat
        ? "border-border bg-gray-50 text-gray-600"
        : isWin
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700";

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
            <Icon className="h-3 w-3" />
            {formatCurrency(value)}
            {live && <span className="normal-case font-normal text-[10px] opacity-70">(live)</span>}
        </span>
    );
}

// Visual open -> close lifecycle: opened marker, a connecting line that
// pulses while still live, then either a closed marker or an explicit
// "not filled" state for a trade that's still open with nothing recorded
// on the close side yet.
function LifecycleTimeline({ entry }: { entry: JournalEntry }) {
    const isLive = entry.status === "open";

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-4 py-3">
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-gray-700">Opened</p>
                    <p className="text-[11px] text-gray-400">{entry.opened_at ? formatTime(entry.opened_at) : "--"}</p>
                </div>
            </div>

            <div
                className={`h-0.5 min-w-[2.5rem] flex-1 rounded-full ${
                    isLive ? "animate-pulse bg-gradient-to-r from-emerald-400 via-red-300 to-red-400" : "bg-gray-200"
                }`}
            />

            {isLive ? (
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                    </span>
                    <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-red-600">Live now</p>
                        <p className="text-[11px] text-gray-400">
                            {entry.opened_at ? `opened ${formatRelativeTime(entry.opened_at)}` : "still running"}
                        </p>
                    </div>
                </div>
            ) : entry.closed_at ? (
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-400" />
                    <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-gray-700">Closed</p>
                        <p className="text-[11px] text-gray-400">{formatTime(entry.closed_at)}</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-dashed border-gray-300" />
                    <div className="leading-tight">
                        <p className="text-[11px] font-semibold text-gray-400">Not filled</p>
                        <p className="text-[11px] text-gray-400">no close recorded</p>
                    </div>
                </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
                {entry.duration_hours != null && <span>{entry.duration_hours.toFixed(1)}h total</span>}
                {entry.exit_price != null && <span>Exit ${entry.exit_price.toLocaleString()}</span>}
            </div>
        </div>
    );
}

// Sits between the Opened/Closed timeline and the full reasoning log: what
// is the monitoring process actually doing right now, when will it next
// re-check this position, and what's the freshest reasoning it's logged.
// All three are backed by real state (PositionDefender is a passive
// websocket watcher -- "idle" is its true resting state, not a fake
// "thinking" animation; the countdown is the real close-guard reconcile
// job's next_run_time; the summary is the newest trade_analysis row).
function LiveStatusPanel({
    instrument,
    nextReconcileAt,
    now,
    latest,
    loading,
    agentStatus,
    agentStatusChecked,
    positionMissing,
    manualRefreshing,
    lastCheckedAt,
    onRefresh,
}: {
    instrument: string;
    nextReconcileAt: string | null;
    now: number;
    latest: TradeAnalysis | null;
    loading: boolean;
    agentStatus: { state: string; detail: string | null; updated_at: string | null } | null;
    agentStatusChecked: boolean;
    positionMissing: boolean;
    manualRefreshing: boolean;
    lastCheckedAt: number | null;
    onRefresh: () => void;
}) {
    let countdown: string | null = null;
    if (nextReconcileAt) {
        const diffMs = new Date(nextReconcileAt).getTime() - now;
        if (!Number.isNaN(diffMs)) {
            if (diffMs <= 0) {
                countdown = "checking now…";
            } else {
                const totalSeconds = Math.floor(diffMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                countdown = `${minutes}:${seconds.toString().padStart(2, "0")}`;
            }
        }
    }

    // Real monitor-state line. agentStatus is only populated when the
    // process serving /agents/status happens to be running this exact
    // position's defender (true for strategy_runner trades; not true for a
    // standalone-script-launched one, e.g. a manual smoke test -- that
    // defender's state lives in its own process memory, not this one's).
    // So "no entry" reads as "can't confirm from here", never as "down".
    const style = agentStatus ? AGENT_STATE_STYLES[agentStatus.state as keyof typeof AGENT_STATE_STYLES] : null;

    return (
        <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            {positionMissing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        Exchange shows no open {instrument} position right now, but this journal entry still says
                        “open”. It may have been closed already (reconcile sweep, manual close, or an emergency
                        trigger) and just hasn’t caught up here yet — hit Recheck now to confirm and update it.
                    </span>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        style ? "text-blue-800" : "text-gray-500"
                    }`}
                >
                    <Eye className={`h-3.5 w-3.5 ${style ? "" : "text-gray-400"}`} />
                    {agentStatus && style
                        ? `${style.label}${agentStatus.detail ? ` · ${agentStatus.detail}` : ""}`
                        : agentStatusChecked
                          ? "Monitor status not tracked here (external process — confirmed via exchange checks instead)"
                          : "Checking monitor status…"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                    <Clock className="h-3.5 w-3.5" />
                    {countdown ? `Next automatic check in ${countdown}` : "Next automatic check: pending…"}
                </span>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={manualRefreshing}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3 w-3 ${manualRefreshing ? "animate-spin" : ""}`} />
                    {manualRefreshing ? "Checking…" : "Recheck now"}
                </button>
            </div>
            <p className="text-xs text-blue-900/80">
                {loading && "Loading latest reasoning…"}
                {!loading && !latest && "No reasoning logged yet -- newest will appear here first."}
                {!loading && latest && (
                    <>
                        <span className="font-semibold">Latest:</span> {latest.summary}
                        <span className="ml-1.5 text-blue-700/70">({formatRelativeTime(latest.created_at)})</span>
                    </>
                )}
            </p>
            <p className="text-[11px] text-blue-700/60">
                {lastCheckedAt
                    ? `Manually rechecked ${formatRelativeTime(new Date(lastCheckedAt).toISOString())}`
                    : "Not manually rechecked yet this session."}
            </p>
        </div>
    );
}

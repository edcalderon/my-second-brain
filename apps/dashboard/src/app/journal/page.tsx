"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
    Archive,
    BookMarked,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Save,
    Search,
    Table as TableIcon,
    X,
} from "lucide-react";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "@uiw/react-md-editor/markdown-editor.css";
import {
    closeJournalEntry,
    createJournalEntry,
    fetchJournalEntries,
    fetchTradeAnalysis,
    getTradingErrorPayload,
    JournalEntry,
    JournalEntryCreate,
    TradeAnalysis,
    updateJournalEntry,
} from "@/lib/hummingbot-api";
import { formatTime } from "@/lib/hummingbot-format";
import { JournalMarkdown } from "@/components/journal/JournalMarkdown";

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
    };
}

export default function JournalPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
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
    }, [page, search, statusFilter, sideFilter]);

    const selected = entries.find((e) => e.id === selectedId) ?? null;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
                                        <span className="text-xs font-semibold text-gray-500">#{entry.trade_number}</span>
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
                                            <td className="max-w-[220px] truncate px-3 py-2 font-medium text-gray-900">{entry.title}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{entry.side}</td>
                                            <td className="whitespace-nowrap px-3 py-2">
                                                <StatusPill status={entry.status} />
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                                                {entry.opened_at ? formatTime(entry.opened_at) : "--"}
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && !entries.length && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
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
                    {mode === "view" && selected && <EntryView entry={selected} onEdit={startEdit} onClose={closeEntry} />}

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
}: {
    entry: JournalEntry;
    onEdit: () => void;
    onClose: (id: string, payload: { closing_summary: string; outcome?: string; exit_price?: number; realized_pnl?: number }) => Promise<void>;
}) {
    const [analysis, setAnalysis] = useState<TradeAnalysis[]>([]);
    const [analysisLoading, setAnalysisLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);
    const [closeForm, setCloseForm] = useState({ closing_summary: "", outcome: "", exit_price: "", realized_pnl: "" });
    const [submittingClose, setSubmittingClose] = useState(false);

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
    }, [entry.id]);

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

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Trade #{entry.trade_number}</p>
                    <h2 className="mt-1 text-xl font-semibold text-gray-900">{entry.title}</h2>
                </div>
                <div className="flex gap-2">
                    {entry.status === "open" && (
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
                        Close & archive trade #{entry.trade_number}
                    </p>
                    <p className="text-xs text-emerald-700">
                        Marks this entry closed, tags it finished/archived, and writes a final sublog entry
                        summarizing the outcome. The thesis/risk-plan/sublog history stays intact.
                    </p>
                    <textarea
                        value={closeForm.closing_summary}
                        onChange={(e) => setCloseForm((f) => ({ ...f, closing_summary: e.target.value }))}
                        placeholder="Closing summary — what happened, why it closed, what was learned (required)"
                        rows={3}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-3">
                        <input
                            value={closeForm.outcome}
                            onChange={(e) => setCloseForm((f) => ({ ...f, outcome: e.target.value }))}
                            placeholder="Outcome (win/loss/breakeven)"
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
                            Confirm close & archive
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

            <div className="flex flex-wrap gap-2">
                <Pill>{entry.side === "short" ? "Short" : "Long"}</Pill>
                <Pill>{entry.instrument}</Pill>
                <Pill tone={entry.status === "open" ? "positive" : "default"}>{entry.status}</Pill>
                <Pill>{entry.source}</Pill>
                {entry.tags.map((tag) => (
                    <Pill key={tag}>#{tag}</Pill>
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Entry price" value={entry.entry_price != null ? `$${entry.entry_price.toLocaleString()}` : "--"} />
                <Metric label="Size" value={entry.size != null ? `${entry.size}` : "--"} />
                <Metric label="Leverage" value={entry.leverage != null ? `${entry.leverage}x` : "--"} />
            </div>

            <p className="text-xs text-gray-400">
                Opened {entry.opened_at ? formatTime(entry.opened_at) : "--"}
                {entry.closed_at ? ` · Closed ${formatTime(entry.closed_at)}` : ""}
            </p>

            <JournalSection title="Thesis" body={entry.thesis} />
            <JournalSection title="Risk plan" body={entry.risk_plan} />
            <JournalSection title="Outcome" body={entry.outcome} placeholder="Not filled in yet — add this when the trade closes." />

            <div className="rounded-xl border border-border bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                    Analysis log {analysis.length > 0 && `(${analysis.length})`}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    Append-only history of analysis passes over this trade — stop/target recalculations, reconciliation
                    checks. Never overwritten, unlike the fields above.
                </p>
                <div className="mt-3 space-y-3">
                    {analysisLoading && <p className="text-sm text-gray-400">Loading...</p>}
                    {!analysisLoading && !analysis.length && (
                        <p className="text-sm text-gray-400">No analysis logged yet for this trade.</p>
                    )}
                    {analysis.map((item) => (
                        <AnalysisEntry key={item.id} item={item} />
                    ))}
                </div>
            </div>
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

            <Field label="Title">
                <input
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                    placeholder="e.g. Trade #2 -- BTC long, breakout retest"
                />
            </Field>

            <div className="grid grid-cols-1 @xs:grid-cols-2 gap-3">
                <Field label="Instrument">
                    <input
                        value={form.instrument}
                        onChange={(e) => set("instrument", e.target.value)}
                        className="w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm text-gray-900"
                        placeholder="BTCPERP (Bybit USDC perpetual)"
                    />
                </Field>
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

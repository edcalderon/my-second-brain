"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Archive,
    ArchiveRestore,
    Bell,
    ChevronDown,
    ChevronUp,
    Loader2,
    Volume2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AppNotification, NotificationSeverity } from "@/components/supabase/SupabaseProvider";
import {
    archiveNotification,
    markAllNotificationsRead,
    markNotificationRead,
    unarchiveNotification,
} from "@/lib/hummingbot-api";
import { formatTime, formatRelativeTime } from "@/lib/hummingbot-format";
import {
    DEFAULT_CATEGORY_SOUNDS,
    DEFAULT_PREFERENCES,
    loadNotificationPreferences,
    PERSISTENCE_OPTIONS,
    saveNotificationPreferences,
    type AlarmPersistence,
    type NotificationPreferences,
} from "@/lib/notification-preferences";
import { SOUND_PATTERNS, testSoundPattern, type SoundPattern } from "@/lib/notification-sounds";

const PAGE_SIZE = 30;
const CATEGORIES = ["risk_guard", "signal", "journal", "volatility", "system"];

type StatusFilter = "all" | "unread" | "read" | "archived";

const SEVERITY_STYLE: Record<NotificationSeverity, { dot: string; border: string; badge: string }> = {
    info: { dot: "bg-sky-500", border: "border-l-sky-500", badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
    warning: { dot: "bg-amber-500", border: "border-l-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
    critical: { dot: "bg-red-500", border: "border-l-red-500", badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
};

export default function NotificationsPage() {
    const [items, setItems] = useState<AppNotification[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

    useEffect(() => {
        setPrefs(loadNotificationPreferences());
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        let query = supabase.from("notifications").select("*", { count: "exact" }).order("created_at", { ascending: false });

        if (statusFilter === "archived") {
            query = query.not("archived_at", "is", null);
        } else {
            query = query.is("archived_at", null);
            if (statusFilter === "unread") query = query.is("read_at", null);
            if (statusFilter === "read") query = query.not("read_at", "is", null);
        }
        if (categoryFilter) query = query.eq("category", categoryFilter);

        const { data, count, error } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
        if (!error) {
            setItems((data || []) as AppNotification[]);
            setTotal(count || 0);
        }
        setLoading(false);
    }, [statusFilter, categoryFilter, page]);

    useEffect(() => {
        load();
    }, [load]);

    // Live-refresh while the page is open -- a new insert or a read/archive
    // change from another tab (e.g. the header dropdown) should show up
    // without a manual reload.
    useEffect(() => {
        const channel = supabase
            .channel("notifications-page")
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [load]);

    function updatePrefs(patch: Partial<NotificationPreferences>) {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        saveNotificationPreferences(next);
    }

    function updateCategorySound(category: string, pattern: SoundPattern) {
        updatePrefs({ categorySounds: { ...prefs.categorySounds, [category]: pattern } });
    }

    async function toggleExpand(n: AppNotification) {
        setExpandedId((cur) => (cur === n.id ? null : n.id));
        if (!n.read_at) {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
            try {
                await markNotificationRead(n.id);
            } catch {
                // optimistic update stands
            }
        }
    }

    async function toggleArchive(e: React.MouseEvent, n: AppNotification) {
        e.stopPropagation();
        const archiving = !n.archived_at;
        setItems((prev) => prev.filter((x) => x.id !== n.id));
        setTotal((t) => Math.max(0, t - 1));
        try {
            await (archiving ? archiveNotification(n.id) : unarchiveNotification(n.id));
        } catch {
            load();
        }
    }

    async function onMarkAllRead() {
        try {
            await markAllNotificationsRead();
            load();
        } catch {
            // ignore -- next load reconciles
        }
    }

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{total} {statusFilter === "archived" ? "archived" : statusFilter} notification{total === 1 ? "" : "s"}</p>
                    </div>
                </div>
                <button
                    onClick={onMarkAllRead}
                    className="text-xs font-semibold rounded-lg border border-border bg-white dark:bg-gray-900 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:border-emerald-400"
                >
                    Mark all read
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {(["all", "unread", "read", "archived"] as StatusFilter[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => { setStatusFilter(f); setPage(0); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                            statusFilter === f
                                ? "bg-emerald-600 text-white"
                                : "bg-white dark:bg-gray-900 border border-border text-gray-600 dark:text-gray-300"
                        }`}
                    >
                        {f}
                    </button>
                ))}
                <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                    className="ml-auto rounded-lg border border-border bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300"
                >
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            <div className="rounded-xl border border-border bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
                {loading && (
                    <div className="flex items-center justify-center py-10 text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                )}
                {!loading && items.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-400">Nothing here.</p>
                )}
                {!loading && items.map((n) => {
                    const style = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info;
                    const expanded = expandedId === n.id;
                    const metadataEntries = Object.entries(n.metadata ?? {});
                    return (
                        <div key={n.id} className={`border-l-4 ${style.border}`}>
                            <button
                                onClick={() => toggleExpand(n)}
                                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${
                                    n.read_at ? "" : "bg-emerald-50/40 dark:bg-emerald-950/10"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${style.badge}`}>{n.severity}</span>
                                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{n.category}</span>
                                        {!n.read_at && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
                                    </div>
                                    <p className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${expanded ? "" : "line-clamp-1"}`}>{n.message}</p>
                                    <p className="mt-1 text-[10px] text-gray-400">{formatRelativeTime(n.created_at)} · {formatTime(n.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={(e) => toggleArchive(e, n)}
                                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                                        title={n.archived_at ? "Unarchive" : "Archive"}
                                    >
                                        {n.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                    </button>
                                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                </div>
                            </button>
                            {expanded && metadataEntries.length > 0 && (
                                <div className="px-4 pb-4 -mt-1">
                                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 text-xs">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">Details</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                            {metadataEntries.map(([k, v]) => (
                                                <div key={k}>
                                                    <span className="text-gray-400">{k}: </span>
                                                    <span className="text-gray-700 dark:text-gray-300 font-medium">{String(v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                    <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-30 font-semibold">Prev</button>
                    <span>Page {page + 1} of {pageCount}</span>
                    <button disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-30 font-semibold">Next</button>
                </div>
            )}

            {/* Sound & preference controls */}
            <div className="rounded-xl border border-border bg-white dark:bg-gray-900 p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Sound & alert preferences</p>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                        <span>Mute all sounds</span>
                        <input type="checkbox" checked={prefs.muteAll} onChange={(e) => updatePrefs({ muteAll: e.target.checked })} />
                    </label>
                    <label className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                        <span>Minimum severity to alert</span>
                        <select
                            value={prefs.minSeverity}
                            onChange={(e) => updatePrefs({ minSeverity: e.target.value as NotificationPreferences["minSeverity"] })}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-0.5 text-xs"
                        >
                            <option value="info">Info & up</option>
                            <option value="warning">Warning & up</option>
                            <option value="critical">Critical only</option>
                        </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 sm:col-span-2">
                        <span className="whitespace-nowrap">Volume</span>
                        <input
                            type="range" min={0} max={0.5} step={0.05} value={prefs.volume}
                            onChange={(e) => updatePrefs({ volume: Number(e.target.value) })}
                            className="flex-1"
                        />
                        <button
                            onClick={() => testSoundPattern("double-chime", prefs.volume)}
                            className="p-1 text-gray-400 hover:text-emerald-600"
                            title="Test volume"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </label>
                </div>

                <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Alarm duration per severity
                    </p>
                    <p className="text-[11px] text-gray-400 mb-2">
                        "Repeat until dismissed" shows a full-screen banner and keeps sounding until you dismiss it --
                        that's the default for critical, so it actually wakes you up instead of a single quiet chime.
                    </p>
                    <div className="space-y-1.5">
                        {(["critical", "warning", "info"] as const).map((sev) => (
                            <div key={sev} className="flex items-center justify-between text-xs">
                                <span className="capitalize text-gray-600 dark:text-gray-300">{sev}</span>
                                <select
                                    value={prefs.alarmPersistence[sev]}
                                    onChange={(e) =>
                                        updatePrefs({
                                            alarmPersistence: { ...prefs.alarmPersistence, [sev]: e.target.value as AlarmPersistence },
                                        })
                                    }
                                    className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-0.5"
                                >
                                    {PERSISTENCE_OPTIONS.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Sound per category</p>
                    <div className="space-y-2">
                        {CATEGORIES.map((cat) => (
                            <div key={cat} className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="capitalize text-gray-600 dark:text-gray-300 w-24">{cat.replace("_", " ")}</span>
                                    <label className="flex items-center gap-1 text-gray-400">
                                        <input
                                            type="checkbox"
                                            checked={!prefs.mutedCategories.includes(cat)}
                                            onChange={(e) =>
                                                updatePrefs({
                                                    mutedCategories: e.target.checked
                                                        ? prefs.mutedCategories.filter((c) => c !== cat)
                                                        : [...prefs.mutedCategories, cat],
                                                })
                                            }
                                        />
                                        enabled
                                    </label>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={prefs.categorySounds[cat] ?? DEFAULT_CATEGORY_SOUNDS[cat]}
                                        onChange={(e) => updateCategorySound(cat, e.target.value as SoundPattern)}
                                        className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 py-0.5"
                                    >
                                        {SOUND_PATTERNS.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => testSoundPattern(prefs.categorySounds[cat] ?? DEFAULT_CATEGORY_SOUNDS[cat], prefs.volume)}
                                        className="p-1 text-gray-400 hover:text-emerald-600"
                                        title="Test sound"
                                    >
                                        <Volume2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={async () => {
                        if (typeof window !== "undefined" && "Notification" in window) {
                            const permission = await Notification.requestPermission();
                            updatePrefs({ browserPushEnabled: permission === "granted" });
                        }
                    }}
                    className="w-full text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                    {prefs.browserPushEnabled ? "Browser push enabled" : "Enable browser push notifications"}
                </button>
            </div>
        </div>
    );
}

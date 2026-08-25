"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Bell, CheckCheck, Settings, Volume2, VolumeX } from "lucide-react";
import { useSupabaseData, type AppNotification, type NotificationSeverity } from "@/components/supabase/SupabaseProvider";
import { archiveNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/hummingbot-api";
import { formatRelativeTime } from "@/lib/hummingbot-format";
import {
    DEFAULT_PREFERENCES,
    loadNotificationPreferences,
    saveNotificationPreferences,
    type NotificationPreferences,
} from "@/lib/notification-preferences";

const SEVERITY_STYLE: Record<NotificationSeverity, { dot: string; border: string; label: string }> = {
    info: { dot: "bg-sky-500", border: "border-l-sky-500", label: "Info" },
    warning: { dot: "bg-amber-500", border: "border-l-amber-500", label: "Warning" },
    critical: { dot: "bg-red-500", border: "border-l-red-500", label: "Critical" },
};

export default function NotificationCenter() {
    const { notifications, unreadCount, markNotificationReadLocally, markNotificationArchivedLocally } = useSupabaseData();
    const visible = notifications.filter((n) => !n.archived_at);
    const [open, setOpen] = useState(false);
    const [showPrefs, setShowPrefs] = useState(false);
    const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPrefs(loadNotificationPreferences());
    }, []);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setShowPrefs(false);
            }
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    function updatePrefs(patch: Partial<NotificationPreferences>) {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        saveNotificationPreferences(next);
    }

    async function requestBrowserPush() {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        updatePrefs({ browserPushEnabled: permission === "granted" });
    }

    async function onNotificationClick(n: AppNotification) {
        if (n.read_at) return;
        markNotificationReadLocally(n.id);
        try {
            await markNotificationRead(n.id);
        } catch {
            // Optimistic update already applied -- a failed server call here
            // just means it'll show as read locally until next reload, not
            // worth surfacing an error for.
        }
    }

    async function onMarkAllRead() {
        notifications.filter((n) => !n.read_at).forEach((n) => markNotificationReadLocally(n.id));
        try {
            await markAllNotificationsRead();
        } catch {
            // same reasoning as onNotificationClick
        }
    }

    async function onArchive(e: React.MouseEvent, n: AppNotification) {
        e.stopPropagation();
        markNotificationArchivedLocally(n.id, true);
        try {
            await archiveNotification(n.id);
        } catch {
            // optimistic update stands; full page reload will reconcile
        }
    }

    return (
        <div className="relative flex-shrink-0" ref={containerRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5 relative flex-shrink-0"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Notifications {unreadCount > 0 && <span className="text-gray-400 font-normal">({unreadCount} unread)</span>}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={onMarkAllRead}
                                disabled={unreadCount === 0}
                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 rounded"
                                title="Mark all read"
                            >
                                <CheckCheck className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setShowPrefs((v) => !v)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                                title="Notification settings"
                            >
                                <Settings className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {showPrefs && (
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                            <label className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span className="flex items-center gap-1.5">
                                    {prefs.muteAll ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                    Mute all sounds
                                </span>
                                <input
                                    type="checkbox"
                                    checked={prefs.muteAll}
                                    onChange={(e) => updatePrefs({ muteAll: e.target.checked })}
                                />
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
                            <label className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span>Volume</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={0.5}
                                    step={0.05}
                                    value={prefs.volume}
                                    onChange={(e) => updatePrefs({ volume: Number(e.target.value) })}
                                    className="w-24"
                                />
                            </label>
                            <button
                                onClick={requestBrowserPush}
                                className="w-full text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                                {prefs.browserPushEnabled ? "Browser push enabled" : "Enable browser push notifications"}
                            </button>
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1">
                        {visible.length === 0 && (
                            <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet.</p>
                        )}
                        {visible.map((n) => {
                            const style = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info;
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => onNotificationClick(n)}
                                    className={`group w-full text-left px-4 py-3 border-l-4 ${style.border} border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer ${
                                        n.read_at ? "opacity-60" : ""
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {!n.read_at && <span className={`h-2 w-2 rounded-full ${style.dot}`} />}
                                            <button
                                                onClick={(e) => onArchive(e, n)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-opacity"
                                                title="Archive"
                                            >
                                                <Archive className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                                        {n.category} · {formatRelativeTime(n.created_at)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="block text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 py-2.5 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}

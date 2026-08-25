"use client";

import { AlertTriangle } from "lucide-react";
import { useSupabaseData } from "@/components/supabase/SupabaseProvider";
import { markNotificationRead } from "@/lib/hummingbot-api";
import { formatRelativeTime } from "@/lib/hummingbot-format";

/** Full-width, impossible-to-miss banner for notifications whose alarm
 * persistence is "repeat-until-dismissed" (default for critical severity
 * -- see notification-preferences.ts). Rendered globally in AppShell so
 * it shows regardless of which page is open. The sound loop itself is
 * driven by SupabaseProvider; this is just the visual + the one action
 * that actually stops it. */
export default function CriticalAlertOverlay() {
    const { alarmingNotifications, markNotificationReadLocally } = useSupabaseData();

    if (alarmingNotifications.length === 0) return null;

    async function onDismiss(id: string) {
        markNotificationReadLocally(id); // also stops the alarm loop, see SupabaseProvider
        try {
            await markNotificationRead(id);
        } catch {
            // local dismissal already stands
        }
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col gap-1 p-2">
            {alarmingNotifications.map((n) => (
                <div
                    key={n.id}
                    className="flex items-center gap-3 rounded-lg bg-red-600 text-white px-4 py-3 shadow-2xl animate-pulse"
                >
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{n.title}</p>
                        <p className="text-xs text-red-100 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-red-200 mt-0.5">{formatRelativeTime(n.created_at)}</p>
                    </div>
                    <button
                        onClick={() => onDismiss(n.id)}
                        className="flex-shrink-0 rounded-lg bg-white text-red-700 font-bold text-xs px-4 py-2 hover:bg-red-50 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            ))}
        </div>
    );
}

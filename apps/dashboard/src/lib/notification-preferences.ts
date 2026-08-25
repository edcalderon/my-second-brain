// Client-side notification preferences -- single-user system, no need for
// a synced backend table yet (see docs/data-storage.md's "don't build
// infrastructure before the questions are real" principle). LocalStorage
// is enough: mute globally, set a minimum severity to alert on (sound +
// browser push), assign a distinct sound per category, and mute specific
// categories without losing critical risk_guard alerts.

import type { SoundPattern } from "./notification-sounds";

export type NotificationSeverity = "info" | "warning" | "critical";

// "once" = play the category's sound one time, same as today.
// "repeat-3x" / "repeat-5min" = keep repeating on an interval, capped.
// "repeat-until-dismissed" = keep repeating (and, for critical, show the
// full-screen CriticalAlertOverlay) until the notification is marked
// read -- the "alarm that really wakes me" mode. Intended default for
// critical; "once" remains the default for info/warning so routine
// signal/journal notifications don't turn into alarms.
export type AlarmPersistence = "once" | "repeat-3x" | "repeat-5min" | "repeat-until-dismissed";

export const PERSISTENCE_OPTIONS: { value: AlarmPersistence; label: string }[] = [
    { value: "once", label: "Play once" },
    { value: "repeat-3x", label: "Repeat 3 times" },
    { value: "repeat-5min", label: "Repeat for 5 minutes" },
    { value: "repeat-until-dismissed", label: "Repeat until dismissed" },
];

export type NotificationPreferences = {
    muteAll: boolean;
    volume: number; // 0-0.5
    minSeverity: NotificationSeverity; // sound/push fires at this severity or above
    mutedCategories: string[]; // category names to always suppress sound/push for
    categorySounds: Record<string, SoundPattern>; // category -> chosen tone pattern
    alarmPersistence: Record<NotificationSeverity, AlarmPersistence>;
    browserPushEnabled: boolean;
};

const STORAGE_KEY = "a-quant-notification-prefs";

// Matches the categories actually written by services/notifications.py
// call sites today (risk_guard, signal, journal, volatility, system) --
// an unmapped future category just falls back to its severity's default
// tone (see notification-sounds.ts::severityFallbackPattern).
export const DEFAULT_CATEGORY_SOUNDS: Record<string, SoundPattern> = {
    risk_guard: "triple-alarm",
    signal: "double-chime",
    journal: "soft-blip",
    volatility: "rising-sweep",
    system: "soft-blip",
};

export const DEFAULT_ALARM_PERSISTENCE: Record<NotificationSeverity, AlarmPersistence> = {
    info: "once",
    warning: "once",
    critical: "repeat-until-dismissed",
};

export const DEFAULT_PREFERENCES: NotificationPreferences = {
    muteAll: false,
    volume: 0.15,
    minSeverity: "info",
    mutedCategories: [],
    categorySounds: DEFAULT_CATEGORY_SOUNDS,
    alarmPersistence: DEFAULT_ALARM_PERSISTENCE,
    browserPushEnabled: false,
};

const SEVERITY_RANK: Record<NotificationSeverity, number> = { info: 0, warning: 1, critical: 2 };

export function loadNotificationPreferences(): NotificationPreferences {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PREFERENCES;
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_PREFERENCES,
            ...parsed,
            categorySounds: { ...DEFAULT_CATEGORY_SOUNDS, ...(parsed.categorySounds ?? {}) },
            alarmPersistence: { ...DEFAULT_ALARM_PERSISTENCE, ...(parsed.alarmPersistence ?? {}) },
        };
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function shouldNotify(prefs: NotificationPreferences, category: string, severity: NotificationSeverity): boolean {
    if (prefs.muteAll) return false;
    if (prefs.mutedCategories.includes(category)) return false;
    return SEVERITY_RANK[severity] >= SEVERITY_RANK[prefs.minSeverity];
}

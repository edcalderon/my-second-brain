// A small library of distinct, synthesized tones (Web Audio API -- no
// audio asset files to ship/host/license) that categories/severities can
// be mapped to, so the ear can tell "risk guard fired" apart from "a
// routine signal logged" without looking at the screen.

export type SoundPattern =
    | "soft-blip" | "double-chime" | "triple-alarm" | "rising-sweep" | "descending-tone"
    | "siren" | "urgent-pulse" | "klaxon" | "silent";

export const SOUND_PATTERNS: { value: SoundPattern; label: string }[] = [
    { value: "soft-blip", label: "Soft blip" },
    { value: "double-chime", label: "Double chime" },
    { value: "triple-alarm", label: "Triple alarm" },
    { value: "rising-sweep", label: "Rising sweep" },
    { value: "descending-tone", label: "Descending tone" },
    { value: "siren", label: "Siren (loud, alternating)" },
    { value: "urgent-pulse", label: "Urgent pulse (rapid beeps)" },
    { value: "klaxon", label: "Klaxon (harsh buzz)" },
    { value: "silent", label: "Silent" },
];

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedContext) sharedContext = new Ctor();
    return sharedContext;
}

function tone(
    ctx: AudioContext, startAt: number, freq: number, durationMs: number, volume: number,
    sweepTo?: number, waveform: OscillatorType = "sine",
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, startAt);
    if (sweepTo) {
        osc.frequency.linearRampToValueAtTime(sweepTo, startAt + durationMs / 1000);
    }
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + durationMs / 1000 + 0.02);
}

function schedulePattern(ctx: AudioContext, pattern: SoundPattern, volume: number) {
    const now = ctx.currentTime;
    switch (pattern) {
        case "soft-blip":
            tone(ctx, now, 720, 180, volume);
            break;
        case "double-chime":
            tone(ctx, now, 640, 160, volume);
            tone(ctx, now + 0.16, 880, 180, volume);
            break;
        case "triple-alarm":
            tone(ctx, now, 900, 140, volume);
            tone(ctx, now + 0.18, 900, 140, volume);
            tone(ctx, now + 0.36, 900, 180, volume);
            break;
        case "rising-sweep":
            tone(ctx, now, 420, 260, volume, 900);
            break;
        case "descending-tone":
            tone(ctx, now, 900, 260, volume, 420);
            break;
        case "siren":
            // Alternating high/low, emergency-vehicle style.
            for (let i = 0; i < 4; i++) {
                tone(ctx, now + i * 0.3, i % 2 === 0 ? 1000 : 600, 300, volume, i % 2 === 0 ? 600 : 1000, "sawtooth");
            }
            break;
        case "urgent-pulse":
            // Fast, insistent beeps -- deliberately annoying so it's hard to ignore.
            for (let i = 0; i < 6; i++) {
                tone(ctx, now + i * 0.12, 1100, 80, volume, undefined, "square");
            }
            break;
        case "klaxon":
            tone(ctx, now, 220, 500, volume * 1.2, undefined, "sawtooth");
            tone(ctx, now + 0.55, 220, 500, volume * 1.2, undefined, "sawtooth");
            break;
        case "silent":
            break;
    }
}

const SEVERITY_FALLBACK: Record<"info" | "warning" | "critical", SoundPattern> = {
    info: "soft-blip",
    warning: "double-chime",
    critical: "triple-alarm",
};

export function severityFallbackPattern(severity: "info" | "warning" | "critical"): SoundPattern {
    return SEVERITY_FALLBACK[severity];
}

/** Plays a pattern directly -- used by the settings panel's "test" button. */
export function testSoundPattern(pattern: SoundPattern, volume: number): void {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    schedulePattern(ctx, pattern, volume);
}

export function playPatternForNotification(
    category: string,
    severity: "info" | "warning" | "critical",
    categorySounds: Record<string, SoundPattern>,
    volume: number,
    muteAll: boolean,
): void {
    if (muteAll) return;
    const pattern = categorySounds[category] ?? severityFallbackPattern(severity);
    if (pattern === "silent") return;
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    schedulePattern(ctx, pattern, volume);
}

/** Repeats a pattern every `intervalMs` until the returned function is
 * called -- backs "critical alerts repeat until dismissed" (see
 * notification-preferences.ts's alarmPersistence). Fires once
 * immediately, then on the interval. */
export function startAlarmLoop(pattern: SoundPattern, volume: number, intervalMs = 4000): () => void {
    const ctx = getContext();
    if (!ctx || pattern === "silent") return () => {};
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    schedulePattern(ctx, pattern, volume);
    const id = window.setInterval(() => {
        const c = getContext();
        if (!c) return;
        if (c.state === "suspended") c.resume().catch(() => {});
        schedulePattern(c, pattern, volume);
    }, intervalMs);
    return () => window.clearInterval(id);
}

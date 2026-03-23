/**
 * Safe redirect resolver.
 *
 * Prevents open-redirect vulnerabilities by validating that the target URL
 * is within one of the allowed origins.
 *
 * Reference: CIG callback + logout redirect patterns.
 */

import type { SafeRedirectConfig } from "./types";

/**
 * Resolve a redirect URL, falling back to `fallbackUrl` if the target
 * is not within one of the allowed origins.
 *
 * Rules:
 * - Relative paths (e.g. "/dashboard") are always allowed
 * - Absolute URLs must have an origin in `allowedOrigins`
 * - Invalid URLs fall back to fallbackUrl
 * - Empty / null targets fall back to fallbackUrl
 */
export function resolveSafeRedirect(
    target: string | null | undefined,
    config: SafeRedirectConfig,
): string {
    if (!target || !target.trim()) {
        return config.fallbackUrl;
    }

    const trimmed = target.trim();

    // Relative paths are always safe
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return trimmed;
    }

    // Validate absolute URLs
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return config.fallbackUrl;
    }

    // Check protocol
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return config.fallbackUrl;
    }

    // Check origin — strip trailing slashes without regex (avoids CodeQL polynomial-regex flag)
    const normalised = config.allowedOrigins.map((o) => {
        let s = o;
        while (s.endsWith("/")) s = s.slice(0, -1);
        return s;
    });
    if (normalised.includes(parsed.origin)) {
        return trimmed;
    }

    return config.fallbackUrl;
}

/**
 * Tests for the safe redirect resolver.
 */

import { resolveSafeRedirect } from "../authentik/redirect";
import type { SafeRedirectConfig } from "../authentik/types";

const config: SafeRedirectConfig = {
    allowedOrigins: [
        "https://app.example.com",
        "https://landing.example.com",
    ],
    fallbackUrl: "/",
};

describe("resolveSafeRedirect", () => {
    it("allows relative paths", () => {
        expect(resolveSafeRedirect("/dashboard", config)).toBe("/dashboard");
        expect(resolveSafeRedirect("/auth/callback", config)).toBe("/auth/callback");
    });

    it("allows absolute URLs with allowed origin", () => {
        expect(
            resolveSafeRedirect("https://app.example.com/dashboard", config),
        ).toBe("https://app.example.com/dashboard");
    });

    it("allows URLs with allowed origin and trailing slash", () => {
        const cfg: SafeRedirectConfig = {
            allowedOrigins: ["https://app.example.com/"],
            fallbackUrl: "/",
        };
        expect(
            resolveSafeRedirect("https://app.example.com/dashboard", cfg),
        ).toBe("https://app.example.com/dashboard");
    });

    it("rejects URLs with unknown origins", () => {
        expect(
            resolveSafeRedirect("https://evil.com/phish", config),
        ).toBe("/");
    });

    it("rejects protocol-relative URLs (//)", () => {
        expect(resolveSafeRedirect("//evil.com/phish", config)).toBe("/");
    });

    it("rejects javascript: protocol", () => {
        expect(resolveSafeRedirect("javascript:alert(1)", config)).toBe("/");
    });

    it("rejects data: protocol", () => {
        expect(resolveSafeRedirect("data:text/html,<h1>hi</h1>", config)).toBe("/");
    });

    it("returns fallback for null/undefined/empty", () => {
        expect(resolveSafeRedirect(null, config)).toBe("/");
        expect(resolveSafeRedirect(undefined, config)).toBe("/");
        expect(resolveSafeRedirect("", config)).toBe("/");
        expect(resolveSafeRedirect("   ", config)).toBe("/");
    });

    it("returns fallback for invalid URLs", () => {
        expect(resolveSafeRedirect("not a valid url", config)).toBe("/");
    });

    it("trims whitespace from target", () => {
        expect(resolveSafeRedirect("  /dashboard  ", config)).toBe("/dashboard");
    });

    it("uses custom fallback URL", () => {
        const cfg: SafeRedirectConfig = {
            allowedOrigins: [],
            fallbackUrl: "/home",
        };
        expect(resolveSafeRedirect("https://evil.com", cfg)).toBe("/home");
    });
});

/**
 * Tests for config validation / doctor helpers.
 */

import {
    validateAuthentikConfig,
    validateSupabaseSyncConfig,
    validateFullConfig,
} from "../authentik/config";

/* ------------------------------------------------------------------ */
/*  validateAuthentikConfig                                            */
/* ------------------------------------------------------------------ */

describe("validateAuthentikConfig", () => {
    it("passes with valid config", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com/application/o/my-app",
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(true);
        expect(result.checks.every((c) => c.passed)).toBe(true);
    });

    it("fails when issuer is missing", () => {
        const result = validateAuthentikConfig({
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const issuerCheck = result.checks.find((c) => c.name === "issuer");
        expect(issuerCheck?.passed).toBe(false);
        expect(issuerCheck?.message).toContain("required");
    });

    it("fails when issuer is not a valid URL", () => {
        const result = validateAuthentikConfig({
            issuer: "not-a-url",
            clientId: "test-client",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const issuerCheck = result.checks.find((c) => c.name === "issuer");
        expect(issuerCheck?.passed).toBe(false);
        expect(issuerCheck?.message).toContain("not a valid URL");
    });

    it("fails when clientId is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            redirectUri: "https://app.example.com/auth/callback",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "clientId");
        expect(check?.passed).toBe(false);
    });

    it("fails when redirectUri is missing", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "redirectUri");
        expect(check?.passed).toBe(false);
    });

    it("fails when redirectUri is not a valid URL", () => {
        const result = validateAuthentikConfig({
            issuer: "https://auth.example.com",
            clientId: "test",
            redirectUri: "invalid",
        });

        expect(result.valid).toBe(false);
    });

    it("fails when all fields are missing", () => {
        const result = validateAuthentikConfig({});
        expect(result.valid).toBe(false);
        expect(result.checks.filter((c) => !c.passed)).toHaveLength(3);
    });
});

/* ------------------------------------------------------------------ */
/*  validateSupabaseSyncConfig                                         */
/* ------------------------------------------------------------------ */

describe("validateSupabaseSyncConfig", () => {
    it("passes with valid config", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(true);
    });

    it("fails when supabaseUrl is missing", () => {
        const result = validateSupabaseSyncConfig({
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "supabaseUrl");
        expect(check?.passed).toBe(false);
        expect(check?.message).toContain("supabase_not_configured");
    });

    it("fails when service role key is missing", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
        });

        expect(result.valid).toBe(false);
        const check = result.checks.find((c) => c.name === "supabaseServiceRoleKey");
        expect(check?.passed).toBe(false);
        expect(check?.message).toContain("supabase_not_configured");
    });

    it("warns when service role key appears too short", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "https://project.supabase.co",
            supabaseServiceRoleKey: "short",
        });

        // Short key is a warning, not an error
        const check = result.checks.find((c) => c.name === "supabaseServiceRoleKey");
        expect(check?.passed).toBe(false);
        expect(check?.severity).toBe("warning");
    });

    it("fails when supabaseUrl is not a valid URL", () => {
        const result = validateSupabaseSyncConfig({
            supabaseUrl: "not-a-url",
            supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
        });

        expect(result.valid).toBe(false);
    });
});

/* ------------------------------------------------------------------ */
/*  validateFullConfig                                                 */
/* ------------------------------------------------------------------ */

describe("validateFullConfig", () => {
    it("passes when both configs are valid", () => {
        const result = validateFullConfig(
            {
                issuer: "https://auth.example.com",
                clientId: "client",
                redirectUri: "https://app.example.com/callback",
            },
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        expect(result.valid).toBe(true);
    });

    it("fails when authentik config is invalid", () => {
        const result = validateFullConfig(
            {},
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        expect(result.valid).toBe(false);
    });

    it("combines checks from both configs", () => {
        const result = validateFullConfig(
            {
                issuer: "https://auth.example.com",
                clientId: "client",
                redirectUri: "https://app.example.com/callback",
            },
            {
                supabaseUrl: "https://project.supabase.co",
                supabaseServiceRoleKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.longservicerolekey",
            },
        );

        // 3 authentik checks + 2 supabase checks = 5 minimum
        expect(result.checks.length).toBeGreaterThanOrEqual(5);
    });
});
